"use client";

/**
 * components/MatchCard.tsx
 * Carte d'un match — version refonte.
 *
 * Design :
 * - Fond blanc, typographie sportive condensée
 * - Score centré bien visible, drapeaux de chaque côté
 * - Clic → ouvre ScoreModal
 * - Statuts visuels : à venir / en cours / terminé
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

  // Déterminer le vainqueur pour l'accentuation
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
        className={`w-full text-left bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-stone-200 ${
          canEdit ? "cursor-pointer" : "cursor-default"
        }`}
        aria-label={`Match ${homeTeam?.teamName ?? match.homeTeam} vs ${awayTeam?.teamName ?? match.awayTeam}`}
      >
        {/* Méta-info */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-amber-100 border-b border-stone-100">
          <span className="text-[10.5px] font-semibold text-stone-500">
            {match.stage === "GROUP"
              ? `Groupe ${match.group}`
              : match.stage.replace(/_/g, " ")}
          </span>
          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${statusStyle}`}>
            {statusLabel}
          </span>
        </div>

        {/* Corps du match */}
        <div className="px-4 py-4 flex items-center gap-3">
          {/* Équipe domicile */}
          <TeamDisplay
            team={homeTeam}
            code={match.homeTeam}
            isWinner={homeWon}
            isLoser={awayWon}
            align="left"
          />

          {/* Score */}
          <div className="flex flex-col items-center gap-1 min-w-[64px]">
            {played ? (
              <div className="flex items-center gap-2">
                <span
                  className={`text-2xl font-black leading-none ${homeWon ? "text-stone-800" : "text-stone-400"}`}
                >
                  {match.homeGoals}
                </span>
                <span className="text-stone-300 font-bold text-lg">–</span>
                <span
                  className={`text-2xl font-black leading-none ${awayWon ? "text-stone-800" : "text-stone-400"}`}
                >
                  {match.awayGoals}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black text-stone-200">–</span>
                <span className="text-xl font-black text-stone-200">–</span>
              </div>
            )}

            {match.penaltyWinner && (
              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                TAB
              </span>
            )}

            <span className="text-[20px] font-bold text-stone-400">
              {localTime}
            </span>
            <span className="text-[14px] font-semibold text-stone-400">
              {stadiumTime}
            </span>
          </div>

          {/* Équipe extérieur */}
          <TeamDisplay
            team={awayTeam}
            code={match.awayTeam}
            isWinner={awayWon}
            isLoser={homeWon}
            align="right"
          />
        </div>

        {/* Ville */}
        <div className="px-4 pb-2.5 text-center">
          <span className="text-[12px] font-bold text-stone-400">📍 {match.city}</span>
        </div>

        {/* Invite saisie */}
        {canEdit && !played && (
          <div className="px-4 pb-3">
            <div className="text-center text-[10.5px] font-semibold text-stone-400 hover:text-amber-600 transition-colors">
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
  align,
}: {
  team: Team | null;
  code: string;
  isWinner: boolean;
  isLoser: boolean;
  align: "left" | "right";
}) {
  return (
    <div
      className={`flex flex-col items-center gap-1.5 flex-1 transition-opacity ${
        isLoser ? "opacity-40" : ""
      } ${align === "right" ? "" : ""}`}
    >
      {team?.flagUrl ? (
        <img
          src={team.flagUrl}
          alt={team.teamName}
          className={`w-9 h-6 object-cover rounded transition-all ${
            isWinner ? "ring-2 ring-amber-400" : ""
          }`}
          loading="lazy"
        />
      ) : (
        <div className="w-9 h-6 bg-stone-100 rounded flex items-center justify-center text-[8px] text-stone-400">
          ?
        </div>
      )}
      <span
        className={`text-[11px] font-black tracking-wide ${
          isWinner ? "text-stone-800" : "text-stone-500"
        }`}
      >
        {team?.teamName ?? code}
      </span>
    </div>
  );
}