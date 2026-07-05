/**
 * app/api/standings/route.ts
 * Route GET → retourne les classements de tous les groupes calculés,
 * les 3e qualifiés, et l'état du bracket knockout.
 *
 * Ces données sont toujours recalculées depuis les fichiers JSON source.
 * Elles ne sont jamais stockées séparément.
 */

import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { computeGroupStandings } from "@/lib/standings";
import { computeAllThirdPlaced } from "@/lib/third-place";
import { buildBracket } from "@/lib/knockout";
import type { Match, Team } from "@/lib/data";

const DATA_DIR = path.join(process.cwd(), "data");

async function readJson<T>(filename: string): Promise<T> {
  const content = await fs.readFile(path.join(DATA_DIR, filename), "utf-8");
  return JSON.parse(content);
}

export async function GET() {
  try {
    const [rawMatches, rawTeams, tournament] = await Promise.all([
      readJson<Match[]>("matches.json"),
      readJson<Team[]>("teams.json"),
      readJson<{ groups: Record<string, string[]> }>("tournament.json"),
    ]);

    // Enrichir les équipes avec leur groupe depuis tournament.json
    const teams: Team[] = rawTeams.map((t) => {
      const group = Object.entries(tournament.groups).find(([, codes]) =>
        codes.includes(t.teamCode)
      )?.[0];
      return { ...t, group };
    });

    const groups = Object.keys(tournament.groups).sort();

    // Classements de groupe
    const allGroupStandings = groups.map((g) => ({
      group: g,
      standings: computeGroupStandings(g, teams, rawMatches),
    }));

    // 3e qualifiés
    const thirdPlaced = computeAllThirdPlaced(allGroupStandings);

    // Bracket knockout
    const bracket = buildBracket(rawMatches, teams);

    return NextResponse.json({
      groups: allGroupStandings,
      thirdPlaced,
      bracket,
    });
  } catch (error) {
    console.error("[standings] Erreur de lecture:", error);
    return NextResponse.json(
      { error: "Impossible de charger les classements." },
      { status: 500 }
    );
  }
}