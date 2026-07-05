// lib/data.ts

import matchesJson from "@/data/matches.json";
import teamsJson from "@/data/teams.json";

export interface Team {
    rank: number;
    previousRank: number;
    teamName: string;
    teamCode: string;
    points: number;
    previousPoints: number;
    flagUrl: string;
    confederation: string;
    group?: string;
}

export interface Match {
    id: string;
    date: string;
    stage: "GROUP" | "ROUND_OF_32" | "ROUND_OF_16" | "QUARTER" | "SEMI" | "THIRD_PLACE" | "FINAL";
    group?: string;
    homeTeam: string;
    awayTeam: string;
    homeGoals: number | null;
    awayGoals: number | null;
    penaltyWinner: "HOME" | "AWAY" | null;
    city: string;
    pointsApplied: boolean;
}

export const INITIAL_MATCHES: Match[] = matchesJson as Match[];

export const INITIAL_TEAMS: Team[] = teamsJson as Team[];



