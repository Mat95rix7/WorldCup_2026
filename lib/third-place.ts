/**
 * lib/third-place.ts
 * Règle des 3e qualifiés — Coupe du Monde FIFA 2026
 *
 * Format WC 2026 : 48 équipes, 12 groupes de 4.
 * → 2 premiers de chaque groupe = 24 équipes qualifiées directement.
 * → 8 meilleurs 3e sur 12 = 8 équipes supplémentaires.
 * Total : 32 équipes pour la phase à élimination directe (1/32e de finale).
 *
 * Critères de sélection des 8 meilleurs 3e (règles FIFA officielles) :
 * 1. Points
 * 2. Différence de buts
 * 3. Buts marqués
 * 4. Points FIFA
 *
 * Attribution des matchs de 1/32e : déterminée par tirage au sort FIFA
 * après la phase de groupes. On stocke uniquement le classement ici ;
 * l'attribution bracket est gérée dans knockout.ts.
 */

import type { GroupStanding } from "./standings";

export interface ThirdPlaceEntry {
  standing: GroupStanding;
  group: string;
  rank: number; // rang parmi les 3e (1 = meilleur)
  qualified: boolean;
}

/**
 * Prend les 3e de chaque groupe et retourne les 8 meilleurs,
 * classés selon les critères FIFA.
 */
export function selectBestThirdPlaced(
  thirdsByGroup: { group: string; standing: GroupStanding }[]
): ThirdPlaceEntry[] {
  const sorted = [...thirdsByGroup].sort((a, b) => {
    const sa = a.standing;
    const sb = b.standing;

    // 1. Points
    if (sb.points !== sa.points) return sb.points - sa.points;
    // 2. Différence de buts
    if (sb.goalDiff !== sa.goalDiff) return sb.goalDiff - sa.goalDiff;
    // 3. Buts marqués
    if (sb.goalsFor !== sa.goalsFor) return sb.goalsFor - sa.goalsFor;
    // 4. Points FIFA
    return sb.team.points - sa.team.points;
  });

  return sorted.map((entry, idx) => ({
    standing: entry.standing,
    group: entry.group,
    rank: idx + 1,
    qualified: idx < 8, // les 8 meilleurs passent
  }));
}

/**
 * Depuis le résultat complet de tous les groupes,
 * extrait les 3e et les classe.
 */
export function computeAllThirdPlaced(
  allGroupStandings: { group: string; standings: GroupStanding[] }[]
): ThirdPlaceEntry[] {
  const thirds = allGroupStandings
    .filter((g) => g.standings.length >= 3)
    .map((g) => ({ group: g.group, standing: g.standings[2] }));

  return selectBestThirdPlaced(thirds);
}

/**
 * Vérifie si tous les groupes ont terminé leur phase de poules.
 */
export function allGroupsComplete(
  allGroupStandings: { group: string; standings: GroupStanding[] }[]
): boolean {
  return allGroupStandings.every((g) =>
    g.standings.every((s) => s.played === 3)
  );
}