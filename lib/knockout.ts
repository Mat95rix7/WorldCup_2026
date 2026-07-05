/**
 * lib/knockout.ts
 * Gestion du bracket à élimination directe — WC 2026
 *
 * Structure (32 équipes) :
 * - 1/32e de finale : 16 matchs
 * - 1/16e de finale : 8 matchs
 * - Quarts de finale : 4 matchs
 * - Demi-finales : 2 matchs
 * - Match pour la 3e place : 1 match
 * - Finale : 1 match
 *
 * En phase knockout, en cas d'égalité après 90 min :
 * → Prolongations (2 × 15 min)
 * → Tirs au but si toujours égalité
 * Le champ penaltyWinner indique le vainqueur aux TAB.
 */

import type { Match, Team } from "./data";

export type KnockoutStage =
  | "ROUND_OF_32"
  | "ROUND_OF_16"
  | "QUARTER"
  | "SEMI"
  | "THIRD_PLACE"
  | "FINAL";

export const STAGE_LABELS: Record<KnockoutStage, string> = {
  ROUND_OF_32: "1/32e de finale",
  ROUND_OF_16: "1/16e de finale",
  QUARTER: "Quart de finale",
  SEMI: "Demi-finale",
  THIRD_PLACE: "Match pour la 3e place",
  FINAL: "Finale",
};

export const STAGE_ORDER: KnockoutStage[] = [
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER",
  "SEMI",
  "THIRD_PLACE",
  "FINAL",
];

export interface KnockoutMatch {
  match: Match;
  homeTeamData: Team | null;
  awayTeamData: Team | null;
  winner: Team | null;
  isDecidedByPenalties: boolean;
}

export interface BracketStage {
  stage: KnockoutStage;
  label: string;
  matches: KnockoutMatch[];
}

/**
 * Détermine le vainqueur d'un match knockout.
 * En cas d'égalité + penaltyWinner → le TAB l'emporte.
 */
export function getKnockoutWinner(
  match: Match,
  teams: Team[]
): Team | null {
  if (match.homeGoals === null || match.awayGoals === null) return null;

  const homeTeam = teams.find((t) => t.teamCode === match.homeTeam) ?? null;
  const awayTeam = teams.find((t) => t.teamCode === match.awayTeam) ?? null;

  if (match.homeGoals > match.awayGoals) return homeTeam;
  if (match.awayGoals > match.homeGoals) return awayTeam;

  // Égalité → regarder penaltyWinner
  if (match.penaltyWinner === "HOME") return homeTeam;
  if (match.penaltyWinner === "AWAY") return awayTeam;

  return null; // match non encore décidé
}

/**
 * Construit le bracket complet depuis les matchs knockout.
 */
export function buildBracket(matches: Match[], teams: Team[]): BracketStage[] {
  const knockoutStages: KnockoutStage[] = [
    "ROUND_OF_32",
    "ROUND_OF_16",
    "QUARTER",
    "SEMI",
    "THIRD_PLACE",
    "FINAL",
  ];

  return knockoutStages.map((stage) => {
    const stageMatches = matches
      .filter((m) => m.stage === stage)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const knockoutMatches: KnockoutMatch[] = stageMatches.map((m) => {
      const homeTeamData = teams.find((t) => t.teamCode === m.homeTeam) ?? null;
      const awayTeamData = teams.find((t) => t.teamCode === m.awayTeam) ?? null;
      const winner = getKnockoutWinner(m, teams);
      const isDecidedByPenalties =
        m.homeGoals !== null &&
        m.awayGoals !== null &&
        m.homeGoals === m.awayGoals &&
        m.penaltyWinner !== null;

      return { match: m, homeTeamData, awayTeamData, winner, isDecidedByPenalties };
    });

    return {
      stage,
      label: STAGE_LABELS[stage],
      matches: knockoutMatches,
    };
  });
}

/**
 * Compte les équipes encore en lice à un stade donné.
 */
export function teamsStillIn(stage: KnockoutStage, bracket: BracketStage[]): Team[] {
  const stageData = bracket.find((b) => b.stage === stage);
  if (!stageData) return [];
  return stageData.matches.flatMap((m) =>
    [m.homeTeamData, m.awayTeamData].filter(Boolean) as Team[]
  );
}