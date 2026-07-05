import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import type { Team } from "./data";

const TEAMS_COLLECTION = "teams";

// ---------------------------------------------------------------------------
// Lecture Firestore → toutes les équipes
// ---------------------------------------------------------------------------

export async function readRankings(): Promise<Team[]> {
  const snap = await getDocs(collection(db, TEAMS_COLLECTION));

  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      teamCode: doc.id, // sécurité si jamais
    } as Team;
  });
}

// ---------------------------------------------------------------------------
// Écriture Firestore → batch update (1 doc par équipe)
// ---------------------------------------------------------------------------

export async function writeRankings(teams: Team[]): Promise<void> {
  const batch = writeBatch(db);

  for (const team of teams) {
    const ref = doc(db, TEAMS_COLLECTION, team.teamCode);

    batch.set(
      ref,
      {
        ...team,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  await batch.commit();
}

// ---------------------------------------------------------------------------
// Helpers purs (aucun accès DB)
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