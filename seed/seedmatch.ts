import { readFile } from "fs/promises";
import path from "path";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  writeBatch,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

type Match = {
  id: string;
  date: string;
  stage: string;
  group?: string | null;
  homeTeam: string | null;
  awayTeam: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
  penaltyWinner: "HOME" | "AWAY" | null;
  city: string;
  pointsApplied: boolean;
  winnerCode?: string;
};

function computeWinner(match: Match): string | null {
  if (match.homeGoals == null || match.awayGoals == null) return null;

  if (match.homeGoals > match.awayGoals) return match.homeTeam;
  if (match.awayGoals > match.homeGoals) return match.awayTeam;

  if (match.penaltyWinner === "HOME") return match.homeTeam;
  if (match.penaltyWinner === "AWAY") return match.awayTeam;

  return null;
}

async function injectMatches() {
  const filePath = path.join(
    process.cwd(),
    "matches.json"
  );

  const raw = await readFile(filePath, "utf-8");
  const matches: Match[] = JSON.parse(raw);

  const batch = writeBatch(db);

  for (const match of matches) {
    const winnerCode = computeWinner(match);

    const ref = doc(db, "matches", match.id);

    batch.set(
      ref,
      {
        ...match,
        winnerCode,
        updatedAt: new Date().toISOString(),
      },
      { merge: true } // 🔥 IMPORTANT
    );
  }

  await batch.commit();

  console.log(`✅ ${matches.length} matchs injectés / mis à jour`);
}

injectMatches()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Injection échouée", err);
    process.exit(1);
  });