import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { adminDb } from "@/lib/firebase-admin";
import type { Team } from "@/lib/data";
import { getCached, setCached, invalidateCache } from "@/lib/cache";

const TOURNAMENT_FILE = path.join(process.cwd(), "data", "tournament.json");
const TEAMS_COLLECTION = "teams";
const TEAMS_CACHE_KEY = "teams";
const CACHE_TTL_MS = 30_000;

// Le fichier tournament.json ne change quasiment jamais : on le garde
// en mémoire une bonne fois pour toutes plutôt que de relire le disque
// à chaque requête.
let tournamentGroupsCache: Record<string, string[]> | null = null;

async function readTournamentGroups(): Promise<Record<string, string[]>> {
  if (tournamentGroupsCache) return tournamentGroupsCache;
  const raw = await fs.readFile(TOURNAMENT_FILE, "utf-8");
  const parsed = JSON.parse(raw) as { groups: Record<string, string[]> };
  tournamentGroupsCache = parsed.groups;
  return parsed.groups;
}

async function readTeamsFromFirestore(useCache = true): Promise<Team[]> {
  if (useCache) {
    const cached = getCached<Team[]>(TEAMS_CACHE_KEY, CACHE_TTL_MS);
    if (cached) return cached;
  }
  const snap = await adminDb.collection(TEAMS_COLLECTION).get();
  const teams = snap.docs.map((d) => ({ ...(d.data() as Team), teamCode: d.id }));
  setCached(TEAMS_CACHE_KEY, teams);
  return teams;
}

function enrichWithGroups(
  teams: Team[],
  groups: Record<string, string[]>
): (Team & { group?: string })[] {
  return teams.map((team) => {
    const group = Object.entries(groups).find(([, codes]) =>
      codes.includes(team.teamCode)
    )?.[0];
    return { ...team, group };
  });
}

async function readTeamsWithGroups(): Promise<(Team & { group?: string })[]> {
  const [teams, groups] = await Promise.all([
    readTeamsFromFirestore(),
    readTournamentGroups(),
  ]);
  return enrichWithGroups(teams, groups);
}

// ---------------------------------------------------------------------------
// GET /api/teams
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const teams = await readTeamsWithGroups();
    return NextResponse.json(teams);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Impossible de lire les équipes depuis Firestore." },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/teams
// Body: { updates: [{ teamCode: string; points: number }] }
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const updates = body.updates as { teamCode: string; points: number }[];

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: "updates manquant ou vide." },
        { status: 400 }
      );
    }

    // Lecture fraîche obligatoire ici (pas de cache) : on ne veut pas
    // écraser Firestore avec des points potentiellement obsolètes.
    const teams = await readTeamsFromFirestore(false);

    for (const update of updates) {
      const team = teams.find((t) => t.teamCode === update.teamCode);
      if (!team) {
        return NextResponse.json(
          { error: `Équipe ${update.teamCode} introuvable.` },
          { status: 404 }
        );
      }
      team.previousPoints = team.points;
      team.points = update.points;
    }

    const sorted = [...teams].sort((a, b) => b.points - a.points);
    sorted.forEach((team, index) => {
      const original = teams.find((t) => t.teamCode === team.teamCode)!;
      original.previousRank = original.rank;
      original.rank = index + 1;
    });

    const batch = adminDb.batch();
    for (const team of teams) {
      batch.set(adminDb.collection(TEAMS_COLLECTION).doc(team.teamCode), team, {
        merge: true,
      });
    }
    await batch.commit();
    invalidateCache(TEAMS_CACHE_KEY);

    // On enrichit directement les données déjà en mémoire (déjà à jour)
    // au lieu de refaire un aller-retour Firestore complet inutile.
    const groups = await readTournamentGroups();
    const teamsWithGroups = enrichWithGroups(teams, groups);

    return NextResponse.json(teamsWithGroups);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Impossible d'enregistrer les points." },
      { status: 500 }
    );
  }
}