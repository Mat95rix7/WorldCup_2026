"use client";

/**
 * components/KnockoutBracket.tsx
 * Visualisation du bracket à élimination directe.
 *
 * Affiche les stades du 1/32e à la finale en colonnes horizontales.
 * Les équipes non encore connues apparaissent comme "À déterminer".
 * Les vainqueurs sont mis en valeur visuellement.
 */

import type { BracketStage, KnockoutMatch, KnockoutStage } from "@/lib/knockout";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/knockout";

interface KnockoutBracketProps {
  bracket: BracketStage[];
}

/** Ordre visuel spécifique pour le bracket des 1/32e */
const ROUND_OF_32_ORDER = [
  74, 77, 73, 75,
  83, 84, 81, 82,
  76, 78, 79, 80,
  86, 88, 85, 87,
];

/** Ordre visuel spécifique pour le bracket des 1/16e */
const ROUND_OF_16_ORDER = [89, 90, 93, 94, 91, 92, 95, 96];

/** Ordre visuel spécifique pour le bracket des quarts de finale */
const QUARTER_ORDER = [97, 98, 99, 100];

/** Ordre visuel spécifique pour les demi-finales */
const SEMI_ORDER = [101, 102];

/**
 * Map stage → ordre visuel à appliquer.
 * Les stages absents de cette map (ex: THIRD_PLACE, FINAL avec un seul
 * match) gardent l'ordre naturel renvoyé par les données.
 */
const STAGE_VISUAL_ORDER: Partial<Record<KnockoutStage, number[]>> = {
  ROUND_OF_32: ROUND_OF_32_ORDER,
  ROUND_OF_16: ROUND_OF_16_ORDER,
  QUARTER: QUARTER_ORDER,
  SEMI: SEMI_ORDER,
};

export function KnockoutBracket({ bracket }: KnockoutBracketProps) {
  const orderedStages = STAGE_ORDER.filter((stage) =>
    bracket.some((b) => b.stage === stage && b.matches.length > 0)
  );

  if (orderedStages.length === 0) {
    return (
      <div className="text-center py-16 text-stone-400 text-sm">
        La phase à élimination directe démarrera après la phase de groupes.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {orderedStages.map((stage) => {
          const stageData = bracket.find((b) => b.stage === stage);
          if (!stageData) return null;

          /** Tri conditionnel des matchs selon l'ordre visuel défini pour ce stade */
          const visualOrder = STAGE_VISUAL_ORDER[stage];
          const matches = visualOrder
            ? [...stageData.matches].sort((a, b) => {
                const aId = Number(a.match.id);
                const bId = Number(b.match.id);
                return visualOrder.indexOf(aId) - visualOrder.indexOf(bId);
              })
            : stageData.matches;

          return (
            <div key={stage} className="flex flex-col gap-3" style={{ width: 200 }}>
              {/* En-tête du stade */}
              <div className="text-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                  {STAGE_LABELS[stage]}
                </span>
                <div className="text-[11px] text-stone-300">
                  {matches.length} match{matches.length > 1 ? "s" : ""}
                </div>
              </div>

              {/* Matchs du stade */}
              <div className="flex flex-col justify-around gap-2 h-full">
                {matches.map((km) => (
                  <KnockoutMatchCard key={km.match.id} km={km} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const TeamRow = ({
    team,
    goals,
    isWinner,
    played,
    showPenaltiesBadge,
  }: {
    team: { teamCode: string; teamName: string; flagUrl: string } | null;
    goals: number | null;
    isWinner: boolean;
    played: boolean;
    showPenaltiesBadge?: boolean;
  }) => (
    <div
      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors ${
        isWinner
          ? "bg-amber-50 border border-amber-200 mx-1 my-1"
          : played && !isWinner
          ? "opacity-50"
          : ""
      }`}
    >
      {team ? (
        <>
          <img
            src={team.flagUrl}
            alt={team.teamName}
            className="w-5 h-3.5 object-cover rounded-sm flex-shrink-0"
            loading="lazy"
          />
          <span
            className={`flex-1 text-[14px] font-bold uppercase truncate hidden sm:block ${
              isWinner ? "text-amber-800" : "text-stone-700"
            }`}
          >
            {team.teamName}
          </span>
          <span
            className={`flex-1 text-[14px] font-bold uppercase block sm:hidden ${
              isWinner ? "text-amber-800" : "text-stone-700"
            }`}
          >
            {team.teamCode}
          </span>
          {showPenaltiesBadge && (
            <span className="flex-shrink-0 text-[8px] font-black uppercase tracking-wide text-amber-700 bg-amber-200 border border-amber-300 rounded-full px-1.5 py-0.5">
              TAB
            </span>
          )}
        </>
      ) : (
        <span className="flex-1 text-[14px] text-gray-800 italic text-center truncate">
          À déterminer
        </span>
      )}
      {goals !== null && (
        <span
          className={`text-sm font-black w-5 text-right ${
            isWinner ? "text-amber-700" : "text-stone-400"
          }`}
        >
          {goals}
        </span>
      )}
    </div>
  );

function KnockoutMatchCard({ km }: { km: KnockoutMatch }) {
  const { match, homeTeamData, awayTeamData, winner, isDecidedByPenalties } = km;
  const played = match.homeGoals !== null && match.awayGoals !== null;

  const homeIsWinner = !!winner && winner.teamCode === match.homeTeam;
  const awayIsWinner = !!winner && winner.teamCode === match.awayTeam;

  return (
    <div className="bg-orange-100 border border-stone-100 rounded-xl overflow-hidden shadow-sm">
      <TeamRow
        team={homeTeamData}
        goals={match.homeGoals}
        isWinner={homeIsWinner}
        played={played}
        showPenaltiesBadge={isDecidedByPenalties && homeIsWinner}
      />
      <div className="h-px bg-gray-300 mx-2" />
      <TeamRow
        team={awayTeamData}
        goals={match.awayGoals}
        isWinner={awayIsWinner}
        played={played}
        showPenaltiesBadge={isDecidedByPenalties && awayIsWinner}
      />
      <div className="h-px bg-gray-300 mx-2" />
      {!played && match.homeTeam && match.awayTeam && (
        <div className="text-center py-1 text-[9px] text-gray-800">
          
          {new Date(match.date).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
          })}
          <p className="ml-1">{match.city}</p>
        </div>
      )}
    </div>
  );
}