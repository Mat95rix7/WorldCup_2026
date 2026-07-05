"use client";

/**
 * components/MatchCard.tsx
 * Carte d'un match.
 *
 * Design :
 * - Fond blanc, typographie condensée, noms d'équipe et drapeaux agrandis
 * - Zone centrale : heure du coup d'envoi (match à venir) OU score (match
 *   joué), jamais les deux à la fois
 * - Liseré vertical gauche dont l'intensité encode l'enjeu du match
 *   (groupe → ambre discret, quarts+ → ambre plein) — même logique
 *   d'importance que le calcul de points FIFA côté API
 * - Responsive mobile/desktop
 */

import { useState } from "react";
import type { Match, Team } from "@/lib/data";
import { ScoreModal } from "./ScoreModal";
import { getMatchTimeInfo } from "@/data/cities";

interface MatchCardProps {
  match: Match;
  homeTeam: Team | null;
  awayTeam: Team | null;
  canEdit?: boolean;
  onSubmitResult: (
    id: string,
    homeGoals: number | null,
    awayGoals: number | null,
    penaltyWinner: "HOME" | "AWAY" | null
  ) => Promise<void>;
}

/**
 * Intensité du liseré selon l'enjeu de la phase — même hiérarchie que
 * getImportance() côté API (groupes/8èmes/16èmes vs quarts+).
 */
function getStageAccent(stage: string): string {
  switch (stage) {
    case "FINAL":
      return "border-l-[6px] border-amber-500";
    case "SEMI_FINAL":
    case "THIRD_PLACE":
      return "border-l-4 border-amber-500";
    case "QUARTER_FINAL":
      return "border-l-4 border-amber-400";
    case "ROUND_OF_16":
      return "border-l-[3px] border-amber-300";
    default:
      return "border-l-[3px] border-stone-200";
  }
}

function formatStageLabel(match: Match): string {
  return match.stage === "GROUP"
    ? `Groupe ${match.group}`
    : match.stage.replace(/_/g, " ");
}

export function MatchCard({
  match,
  homeTeam,
  awayTeam,
  canEdit = true,
  onSubmitResult,
}: MatchCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const played = match.homeGoals !== null && match.awayGoals !== null;

  const now = new Date();
  const matchDate = new Date(match.date);
  const isPast = matchDate < now;

  const statusLabel = played ? "Terminé" : isPast ? "Score manquant" : "À venir";
  const statusStyle = played
    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
    : isPast
    ? "bg-red-50 text-red-600 border-red-100"
    : "bg-stone-50 text-stone-500 border-stone-100";

  const homeWon =
    played &&
    (match.homeGoals! > match.awayGoals! ||
      (match.homeGoals === match.awayGoals && match.penaltyWinner === "HOME"));
  const awayWon =
    played &&
    (match.awayGoals! > match.homeGoals! ||
      (match.homeGoals === match.awayGoals && match.penaltyWinner === "AWAY"));

  const { stadiumTime, localTime } = getMatchTimeInfo(match);

  return (
    <>
      <button
        onClick={() => canEdit && setModalOpen(true)}
        disabled={!canEdit}
        className={`w-full text-left bg-white rounded-2xl border border-stone-100 ${getStageAccent(
          match.stage
        )} shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-stone-200 hover:-translate-y-0.5 ${
          canEdit ? "cursor-pointer" : "cursor-default"
        }`}
        aria-label={`Match ${homeTeam?.teamName ?? match.homeTeam} vs ${
          awayTeam?.teamName ?? match.awayTeam
        }`}
      >
        {/* Méta-info */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-stone-100 bg-orange-100">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-800">
            {formatStageLabel(match)}
          </span>
          <span
            className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${statusStyle}`}
          >
            {statusLabel}
          </span>
        </div>

        {/* Corps du match */}
        <div className="px-2.5 sm:px-4 py-4 sm:py-5 flex items-center gap-1.5 sm:gap-4">
          <TeamDisplay
            team={homeTeam}
            code={match.homeTeam}
            isWinner={homeWon}
            isLoser={awayWon}
          />

          {/* Zone centrale : heure OU score, jamais les deux */}
          <div className="flex flex-col items-center justify-center gap-1 min-w-[76px] sm:min-w-[96px] px-1">
            {played ? (
              <>
                <div className="flex items-center gap-1.5 sm:gap-2.5 tabular-nums">
                  <span
                    className={`text-3xl sm:text-4xl font-black leading-none ${
                      homeWon ? "text-stone-900" : "text-stone-300"
                    }`}
                  >
                    {match.homeGoals}
                  </span>
                  <span className="text-stone-200 font-bold text-xl sm:text-2xl">
                    –
                  </span>
                  <span
                    className={`text-3xl sm:text-4xl font-black leading-none ${
                      awayWon ? "text-stone-900" : "text-stone-300"
                    }`}
                  >
                    {match.awayGoals}
                  </span>
                </div>
                {match.penaltyWinner && (
                  <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    TAB
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="text-2xl sm:text-3xl font-black leading-none text-stone-800 tabular-nums">
                  {localTime}
                </span>
                <span className="text-[10px] sm:text-[11px] font-semibold text-stone-400">
                  {stadiumTime} (heure locale)
                </span>
              </>
            )}
          </div>

          <TeamDisplay
            team={awayTeam}
            code={match.awayTeam}
            isWinner={awayWon}
            isLoser={homeWon}
          />
        </div>

        {/* Ville */}
        <div className="px-4 pb-3 text-center">
          <span className="text-[11px] sm:text-[12px] font-bold text-stone-400">
            📍 {match.city}
          </span>
        </div>

        {/* Invite saisie */}
        {canEdit && !played && (
          <div className="px-4 pb-3">
            <div className="text-center text-[10px] sm:text-[10.5px] font-semibold text-stone-400 hover:text-amber-600 transition-colors">
              Cliquer pour saisir le score →
            </div>
          </div>
        )}
      </button>

      {/* Modale de saisie */}
      {modalOpen && (
        <ScoreModal
          match={match}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          onClose={() => setModalOpen(false)}
          onSubmit={onSubmitResult}
        />
      )}
    </>
  );
}

function TeamDisplay({
  team,
  code,
  isWinner,
  isLoser,
}: {
  team: Team | null;
  code: string;
  isWinner: boolean;
  isLoser: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-1.5 sm:gap-2 flex-1 min-w-0 transition-opacity ${
        isLoser ? "opacity-40" : ""
      }`}
    >
      {team?.flagUrl ? (
        <img
          src={team.flagUrl}
          alt={team.teamName}
          className={`w-10 h-7 sm:w-14 sm:h-9 object-cover rounded-md shadow-sm transition-all ${
            isWinner ? "ring-2 ring-amber-400 ring-offset-1" : "ring-1 ring-stone-100"
          }`}
          loading="lazy"
        />
      ) : (
        <div className="w-10 h-7 sm:w-14 sm:h-9 bg-stone-100 rounded-md flex items-center justify-center text-[9px] text-stone-400">
          ?
        </div>
      )}
      <span
        className={`text-[12px] sm:text-[15px] font-black uppercase tracking-tight leading-tight text-center ${
          isWinner ? "text-stone-900" : "text-stone-500"
        }`}
      >
        {team?.teamName ?? code}
      </span>
    </div>
  );
}