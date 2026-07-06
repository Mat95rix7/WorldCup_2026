"use client";

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

export default function FifaMatchCalculator() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);

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

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/teams")
      .then((res) => res.json())
      .then(setTeams)
      .catch(() => setError("Impossible de charger le classement."))
      .finally(() => setIsLoadingTeams(false));
  }, []);

  // Resynchronise le champ éditable avec la base à chaque nouvelle sélection
  // d'équipe (mais ne touche plus à la valeur si on ne fait que changer le
  // score ou l'importance ensuite).
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
    <div className="min-h-screen bg-[#F5F7F1] text-[#16241A]">
      {/* Texture de pelouse très subtile en fond */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, #1B7A3D 0px, #1B7A3D 2px, transparent 2px, transparent 64px)",
        }}
      />

      <div className="relative max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-[#D8DED2] pb-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1B7A3D]">
              Simulateur officiel
            </p>
            <h1 className="font-display text-3xl md:text-[2.5rem] font-black uppercase tracking-tight leading-none mt-1">
              Calculateur de points FIFA
            </h1>
          </div>
          <div className="hidden sm:flex h-12 w-12 rounded-full border-2 border-[#1B7A3D] items-center justify-center">
            <span className="font-display font-black text-[#1B7A3D]">⚽</span>
          </div>
        </header>

        {isLoadingTeams && (
          <p className="text-center text-[#5B6B5F] py-12">
            Chargement du classement…
          </p>
        )}

        {!isLoadingTeams && (
          <>
            {/* Tableau d'affichage de stade */}
            <div className="relative isolate rounded-2xl bg-white border border-[#E1E6DA] shadow-[0_1px_0_0_#E1E6DA,0_8px_24px_-12px_rgba(22,36,26,0.15)]">
              {/* Ligne médiane façon ligne de terrain */}
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

                  {/* Points FIFA actuels — éditable */}
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

                  {/* Points FIFA actuels — éditable */}
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

            {/* Aperçu des points (si dispo) */}
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

            {error && (
              <p className="text-center text-sm font-medium text-[#C0392B] bg-[#FBEAE8] border border-[#F3CFC9] rounded-xl py-3">
                {error}
              </p>
            )}
          </>
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