import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import type { Team } from "./data";

const TEAMS_COLLECTION = "teams";

// ---------------------------------------------------------------------------
// Lecture Firestore → toutes les équipes (Firebase Admin)
// ---------------------------------------------------------------------------

export async function readRankings(): Promise<Team[]> {
  const snap = await adminDb.collection(TEAMS_COLLECTION).get();

  return snap.docs.map((doc) => ({
    ...(doc.data() as Team),
    teamCode: doc.id,
  }));
}

// ---------------------------------------------------------------------------
// Écriture Firestore → batch update (Firebase Admin)
// ---------------------------------------------------------------------------

export async function writeRankings(teams: Team[]): Promise<void> {
  const batch = adminDb.batch();

  for (const team of teams) {
    const ref = adminDb
      .collection(TEAMS_COLLECTION)
      .doc(team.teamCode);

    batch.set(
      ref,
      {
        ...team,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  await batch.commit();
}

// ---------------------------------------------------------------------------
// Helpers purs (aucun accès DB) — INCHANGÉS
// ---------------------------------------------------------------------------

export function findTeam(
  teams: Team[],
  teamCode: string
): Team | undefined {
  return teams.find((t) => t.teamCode === teamCode);
}

export function recomputeRanks(teams: Team[]): Team[] {
  return [...teams]
    .sort((a, b) => b.points - a.points)
    .map((team, index) => ({
      ...team,
      rank: index + 1,
    }));
}

export function applyMatchResult(
  teams: Team[],
  updates: { teamCode: string; newPoints: number }[]
): Team[] {
  const updated = teams.map((team) => {
    const match = updates.find(
      (u) => u.teamCode === team.teamCode
    );

    if (!match) return team;

    return {
      ...team,
      points: match.newPoints,
    };
  });

  return recomputeRanks(updated);
}