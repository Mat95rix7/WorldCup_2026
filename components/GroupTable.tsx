"use client";

import type { GroupStanding } from "@/lib/standings";

interface GroupTableProps {
  group: string;
  standings: GroupStanding[];
  compact?: boolean;
}

const FORM_COLOR: Record<"W" | "D" | "L", string> = {
  W: "bg-emerald-500 text-white",
  D: "bg-stone-300 text-stone-700",
  L: "bg-red-400 text-white",
};

const QUALIFICATION_STRIP: Record<GroupStanding["qualified"], string> = {
  direct: "border-l-4 border-l-emerald-500",
  third: "border-l-4 border-l-amber-400",
  eliminated: "border-l-4 border-l-transparent opacity-50",
  pending: "border-l-4 border-l-transparent",
};

const QUALIFICATION_BADGE: Record<GroupStanding["qualified"], string | null> = {
  direct: "Q",
  third: "3e",
  eliminated: null,
  pending: null,
};

const QUALIFICATION_BADGE_STYLE: Record<GroupStanding["qualified"], string> = {
  direct: "bg-emerald-100 text-emerald-700",
  third: "bg-amber-100 text-amber-700",
  eliminated: "",
  pending: "",
};

// Largeurs partagées header ↔ lignes
const COL = {
  rank:  "w-6 flex-shrink-0",
  team:  "flex-1 min-w-0",
  mj:    "w-8 flex-shrink-0 text-center",
  g:     "w-8 flex-shrink-0 text-center",
  n:     "w-8 flex-shrink-0 text-center",
  p:     "w-8 flex-shrink-0 text-center",
  diff:  "w-10 flex-shrink-0 text-center",
  pts:   "w-10 flex-shrink-0 text-center",
  forme: "w-24 flex-shrink-0",
};

export function GroupTable({ group, standings, compact = false }: GroupTableProps) {
  const matchesPlayed = standings.filter((s) => s.played > 0).length;

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">

      {/* En-tête groupe */}
      <div className="flex items-center gap-3 px-4 py-3 bg-stone-800">
        <span className="w-7 h-7 rounded-lg bg-amber-400 text-stone-900 flex items-center justify-center font-black text-sm flex-shrink-0">
          {group}
        </span>
        <span className="text-white font-bold text-sm tracking-wide uppercase">
          Groupe {group}
        </span>
        <span className="ml-auto text-stone-400 text-xs">
          {matchesPlayed > 0 ? `${standings[0]?.played ?? 0}/3 journées` : "Pas encore joué"}
        </span>
      </div>

      {/* En-têtes colonnes */}
      <div className="flex items-center gap-1 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-stone-400 bg-stone-50 border-b border-stone-100">
        <span className={COL.rank} />
        <span className={COL.team}>Équipe</span>
        {!compact && (
          <>
            <span className={COL.mj}>MJ</span>
            <span className={COL.g}>G</span>
            <span className={COL.n}>N</span>
            <span className={COL.p}>P</span>
          </>
        )}
        <span className={COL.diff}>+/-</span>
        <span className={`${COL.pts} font-black text-stone-500`}>Pts</span>
        {!compact && <span className={`${COL.forme} text-right`}>Forme</span>}
      </div>

      {/* Lignes */}
      {standings.map((s, idx) => {
        const badge = QUALIFICATION_BADGE[s.qualified];
        const badgeStyle = QUALIFICATION_BADGE_STYLE[s.qualified];

        return (
          <div
            key={s.team.teamCode}
            className={`flex items-center gap-1 px-4 py-2.5 border-b border-stone-50 last:border-b-0 hover:bg-stone-50/80 transition-colors ${QUALIFICATION_STRIP[s.qualified]}`}
          >
            {/* Rang */}
            <span className={`${COL.rank} text-xs font-bold text-stone-400 text-center`}>
              {idx + 1}
            </span>

            {/* Équipe */}
            <div className={`${COL.team} flex items-center gap-2`}>
              <img
                src={s.team.flagUrl}
                alt={s.team.teamName}
                className="w-6 h-4 object-cover rounded-sm flex-shrink-0"
                loading="lazy"
              />
              <span className="font-semibold text-[14px] text-stone-800 truncate leading-none py-1">
                {s.team.teamName}
              </span>
              {badge && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 leading-none ${badgeStyle}`}>
                  {badge}
                </span>
              )}
            </div>

            {/* Stats */}
            {!compact && (
              <>
                <span className={`${COL.mj} text-sm text-stone-500`}>{s.played}</span>
                <span className={`${COL.g} text-sm text-stone-500`}>{s.won}</span>
                <span className={`${COL.n} text-sm text-stone-500`}>{s.drawn}</span>
                <span className={`${COL.p} text-sm text-stone-500`}>{s.lost}</span>
              </>
            )}

            <span className={`${COL.diff} text-sm text-stone-500`}>
              {s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}
            </span>

            <span className={`${COL.pts} text-base font-black text-stone-800`}>
              {s.points}
            </span>

            {/* Forme */}
            {!compact && (
              <div className={`${COL.forme} flex justify-end gap-1`}>
                {s.form.length === 0 ? (
                  <span className="text-[11px] text-stone-300">—</span>
                ) : (
                  s.form.map((r, i) => (
                    <span
                      key={i}
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${FORM_COLOR[r]}`}
                    >
                      {r}
                    </span>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Légende */}
      {standings.some((s) => s.qualified !== "pending") && (
        <div className="flex items-center gap-4 px-4 py-2.5 bg-stone-50 border-t border-stone-100">
          <span className="flex items-center gap-1.5 text-[10.5px] text-stone-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            Qualifié direct
          </span>
          <span className="flex items-center gap-1.5 text-[10.5px] text-stone-400">
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
            3e — en attente
          </span>
        </div>
      )}
    </div>
  );
}