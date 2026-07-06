import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { Match } from "@/lib/data";
import { calculateFifaPoints, MatchImportance } from "@/lib/fifa-points";
import { fillBracket } from "@/lib/bracket";
import {
  readRankings,
  writeRankings,
  findTeam,
  applyMatchResult,
} from "@/lib/rankings-store";
import { getCached, setCached, invalidateCache } from "@/lib/cache";

const MATCHES_CACHE_KEY = "matches";
const CACHE_TTL_MS = 30_000; // 30s : ajuste selon la fréquence de mise à jour souhaitée

/* -------------------------------------------------------------------------- */
/* Helpers Firestore                                                           */
/* -------------------------------------------------------------------------- */

async function readMatches(useCache = true): Promise<Match[]> {
  if (useCache) {
    const cached = getCached<Match[]>(MATCHES_CACHE_KEY, CACHE_TTL_MS);
    if (cached) return cached;
  }
  const snap = await adminDb.collection("matches").get();
  const matches = snap.docs.map((d) => ({ ...(d.data() as Match), id: d.id }));
  setCached(MATCHES_CACHE_KEY, matches);
  return matches;
}

/* -------------------------------------------------------------------------- */
/* FIFA helpers (inchangés)                                                    */
/* -------------------------------------------------------------------------- */

function getImportance(stage: string): number {
  switch (stage) {
    case "QUARTER":
    case "SEMI":
    case "THIRD_PLACE":
    case "FINAL":
      return MatchImportance.WORLD_CUP_FROM_QF;
    default:
      return MatchImportance.WORLD_CUP_UP_TO_QF;
  }
}

function isKnockoutStage(stage: string): boolean {
  return stage !== "GROUP";
}

/* -------------------------------------------------------------------------- */
/* GET /api/matches                                                            */
/* -------------------------------------------------------------------------- */

export async function GET() {
  try {
    const matches = await readMatches(); // sert le cache si dispo
    return NextResponse.json(matches);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Impossible de lire les matchs." },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* PATCH /api/matches                                                          */
/* -------------------------------------------------------------------------- */

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, homeGoals, awayGoals, penaltyWinner } = body;

    if (!id) {
      return NextResponse.json({ error: "id manquant." }, { status: 400 });
    }

    const matchRef = adminDb.collection("matches").doc(id);
    const matchSnap = await matchRef.get();

    if (!matchSnap.exists) {
      return NextResponse.json(
        { error: `Match ${id} introuvable.` },
        { status: 404 }
      );
    }

    const match = matchSnap.data() as Match;
    const wasAlreadyApplied = match.pointsApplied === true;
    const nowComplete = homeGoals !== null && awayGoals !== null;

    let warning: string | null = null;
    let updatedRankings = null;
    let winnerCode: string | null = null;

    /* ------------------ Calcul vainqueur ------------------ */
    if (nowComplete) {
      if (homeGoals > awayGoals) winnerCode = match.homeTeam;
      else if (awayGoals > homeGoals) winnerCode = match.awayTeam;
      else if (penaltyWinner === "HOME") winnerCode = match.homeTeam;
      else if (penaltyWinner === "AWAY") winnerCode = match.awayTeam;
    }

    const shouldApplyFifaPoints =
      nowComplete && !wasAlreadyApplied && winnerCode !== null;

    /* ------------------ Lectures indépendantes en parallèle ------------------ */
    // readRankings (si besoin) et allMatches (toujours nécessaire pour le bracket)
    // ne dépendent pas l'une de l'autre : on les lance ensemble plutôt qu'en série.
    const [rankings, allMatches] = await Promise.all([
      shouldApplyFifaPoints ? readRankings() : Promise.resolve(null),
      readMatches(false), // forcé frais : on a besoin de l'état exact avant écriture
    ]);

    /* ------------------ Calcul FIFA ------------------ */
    if (shouldApplyFifaPoints && rankings) {
      const homeTeam = findTeam(rankings, match.homeTeam);
      const awayTeam = findTeam(rankings, match.awayTeam);

      if (!homeTeam || !awayTeam) {
        warning =
          "Équipe introuvable : points FIFA non appliqués pour ce match.";
      } else {
        const result = calculateFifaPoints({
          homePoints: homeTeam.points,
          awayPoints: awayTeam.points,
          homeGoals,
          awayGoals,
          importance: getImportance(match.stage),
          penaltyWinner: penaltyWinner ?? null,
          isKnockoutStage: isKnockoutStage(match.stage),
        });

        updatedRankings = applyMatchResult(rankings, [
          { teamCode: match.homeTeam, newPoints: result.newHomePoints },
          { teamCode: match.awayTeam, newPoints: result.newAwayPoints },
        ]);

        await writeRankings(updatedRankings);
      }
    } else if (wasAlreadyApplied) {
      warning = "Match déjà traité : score modifié sans recalcul FIFA.";
    }

    /* ------------------ Bracket propagation ------------------ */
    // On construit la version à jour du match courant AVANT de calculer le bracket.
    // Sans ça, fillBracket travaille sur les anciennes données (allMatches a été lu
    // avant cette mise à jour) et le match courant se retrouve réécrit avec son
    // ancien score à la fin du batch, écrasant la mise à jour.
    const updatedMatch: Match = {
      ...match,
      id,
      homeGoals,
      awayGoals,
      penaltyWinner: penaltyWinner ?? null,
      pointsApplied: nowComplete ? true : false,
      winnerCode,
    };

    const mergedMatches = allMatches.map((m) =>
      m.id === id ? updatedMatch : m
    );

    const resolvedMatches = fillBracket(mergedMatches);

    const batch = adminDb.batch();

    // Une seule écriture par document : resolvedMatches contient déjà
    // la version à jour du match courant (grâce à mergedMatches ci-dessus).
    for (const m of resolvedMatches) {
      batch.set(adminDb.collection("matches").doc(m.id), m, { merge: true });
    }

    // Sécurité : si fillBracket ne renvoyait pas le match courant pour une
    // raison quelconque, on force quand même son écriture.
    if (!resolvedMatches.some((m) => m.id === id)) {
      batch.set(matchRef, updatedMatch, { merge: true });
    }

    await batch.commit();
    invalidateCache(MATCHES_CACHE_KEY); // le cache GET doit refléter le nouvel état

    return NextResponse.json({
      match: { ...match, homeGoals, awayGoals, penaltyWinner, winnerCode },
      // Tous les matchs touchés par cette écriture (le match édité +
      // ceux dont le bracket a propagé un nouveau vainqueur). Le client
      // en a besoin pour mettre à jour son state sans refetch/reload.
      resolvedMatches,
      rankings: updatedRankings,
      warning,
    });
  } catch (err) {
    console.error("[PATCH /api/matches]", err);
    return NextResponse.json(
      { error: "Impossible d'enregistrer le score." },
      { status: 500 }
    );
  }
}