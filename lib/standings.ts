/**
 * lib/standings.ts
 * Calcul du classement de groupe selon les règles FIFA Coupe du Monde 2026.
 *
 * Ordre de départage officiel :
 * 1. Points
 * 2. Différence de buts générale
 * 3. Buts marqués
 * 4. Points en confrontation directe (entre équipes à égalité)
 * 5. Différence de buts en confrontation directe
 * 6. Buts marqués en confrontation directe
 * 7. Classement FIFA (points FIFA au moment du tirage)
 */
import { Team, Match } from "./data";


export interface GroupStanding {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  form: ("W" | "D" | "L")[];
  qualified: "direct" | "third" | "eliminated" | "pending";
}

export function computeGroupStandings(
  group: string,
  teams: Team[],
  matches: Match[]
): GroupStanding[] {
  const groupTeams = teams.filter((t) => t.group === group);
  const groupMatches = matches.filter(
    (m) => m.group === group && m.stage === "GROUP"
  );

  const rows: GroupStanding[] = groupTeams.map((team) => {
    let played = 0, won = 0, drawn = 0, lost = 0, gf = 0, ga = 0;
    const form: ("W" | "D" | "L")[] = [];

    const played_matches = groupMatches
      .filter(
        (m) =>
          (m.homeTeam === team.teamCode || m.awayTeam === team.teamCode) &&
          m.homeGoals !== null &&
          m.awayGoals !== null
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (const m of played_matches) {
      const isHome = m.homeTeam === team.teamCode;
      const myGoals = isHome ? m.homeGoals! : m.awayGoals!;
      const oppGoals = isHome ? m.awayGoals! : m.homeGoals!;
      played++;
      gf += myGoals;
      ga += oppGoals;
      if (myGoals > oppGoals) { won++; form.push("W"); }
      else if (myGoals === oppGoals) { drawn++; form.push("D"); }
      else { lost++; form.push("L"); }
    }

    return {
      team,
      played,
      won,
      drawn,
      lost,
      goalsFor: gf,
      goalsAgainst: ga,
      goalDiff: gf - ga,
      points: won * 3 + drawn,
      form: form.slice(-5),
      qualified: "pending",
    };
  });

  // Tri complet avec départage
  const sorted = sortStandings(rows, groupMatches);

  // Marquer qualifiés / éliminés (si tous les matchs du groupe sont joués)
  const allMatchesPlayed = groupMatches.every(
    (m) => m.homeGoals !== null && m.awayGoals !== null
  );
  if (allMatchesPlayed) {
    sorted[0].qualified = "direct";
    sorted[1].qualified = "direct";
    sorted[2].qualified = "third";
    sorted[3].qualified = "eliminated";
  }

  return sorted;
}

function sortStandings(rows: GroupStanding[], groupMatches: Match[]): GroupStanding[] {
  return rows.sort((a, b) => {
    // 1. Points
    if (b.points !== a.points) return b.points - a.points;
    // 2. Diff générale
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    // 3. Buts marqués
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    // 4-6. Confrontation directe
    const h2h = computeH2H([a, b], groupMatches);
    const ha = h2h.get(a.team.teamCode);
    const hb = h2h.get(b.team.teamCode);
    if (ha && hb) {
      if (hb.points !== ha.points) return hb.points - ha.points;
      if (hb.goalDiff !== ha.goalDiff) return hb.goalDiff - ha.goalDiff;
      if (hb.goalsFor !== ha.goalsFor) return hb.goalsFor - ha.goalsFor;
    }
    // 7. Classement FIFA (points FIFA)
    return b.team.points - a.team.points;
  });
}

function computeH2H(
  rows: GroupStanding[],
  matches: Match[]
): Map<string, { points: number; goalDiff: number; goalsFor: number }> {
  const codes = new Set(rows.map((r) => r.team.teamCode));
  const h2hMatches = matches.filter(
    (m) =>
      codes.has(m.homeTeam) &&
      codes.has(m.awayTeam) &&
      m.homeGoals !== null &&
      m.awayGoals !== null
  );

  const stats = new Map<string, { points: number; goalDiff: number; goalsFor: number }>();
  for (const code of codes) stats.set(code, { points: 0, goalDiff: 0, goalsFor: 0 });

  for (const m of h2hMatches) {
    const home = stats.get(m.homeTeam)!;
    const away = stats.get(m.awayTeam)!;
    const hg = m.homeGoals!;
    const ag = m.awayGoals!;
    home.goalsFor += hg;
    away.goalsFor += ag;
    home.goalDiff += hg - ag;
    away.goalDiff += ag - hg;
    if (hg > ag) { home.points += 3; }
    else if (hg === ag) { home.points += 1; away.points += 1; }
    else { away.points += 3; }
  }

  return stats;
}