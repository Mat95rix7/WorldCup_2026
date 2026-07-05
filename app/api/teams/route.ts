import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { collection, getDocs, doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Team } from "@/lib/data";

const TOURNAMENT_FILE = path.join(process.cwd(), "data", "tournament.json");
const TEAMS_COLLECTION = "teams";

// ---------------------------------------------------------------------------
// Helpers Firestore
// ---------------------------------------------------------------------------

async function readTeamsFromFirestore(): Promise<Team[]> {
  const snap = await getDocs(collection(db, TEAMS_COLLECTION));

  return snap.docs.map((d) => ({
    ...(d.data() as Team),
    teamCode: d.id, // sécurité
  }));
}

// ---------------------------------------------------------------------------
// Group enrichment (reste en JSON local)
// ---------------------------------------------------------------------------

async function readTeamsWithGroups(): Promise<(Team & { group?: string })[]> {
  const [teams, tournament] = await Promise.all([
    readTeamsFromFirestore(),
    fs.readFile(TOURNAMENT_FILE, "utf-8").then(
      (r) =>
        JSON.parse(r) as {
          groups: Record<string, string[]>;
        }
    ),
  ]);

  return teams.map((team) => {
    const group = Object.entries(tournament.groups).find(([, codes]) =>
      codes.includes(team.teamCode)
    )?.[0];

    return { ...team, group };
  });
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
    const updates = body.updates as {
      teamCode: string;
      points: number;
    }[];

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: "updates manquant ou vide." },
        { status: 400 }
      );
    }

    const teams = await readTeamsFromFirestore();

    // 1️⃣ Appliquer les nouveaux points
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

    // 2️⃣ Recalcul des ranks
    const sorted = [...teams].sort((a, b) => b.points - a.points);
    sorted.forEach((team, index) => {
      const original = teams.find((t) => t.teamCode === team.teamCode)!;
      original.previousRank = original.rank;
      original.rank = index + 1;
    });

    // 3️⃣ Batch Firestore (safe + rapide)
    const batch = writeBatch(db);

    for (const team of teams) {
      const ref = doc(db, TEAMS_COLLECTION, team.teamCode);
      batch.set(ref, team, { merge: true });
    }

    await batch.commit();

    // 4️⃣ Retour enrichi groupes
    const teamsWithGroups = await readTeamsWithGroups();
    return NextResponse.json(teamsWithGroups);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Impossible d'enregistrer les points." },
      { status: 500 }
    );
  }
}