"use client";

import { useMemo, useState } from "react";
import { Search, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from "lucide-react";
import { Team } from "@/lib/data";

const PAGE_SIZE = 20;

const CONFED_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  UEFA: { bg: "bg-blue-50", text: "text-blue-700", label: "UEFA" },
  CONMEBOL: { bg: "bg-amber-50", text: "text-amber-700", label: "CONMEBOL" },
  CONCACAF: { bg: "bg-rose-50", text: "text-rose-700", label: "CONCACAF" },
  CAF: { bg: "bg-emerald-50", text: "text-emerald-700", label: "CAF" },
  AFC: { bg: "bg-orange-50", text: "text-orange-700", label: "AFC" },
  OFC: { bg: "bg-teal-50", text: "text-teal-700", label: "OFC" },
};

function confedStyle(code: string) {
  return CONFED_STYLES[code] ?? { bg: "bg-stone-100", text: "text-stone-600", label: code };
}

function PodiumBadge({ rank }: { rank: number }) {
  const styles: Record<number, string> = {
    1: "bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900 shadow-yellow-300/50",
    2: "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800 shadow-slate-300/50",
    3: "bg-gradient-to-br from-orange-300 to-orange-500 text-orange-900 shadow-orange-300/50",
  };
  if (!styles[rank]) return null;
  return (
    <span
      className={`flex items-center justify-center w-7 h-7 rounded-full font-black text-xs shadow-md ${styles[rank]}`}
    >
      {rank}
    </span>
  );
}

function RankDelta({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span className="flex items-center gap-0.5 text-stone-300">
        <Minus size={10} strokeWidth={3} />
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      className={`flex items-center gap-0.5 text-[11px] font-bold ${
        up ? "text-emerald-600" : "text-rose-600"
      }`}
    >
      {up ? <TrendingUp size={11} strokeWidth={3} /> : <TrendingDown size={11} strokeWidth={3} />}
      {Math.abs(delta)}
    </span>
  );
}

