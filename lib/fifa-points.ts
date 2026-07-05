/**
 * lib/fifa-points.ts
 * ============================================================
 * Formule officielle FIFA (système "SUM", Elo modifié, en vigueur depuis juin 2018).
 *
 *   nouveaux points = points avant + I * (W - We)
 *
 *   I  = importance du match
 *   W  = résultat réel       (1 victoire, 0.5 nul, 0 défaite, 0.75/0.25 si TAB)
 *   We = résultat attendu, dérivé de l'écart de points via une logistique
 *
 * Règle spéciale phase à élimination directe d'une compétition finale :
 *   si (W - We) < 0 alors P = Pbefore (l'équipe ne perd aucun point)
 *   => cette règle s'applique INDÉPENDAMMENT à chaque équipe, donc le calcul
 *      n'est PAS forcément à somme nulle en phase de knock-out.
 *
 * Aucune dépendance externe : peut être importé côté serveur (Server Actions,
 * Route Handlers), côté client, ou dans un script de seed/simulation.
 * ============================================================
 */

export const MatchImportance = {
  /** Amicaux joués hors des fenêtres internationales (International Match Calendar). */
  FRIENDLY_OUTSIDE_FIFA_DAYS: 5,
  /** Amicaux joués pendant les fenêtres internationales. */
  FRIENDLY: 10,
  /** Matchs de phase de groupes de la Ligue des Nations. */
  NATIONS_LEAGUE_GROUP_STAGE: 15,
  /** Barrages et finales de la Ligue des Nations. */
  NATIONS_LEAGUE_PLAYOFFS_AND_FINALS: 25,
  /** Matchs de qualification pour une compétition finale continentale ou la Coupe du Monde. */
  QUALIFIERS: 25,
  /** Matchs de compétition finale continentale, jusqu'aux quarts de finale inclus. */
  CONTINENTAL_GROUP_STAGE: 35,
  /** Matchs de phase finale continentale. */
  CONTINENTAL_FINALS_UP_TO_QF: 35,
  /** Matchs de compétition finale continentale à partir des quarts de finale ; tous les matchs de Coupe des Confédérations. */
  CONTINENTAL_FINALS_FROM_QF_OR_CONFED_CUP: 40,
  /** Matchs de Coupe du Monde, jusqu'aux quarts de finale inclus. */
  WORLD_CUP_GROUP_STAGE: 50,
  /** Matchs de Coupe du Monde, phase de groupes. */
  WORLD_CUP_UP_TO_QF: 50,
  /** Matchs de Coupe du Monde à partir des quarts de finale. */
  WORLD_CUP_FROM_QF: 60,
} as const;

export type MatchImportanceValue = (typeof MatchImportance)[keyof typeof MatchImportance];

/** Résultat des tirs au but, uniquement pertinent si le score est à égalité. */
export type PenaltyWinner = "HOME" | "AWAY" | null;

export interface FifaMatchInput {
  /** Points actuels de l'équipe à domicile/équipe A avant le match. */
  homePoints: number;
  /** Points actuels de l'équipe à l'extérieur/équipe B avant le match. */
  awayPoints: number;
  /** Buts marqués par l'équipe A (temps réglementaire + prolongations). */
  homeGoals: number;
  /** Buts marqués par l'équipe B. */
  awayGoals: number;
  /** Poids du match — utiliser une valeur de MatchImportance. */
  importance: MatchImportanceValue | number;
  /** Si score à égalité ET qualification aux tirs au but, qui l'a emporté. */
  penaltyWinner?: PenaltyWinner;
  /**
   * true si le match appartient à une phase à élimination directe (knock-out)
   * d'une compétition finale (continentale, Coupe du Monde, Coupe des Confédérations).
   * Active la règle de protection : (W - We) < 0 => P = Pbefore, par équipe.
   */
  isKnockoutStage?: boolean;
}

export interface FifaMatchResult {
  newHomePoints: number;
  newAwayPoints: number;
  homeDelta: number;
  awayDelta: number;
  /** Probabilité de résultat attendu pour chaque équipe avant le match (0-1). */
  expectedHome: number;
  expectedAway: number;
  /** Indique si la règle de protection knock-out a annulé une perte de points pour cette équipe. */
  homeProtected: boolean;
  awayProtected: boolean;
}

/** Résultat réel W, du point de vue de l'équipe à domicile. */
function getActualResult(homeGoals: number, awayGoals: number, penaltyWinner: PenaltyWinner): number {
  if (homeGoals > awayGoals) return 1;
  if (homeGoals < awayGoals) return 0;
  // Score à égalité : un vainqueur aux TAB compte comme "demi-victoire" / "demi-défaite".
  if (penaltyWinner === "HOME") return 0.75;
  if (penaltyWinner === "AWAY") return 0.25;
  return 0.5;
}

/** Résultat attendu We, du point de vue de l'équipe à domicile, à partir de l'écart de points dx. */
function getExpectedResult(dx: number): number {
  return 1 / (10 ** (-dx / 600) + 1);
}

/**
 * Calcule les nouveaux points des deux équipes après un match.
 * Fonction pure : aucun effet de bord, aucun accès réseau/DB.
 *
 * Important : en phase à élimination directe (isKnockoutStage = true), chaque équipe
 * dont le delta serait négatif conserve Pbefore. Cela signifie que le total des points
 * gagnés par l'une et perdus par l'autre peut être asymétrique (le jeu n'est alors
 * plus à somme nulle), conformément à la règle FIFA de protection des équipes qualifiées.
 */
export function calculateFifaPoints(input: FifaMatchInput): FifaMatchResult {
  const { homePoints, awayPoints, homeGoals, awayGoals, importance, penaltyWinner = null, isKnockoutStage = false } =
    input;

  const isDraw = homeGoals === awayGoals;
  if (!isDraw && penaltyWinner) {
    throw new Error("penaltyWinner ne doit être fourni que si le score est à égalité.");
  }

  const dx = homePoints - awayPoints;
  const We = getExpectedResult(dx);
  const W = getActualResult(homeGoals, awayGoals, penaltyWinner);

  // Delta "brut" calculé symétriquement avant application de la règle de protection.
  const rawHomeDelta = importance * (W - We);
  const rawAwayDelta = importance * (1 - W - (1 - We)); // = -rawHomeDelta, mais explicite par équipe

  let homeDelta = rawHomeDelta;
  let homeProtected = false;
  if (isKnockoutStage && rawHomeDelta < 0) {
    homeDelta = 0;
    homeProtected = true;
  }

  let awayDelta = rawAwayDelta;
  let awayProtected = false;
  if (isKnockoutStage && rawAwayDelta < 0) {
    awayDelta = 0;
    awayProtected = true;
  }

  return {
    newHomePoints: round2(homePoints + homeDelta),
    newAwayPoints: round2(awayPoints + awayDelta),
    homeDelta: round2(homeDelta),
    awayDelta: round2(awayDelta),
    expectedHome: round4(We),
    expectedAway: round4(1 - We),
    homeProtected,
    awayProtected,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}