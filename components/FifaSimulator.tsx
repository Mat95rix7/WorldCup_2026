"use client";

/**
 * components/FifaSimulator.tsx
 * Version "encastrable" du calculateur de points FIFA, pensée pour vivre
 * comme onglet du Dashboard plutôt que comme page autonome.
 *
 * Contrairement à la version page complète, il n'y a plus de header ni de
 * fond plein écran : l'identité visuelle "pelouse" (vert #1B7A3D, fond crème
 * #F5F7F1) est contenue dans une carte-îlot avec ses propres coins arrondis,
 * pour cohabiter avec le thème stone/amber du reste du dashboard.
 */

import { useEffect, useMemo, useState } from "react";
import { calculateFifaPoints, MatchImportance } from "@/lib/fifa-points";
import type { Team } from "@/lib/data";
import TeamSearchSelect from "@/components/TeamSearchSelect";

type PenaltyChoice = "NONE" | "HOME" | "AWAY";

const IMPORTANCE_LABELS: Record<keyof typeof MatchImportance, string> = {
  FRIENDLY_OUTSIDE_FIFA_DAYS: "5 - Amical (hors dates FIFA)",
  FRIENDLY: "10 - Amical (dates FIFA)",
  NATIONS_LEAGUE_GROUP_STAGE: "15 - Ligue des Nations (phase de groupes)",
  NATIONS_LEAGUE_PLAYOFFS_AND_FINALS: "25 - Ligue des Nations (barrages et finales)",
  QUALIFIERS: "25 - Qualifications Coupe du Monde /  coupes continentales",
  CONTINENTAL_GROUP_STAGE: "35 - Phase de groupes continentale",
  CONTINENTAL_FINALS_UP_TO_QF: "35 - Phase finale continentale (jusqu'aux quarts de finale)",
  CONTINENTAL_FINALS_FROM_QF_OR_CONFED_CUP: "40 - Phase finale continentale (à partir des quarts de finale)",
  WORLD_CUP_GROUP_STAGE: "50 - Coupe du Monde FIFA (phase de groupes)",
  WORLD_CUP_UP_TO_QF: "50 - Coupe du Monde FIFA (jusqu'aux quarts de finale)",
  WORLD_CUP_FROM_QF: "60 - Coupe du Monde FIFA (à partir des quarts de finale)",
};

interface FifaSimulatorProps {
  /** Équipes déjà chargées par le Dashboard parent — évite un double fetch. */
  teams: Team[];
}

