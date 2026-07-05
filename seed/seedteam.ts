import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

import {
  doc,
  getDoc,
  writeBatch,
  Timestamp,
} from "firebase/firestore";

// ---------------------------------------------------------------------------
// Résolution __dirname en ESM
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Firebase (spécifique Node / seed)
// ---------------------------------------------------------------------------

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---------------------------------------------------------------------------
// Types locaux (évite alias Next.js)
// ---------------------------------------------------------------------------

type Team = {
  teamName: string;
  teamCode: string;
  confederation: string;
  flagUrl: string;
  rank: number;
  points: number;
  previousRank: number;
  previousPoints: number;
};

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function seed() {
  const force = process.argv.includes("--force");

  // 🔹 Lecture JSON via fs (robuste)
  const jsonPath = path.join(__dirname, "teams.json");
  const teams: Team[] = JSON.parse(
    fs.readFileSync(jsonPath, "utf-8")
  );

  // 🔍 Vérifie si déjà seedé
  const testRef = doc(db, "teams", teams[0].teamCode);
  const testSnap = await getDoc(testRef);

  if (testSnap.exists() && !force) {
    console.log("⚠️  Les équipes existent déjà. Utilise --force pour écraser.");
    return;
  }

  const batch = writeBatch(db);

  for (const team of teams) {
    const ref = doc(db, "teams", team.teamCode);

    batch.set(ref, {
      teamName: team.teamName,
      teamCode: team.teamCode,
      confederation: team.confederation,
      flagUrl: team.flagUrl,
        rank: team.rank,
        points: team.points,
        previousRank: team.previousRank,
        previousPoints: team.previousPoints,

      seededAt: Timestamp.now(),
    });
  }

  await batch.commit();

  console.log(`✅ ${teams.length} équipes seedées.`);
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Erreur lors du seed :", err);
    process.exit(1);
  });