export function FifaTable({ rankings }: { rankings: Team[] }) {
  const [query, setQuery] = useState("");
  const [confedFilter, setConfedFilter] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const confederations = useMemo(
    () => Array.from(new Set(rankings.map((t) => t.confederation))).sort(),
    [rankings]
  );

  const { topGainer, topLoser } = useMemo(() => {
    let gainer = rankings[0];
    let loser = rankings[0];
    for (const t of rankings) {
      const rd = t.previousRank - t.rank;
      if (rd > topGainerDelta(gainer)) gainer = t;
      if (rd < topGainerDelta(loser)) loser = t;
    }
    function topGainerDelta(t: Team) {
      return t.previousRank - t.rank;
    }
    return { topGainer: gainer, topLoser: loser };
  }, [rankings]);

  // On reset showAll dès que la recherche/filtre change (sinon on affiche tout même avec 3 résultats filtrés)
  const filtered = useMemo(() => {
    return rankings.filter((t) => {
      const matchesQuery = t.teamName.toLowerCase().includes(query.toLowerCase());
      const matchesConfed = !confedFilter || t.confederation === confedFilter;
      return matchesQuery && matchesConfed;
    });
  }, [rankings, query, confedFilter]);

  // Quand on filtre/recherche, on réaffiche tout (peu de résultats) ; sinon on pagine
  const isFiltering = Boolean(query || confedFilter);
  const visible = isFiltering || showAll ? filtered : filtered.slice(0, PAGE_SIZE);
  const hasMore = !isFiltering && filtered.length > PAGE_SIZE;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      {/* Bandeau stats */}
      <div className="grid grid-cols-2 divide-x divide-emerald-800/30 bg-gradient-to-r from-emerald-900 to-emerald-800 text-white">
        <div className="flex items-center gap-3 px-5 py-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20">
            <TrendingUp size={16} className="text-emerald-300" strokeWidth={2.5} />
          </span>
          <div className="leading-tight">
            <p className="text-[10px] uppercase tracking-wider text-emerald-300/80 font-semibold">
              Plus forte progression
            </p>
            <p className="text-sm font-bold">
              {topGainer.teamName}{" "}
              <span className="text-emerald-300 text-xs">
                (+{topGainer.previousRank - topGainer.rank})
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-rose-500/20">
            <TrendingDown size={16} className="text-rose-300" strokeWidth={2.5} />
          </span>
          <div className="leading-tight">
            <p className="text-[10px] uppercase tracking-wider text-rose-300/70 font-semibold">
              Plus forte chute
            </p>
            <p className="text-sm font-bold">
              {topLoser.teamName}{" "}
              <span className="text-rose-300 text-xs">
                ({topLoser.previousRank - topLoser.rank})
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Barre recherche + filtres */}
      <div className="flex flex-wrap items-center gap-2 px-5 py-3 bg-stone-50 border-b border-stone-200">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowAll(false); }}
            placeholder="Rechercher une équipe…"
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => { setConfedFilter(null); setShowAll(false); }}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
              !confedFilter
                ? "bg-emerald-700 text-white"
                : "bg-white text-stone-500 border border-stone-200 hover:bg-stone-100"
            }`}
          >
            Tous
          </button>
          {confederations.map((c) => {
            const style = confedStyle(c);
            const active = confedFilter === c;
            return (
              <button
                key={c}
                onClick={() => { setConfedFilter(active ? null : c); setShowAll(false); }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                  active
                    ? "bg-emerald-700 text-white"
                    : `${style.bg} ${style.text} hover:brightness-95`
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {/* En-tête colonnes */}
      <div className="flex items-center px-5 py-2.5 bg-stone-100/70 border-b border-stone-200 text-[10.5px] font-bold uppercase tracking-wider text-stone-400">
        <span className="w-16 text-center">Pos</span>
        <span className="flex-1">Équipe</span>
        <span className="w-24 text-center hidden sm:block">Confédération</span>
        <span className="w-24 text-center hidden sm:block">Avant</span>
        <span className="w-32 text-center">Points</span>
        <span className="w-16 text-center">+/-</span>
      </div>

      {/* Lignes */}
      {filtered.length === 0 && (
        <div className="px-5 py-10 text-center text-sm text-stone-400">
          Aucune équipe ne correspond à ta recherche.
        </div>
      )}

      {visible.map((team) => {
        const pointsDelta = team.points - team.previousPoints;
        const rankDelta = team.previousRank - team.rank;
        const isUp = pointsDelta > 0.005;
        const isDown = pointsDelta < -0.005;
        const style = confedStyle(team.confederation);
        const isPodium = team.rank <= 3;

        return (
          <div
            key={team.teamCode}
            className={`flex items-center px-5 py-3 border-b border-stone-100 last:border-b-0 transition-colors hover:bg-emerald-50/40 ${
              isPodium ? "bg-gradient-to-r from-yellow-50/60 to-transparent" : ""
            }`}
          >
            {/* Pos */}
            <span className="w-16 flex flex-col items-center justify-center gap-0.5">
              {isPodium ? (
                <PodiumBadge rank={team.rank} />
              ) : (
                <span className="font-black text-base text-stone-500 tabular-nums">
                  {team.rank}
                </span>
              )}
              <RankDelta delta={rankDelta} />
            </span>

            {/* Équipe */}
            <span className="flex-1 flex items-center gap-3 min-w-0">
              <img
                src={team.flagUrl}
                alt={team.teamName}
                className="w-8 h-6 object-cover rounded shadow-sm ring-1 ring-stone-200 shrink-0"
                loading="lazy"
              />
              <span className="min-w-0">
                <span className="block font-semibold text-sm text-stone-800 truncate">
                  {team.teamName}
                </span>
                <span
                  className={`sm:hidden inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${style.bg} ${style.text}`}
                >
                  {style.label}
                </span>
              </span>
            </span>

            {/* Confédération (desktop) */}
            <span className="w-24 hidden sm:flex justify-center">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${style.bg} ${style.text}`}>
                {style.label}
              </span>
            </span>

            {/* Avant */}
            <span className="w-24 hidden sm:flex justify-center text-md text-stone-400">
              {team.previousPoints.toFixed(2)}
            </span>

            {/* Points */}
            <span className="w-32 flex justify-center font-black text-lg text-stone-800 tabular-nums">
              {team.points.toFixed(2)}
            </span>

            {/* +/- */}
            <span className="w-16 flex justify-center">
              {isUp || isDown ? (
                <span
                  className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                    isUp ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {isUp ? "+" : ""}
                  {pointsDelta.toFixed(2)}
                </span>
              ) : (
                <span className="text-stone-300">
                  <Minus size={10} strokeWidth={3} />
                </span>
              )}
            </span>
          </div>
        );
      })}

      {/* Footer : bouton Voir tout / Réduire */}
      {hasMore && (
        <div className="border-t border-stone-100 px-5 py-3 bg-stone-50 flex items-center justify-between">
          <span className="text-xs text-stone-400">
            {showAll
              ? `${filtered.length} équipes affichées`
              : `${PAGE_SIZE} sur ${filtered.length} équipes`}
          </span>
          <button
            onClick={() => setShowAll((v) => !v)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition-colors"
          >
            {showAll ? (
              <>
                Réduire <ChevronUp size={12} strokeWidth={3} />
              </>
            ) : (
              <>
                Voir les {filtered.length - PAGE_SIZE} autres équipes <ChevronDown size={12} strokeWidth={3} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}