export default function FifaSimulator({ teams }: FifaSimulatorProps) {
  const [home, setHome] = useState<Team | null>(null);
  const [away, setAway] = useState<Team | null>(null);
  const [homeGoals, setHomeGoals] = useState(0);
  const [awayGoals, setAwayGoals] = useState(0);
  const [importance, setImportance] =
    useState<keyof typeof MatchImportance>("CONTINENTAL_FINALS_UP_TO_QF");
  const [penaltyWinner, setPenaltyWinner] =
    useState<PenaltyChoice>("NONE");

  // Points FIFA "actuels" utilisés pour la simulation. Pré-remplis depuis la
  // base au moment où l'équipe est choisie, mais librement modifiables :
  // permet de simuler avec un classement à jour même si la donnée stockée
  // a un peu de retard, sans toucher à la base.
  const [homePoints, setHomePoints] = useState<number>(0);
  const [awayPoints, setAwayPoints] = useState<number>(0);

  useEffect(() => {
    if (home) setHomePoints(home.points);
  }, [home]);

  useEffect(() => {
    if (away) setAwayPoints(away.points);
  }, [away]);

  const homePointsDirty = home !== null && homePoints !== home.points;
  const awayPointsDirty = away !== null && awayPoints !== away.points;

  const isDraw = homeGoals === awayGoals;

  const isKnockoutStage = useMemo(() => {
    return (
      importance === "CONTINENTAL_FINALS_FROM_QF_OR_CONFED_CUP" ||
      importance === "WORLD_CUP_FROM_QF" ||
      importance === "NATIONS_LEAGUE_PLAYOFFS_AND_FINALS" ||
      importance === "WORLD_CUP_UP_TO_QF" ||
      importance === "CONTINENTAL_FINALS_UP_TO_QF"
    );
  }, [importance]);

  const preview = useMemo(() => {
    if (!home || !away) return null;
    return calculateFifaPoints({
      homePoints,
      awayPoints,
      homeGoals,
      awayGoals,
      importance: MatchImportance[importance],
      penaltyWinner: isDraw && penaltyWinner !== "NONE" ? penaltyWinner : null,
      isKnockoutStage,
    });
  }, [
    home,
    away,
    homePoints,
    awayPoints,
    homeGoals,
    awayGoals,
    importance,
    penaltyWinner,
    isDraw,
    isKnockoutStage,
  ]);

  const winner =
    homeGoals > awayGoals
      ? "home"
      : awayGoals > homeGoals
      ? "away"
      : penaltyWinner === "HOME"
      ? "home"
      : penaltyWinner === "AWAY"
      ? "away"
      : null;

  const homeDelta = preview ? preview.newHomePoints - homePoints : null;
  const awayDelta = preview ? preview.newAwayPoints - awayPoints : null;

  return (
    <div className="relative isolate rounded-3xl bg-[#F5F7F1] p-4 sm:p-6 md:p-8 overflow-hidden">
      {/* Texture de pelouse très subtile, contenue à la carte (pas au viewport) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05] -z-10"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, #1B7A3D 0px, #1B7A3D 2px, transparent 2px, transparent 64px)",
        }}
      />

      <div className="space-y-6">
        {/* Tableau d'affichage de stade */}
        <div className="relative isolate rounded-2xl bg-white border border-[#E1E6DA] shadow-[0_1px_0_0_#E1E6DA,0_8px_24px_-12px_rgba(22,36,26,0.15)]">
          <div className="hidden md:block absolute left-1/2 top-6 bottom-6 -translate-x-1/2 border-l border-dashed border-[#D8DED2] -z-10" />

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr]">
            {/* Domicile */}
            <div
              className={`p-6 transition-colors ${
                winner === "home" ? "bg-[#FFF8E3]" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#5B6B5F]">
                  Domicile
                </span>
                {winner === "home" && (
                  <span className="text-[11px] font-bold uppercase tracking-wide text-[#A37A00] bg-[#FFC93C] rounded-full px-2.5 py-0.5">
                    Vainqueur
                  </span>
                )}
              </div>
              <TeamSearchSelect
                teams={teams}
                value={home}
                onChange={setHome}
                excludeCountryCode={away?.teamCode}
              />

              <label className="mt-3 block">
                <span className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#5B6B5F]">
                    Points FIFA actuels
                  </span>
                  {homePointsDirty && (
                    <button
                      type="button"
                      onClick={() => home && setHomePoints(home.points)}
                      className="text-[10px] font-bold text-[#1B7A3D] hover:underline"
                    >
                      ↺ Valeur officielle ({home!.points.toFixed(2)})
                    </button>
                  )}
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={homePoints}
                  onChange={(e) => setHomePoints(Number(e.target.value))}
                  disabled={!home}
                  aria-label="Points FIFA actuels de l'équipe à domicile"
                  className="w-full rounded-xl bg-[#F5F7F1] border border-[#D8DED2] px-3 py-2 text-center font-display text-lg font-black text-[#16241A] focus:outline-none focus:ring-2 focus:ring-[#1B7A3D] focus:border-[#1B7A3D] disabled:opacity-40"
                />
              </label>

              <input
                type="number"
                min={0}
                value={homeGoals}
                onChange={(e) => setHomeGoals(Number(e.target.value))}
                aria-label="Buts à domicile"
                className="mt-4 w-full rounded-xl bg-[#F5F7F1] border border-[#D8DED2] px-3 py-3 text-center font-display text-3xl font-black text-[#16241A] focus:outline-none focus:ring-2 focus:ring-[#1B7A3D] focus:border-[#1B7A3D]"
              />
            </div>

            {/* Score central */}
            <div className="flex md:flex-col items-center justify-center gap-2 px-6 py-4 md:py-6 border-t md:border-t-0 md:border-x border-[#E1E6DA] bg-[#FAFBF8]">
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#9AA79C]">
                Score
              </span>
              <p className="font-display text-4xl md:text-5xl font-black tabular-nums tracking-wider text-[#16241A]">
                {homeGoals}
                <span className="text-[#1B7A3D] mx-1">–</span>
                {awayGoals}
              </p>
            </div>

            {/* Extérieur */}
            <div
              className={`p-6 transition-colors ${
                winner === "away" ? "bg-[#FFF8E3]" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#5B6B5F]">
                  Extérieur
                </span>
                {winner === "away" && (
                  <span className="text-[11px] font-bold uppercase tracking-wide text-[#A37A00] bg-[#FFC93C] rounded-full px-2.5 py-0.5">
                    Vainqueur
                  </span>
                )}
              </div>
              <TeamSearchSelect
                teams={teams}
                value={away}
                onChange={setAway}
                excludeCountryCode={home?.teamCode}
              />

              <label className="mt-3 block">
                <span className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#5B6B5F]">
                    Points FIFA actuels
                  </span>
                  {awayPointsDirty && (
                    <button
                      type="button"
                      onClick={() => away && setAwayPoints(away.points)}
                      className="text-[10px] font-bold text-[#1B7A3D] hover:underline"
                    >
                      ↺ Valeur officielle ({away!.points.toFixed(2)})
                    </button>
                  )}
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={awayPoints}
                  onChange={(e) => setAwayPoints(Number(e.target.value))}
                  disabled={!away}
                  aria-label="Points FIFA actuels de l'équipe à l'extérieur"
                  className="w-full rounded-xl bg-[#F5F7F1] border border-[#D8DED2] px-3 py-2 text-center font-display text-lg font-black text-[#16241A] focus:outline-none focus:ring-2 focus:ring-[#1B7A3D] focus:border-[#1B7A3D] disabled:opacity-40"
                />
              </label>

              <input
                type="number"
                min={0}
                value={awayGoals}
                onChange={(e) => setAwayGoals(Number(e.target.value))}
                aria-label="Buts à l'extérieur"
                className="mt-4 w-full rounded-xl bg-[#F5F7F1] border border-[#D8DED2] px-3 py-3 text-center font-display text-3xl font-black text-[#16241A] focus:outline-none focus:ring-2 focus:ring-[#1B7A3D] focus:border-[#1B7A3D]"
              />
            </div>
          </div>
        </div>

        {/* Tirs au but (match nul) */}
        {isDraw && preview && (
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#5B6B5F] mb-1.5 block">
              Vainqueur aux tirs au but
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setPenaltyWinner((p) => (p === "HOME" ? "NONE" : "HOME"))
                }
                aria-pressed={penaltyWinner === "HOME"}
                className={`rounded-xl border px-4 py-3 text-sm font-bold transition-colors ${
                  penaltyWinner === "HOME"
                    ? "border-[#1B7A3D] bg-[#EAF4EC] text-[#1B7A3D]"
                    : "border-[#D8DED2] bg-white text-[#16241A] hover:border-[#1B7A3D]"
                }`}
              >
                {home ? home.teamName : "Domicile"}
              </button>
              <button
                type="button"
                onClick={() =>
                  setPenaltyWinner((p) => (p === "AWAY" ? "NONE" : "AWAY"))
                }
                aria-pressed={penaltyWinner === "AWAY"}
                className={`rounded-xl border px-4 py-3 text-sm font-bold transition-colors ${
                  penaltyWinner === "AWAY"
                    ? "border-[#1B7A3D] bg-[#EAF4EC] text-[#1B7A3D]"
                    : "border-[#D8DED2] bg-white text-[#16241A] hover:border-[#1B7A3D]"
                }`}
              >
                {away ? away.teamName : "Extérieur"}
              </button>
            </div>
            <p className="text-[11px] text-[#9AA79C] mt-1.5">
              {penaltyWinner === "NONE"
                ? "Aucune séance de TAB — match nul simple."
                : "Cliquez à nouveau pour annuler."}
            </p>
          </div>
        )}

        {/* Réglages du match */}
        <div>
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#5B6B5F] mb-1.5 block">
              Importance du match
            </span>
            <select
              value={importance}
              onChange={(e) =>
                setImportance(e.target.value as keyof typeof MatchImportance)
              }
              className="w-full rounded-xl bg-white border border-[#D8DED2] px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1B7A3D] focus:border-[#1B7A3D]"
            >
              {Object.entries(IMPORTANCE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Aperçu des points */}
        {preview && (
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-[#E1E6DA] bg-white p-4 text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#5B6B5F]">
                Points domicile
              </p>
              <div className="flex items-center justify-center gap-2 mt-1">
                <p className="font-display text-2xl font-black text-[#1B7A3D]">
                  {preview.newHomePoints.toFixed(2)}
                </p>
                {homeDelta !== null && <PointsDeltaBadge delta={homeDelta} />}
              </div>
            </div>
            <div className="rounded-xl border border-[#E1E6DA] bg-white p-4 text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#5B6B5F]">
                Points extérieur
              </p>
              <div className="flex items-center justify-center gap-2 mt-1">
                <p className="font-display text-2xl font-black text-[#1B7A3D]">
                  {preview.newAwayPoints.toFixed(2)}
                </p>
                {awayDelta !== null && <PointsDeltaBadge delta={awayDelta} />}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PointsDeltaBadge({ delta }: { delta: number }) {
  const rounded = Math.round(delta * 100) / 100;
  const isPositive = rounded > 0;
  const isNegative = rounded < 0;

  const colorClasses = isPositive
    ? "text-[#1B7A3D] bg-[#EAF4EC]"
    : isNegative
    ? "text-[#C0392B] bg-[#FBEAE8]"
    : "text-[#5B6B5F] bg-[#EEF0EA]";

  const sign = isPositive ? "+" : "";

  return (
    <span
      className={`text-xs font-bold tabular-nums rounded-full px-2 py-0.5 ${colorClasses}`}
    >
      {sign}
      {rounded.toFixed(2)}
    </span>
  );
}