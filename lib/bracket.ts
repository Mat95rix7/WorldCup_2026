// lib/bracket.ts
import { Match } from "@/lib/data";

function getWinner(match: Match): string | null {
  if (match.homeGoals == null || match.awayGoals == null) return null;

  if (match.homeGoals > match.awayGoals) return match.homeTeam;
  if (match.awayGoals > match.homeGoals) return match.awayTeam;

  // égalité -> tirs au but, même convention que knockout.ts
  if (match.penaltyWinner === "HOME") return match.homeTeam;
  if (match.penaltyWinner === "AWAY") return match.awayTeam;

  return null; // pas encore décidé
}

function getLoser(match: Match): string | null {
  const winner = getWinner(match);
  if (!winner) return null;
  return winner === match.homeTeam ? match.awayTeam : match.homeTeam;
}

function resolvePlaceholder(code: string, matchesById: Map<string, Match>): string {
  const m = code.match(/^([WL])(\d+)$/);
  if (!m) return code;

  const [, type, refId] = m;
  const refMatch = matchesById.get(refId);
  if (!refMatch) return code;

  const result = type === "W" ? getWinner(refMatch) : getLoser(refMatch);
  return result ?? code;
}

export function fillBracket(matches: Match[]): Match[] {
  let current = matches;
  for (let i = 0; i < matches.length; i++) {
    const matchesById = new Map(current.map((m) => [m.id, m]));
    const next = current.map((m) => ({
      ...m,
      homeTeam: resolvePlaceholder(m.homeTeam, matchesById),
      awayTeam: resolvePlaceholder(m.awayTeam, matchesById),
    }));
    if (JSON.stringify(next) === JSON.stringify(current)) break;
    current = next;
  }
  return current;
}