import { NextRequest, NextResponse } from "next/server";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

import { Match } from "@/lib/data";
import { calculateFifaPoints, MatchImportance } from "@/lib/fifa-points";
import { fillBracket } from "@/lib/bracket";
import {
  readRankings,
  writeRankings,
  findTeam,
  applyMatchResult,
} from "@/lib/rankings-store";

/* -------------------------------------------------------------------------- */
/* Helpers Firestore                                                           */
/* -------------------------------------------------------------------------- */

async function readMatches(): Promise<Match[]> {
  const snap = await getDocs(collection(db, "matches"));
  return snap.docs.map((d) => ({
    ...(d.data() as Match),
    id: d.id,
  }));
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
    const matches = await readMatches();
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

    const matchRef = doc(db, "matches", id);
    const matchSnap = await getDoc(matchRef);

    if (!matchSnap.exists()) {
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

    /* ------------------ Calcul FIFA ------------------ */
    if (nowComplete && !wasAlreadyApplied && winnerCode) {
      const rankings = await readRankings();
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
      warning =
        "Match déjà traité : score modifié sans recalcul FIFA.";
    }

    /* ------------------ Bracket propagation ------------------ */
    const allMatches = await readMatches();
    const resolvedMatches = fillBracket(allMatches);

    const batch = writeBatch(db);

    // Update match courant
    batch.set(
      matchRef,
      {
        homeGoals,
        awayGoals,
        penaltyWinner: penaltyWinner ?? null,
        pointsApplied: nowComplete ? true : false,
        winnerCode,
      },
      { merge: true }
    );

    // Update matchs suivants (Wxx)
    for (const m of resolvedMatches) {
      batch.set(doc(db, "matches", m.id), m, { merge: true });
    }

    await batch.commit();

    return NextResponse.json({
      match: { ...match, homeGoals, awayGoals, penaltyWinner, winnerCode },
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