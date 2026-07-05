"use client";

/**
 * components/ScoreModal.tsx
 * Modale de saisie de score fluide.
 *
 * Fonctionnalités :
 * - Navigation clavier : Tab entre les champs, Entrée pour valider
 * - Incrément/décrément avec boutons + / -
 * - Gestion prolongations + tirs au but pour matchs knockout
 * - Suppression du score (remettre à null)
 * - Accessible : focus trap, aria-labels, rôles dialog
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Match, Team } from "@/lib/data";
import { calculateFifaPoints } from "@/lib/fifa-points";

interface ScoreModalProps {
  match: Match;
  homeTeam: Team | null;
  awayTeam: Team | null;
  onClose: () => void;
  onSubmit: (
    matchId: string,
    homeGoals: number | null,
    awayGoals: number | null,
    penaltyWinner: "HOME" | "AWAY" | null
  ) => Promise<void>;
}

// ⚠️ GoalInput est désormais défini AU NIVEAU DU MODULE,
// en dehors de ScoreModal, pour éviter de recréer le composant
// à chaque render du parent (ce qui causait la perte de focus
// et l'avertissement "Cannot create component during render").
interface GoalInputProps {
  value: number;
  onChange: (n: number) => void;
  label: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onTabNext?: () => void;
  onEnter: () => void;
}

function GoalInput({
  value,
  onChange,
  label,
  inputRef,
  onTabNext,
  onEnter,
}: GoalInputProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-9 h-9 shrink-0 rounded-lg border border-stone-200 bg-stone-50 text-stone-600 font-bold text-lg hover:bg-stone-100 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
          aria-label={`Réduire buts ${label}`}
        >
          −
        </button>
        <input
          ref={inputRef}
          type="number"
          min={0}
          max={99}
          value={value}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!isNaN(v) && v >= 0) onChange(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Tab" && !e.shiftKey && onTabNext) {
              e.preventDefault();
              onTabNext();
            }
            if (e.key === "Enter") onEnter();
          }}
          className="w-16 h-12 shrink-0 text-center text-2xl font-bold rounded-xl border-2 border-stone-200 focus:border-amber-400 outline-none transition-colors bg-white text-stone-800"
          aria-label={`Buts ${label}`}
        />
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="w-9 h-9 shrink-0 rounded-lg border border-stone-200 bg-stone-50 text-stone-600 font-bold text-lg hover:bg-stone-100 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
          aria-label={`Augmenter buts ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function ScoreModal({
  match,
  homeTeam,
  awayTeam,
  onClose,
  onSubmit,
}: ScoreModalProps) {
  const isKnockout = match.stage !== "GROUP";

  const [homeGoals, setHomeGoals] = useState<number>(match.homeGoals ?? 0);
  const [awayGoals, setAwayGoals] = useState<number>(match.awayGoals ?? 0);
  const [penaltyWinner, setPenaltyWinner] = useState<"HOME" | "AWAY" | null>(
    match.penaltyWinner
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const homeRef = useRef<HTMLInputElement>(null);
  const awayRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Focus le champ home à l'ouverture
  useEffect(() => {
    homeRef.current?.focus();
    homeRef.current?.select();
  }, []);

  // Fermeture avec Échap
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const isTied = isKnockout && homeGoals === awayGoals;

  // Estimation des points FIFA en temps réel.
  // Pour le moment, tous les matches sont des matches de Coupe du monde →
  // importance fixe WORLD_CUP_FINALS. À ajuster plus tard si d'autres
  // compétitions sont gérées (qualifs, amicaux, etc.).
  const pointsEstimate = useMemo(() => {
    if (!homeTeam || !awayTeam) return null;
    // En knockout à égalité, on attend le choix du vainqueur aux TAB
    // avant de donner une estimation définitive.
    if (isTied && !penaltyWinner) return null;

    return calculateFifaPoints({
      homePoints: homeTeam.points,
      awayPoints: awayTeam.points,
      homeGoals,
      awayGoals,
      importance: match.stage === "GROUP" || 
                  match.stage === "ROUND_OF_32" ||
                  match.stage === "ROUND_OF_16" ? 50:60,
      penaltyWinner: isTied ? penaltyWinner : null,
      isKnockoutStage: isKnockout,
    });
  }, [homeTeam, awayTeam, homeGoals, awayGoals, isTied, penaltyWinner, isKnockout, match.stage]);

  const handleSubmit = useCallback(async () => {
    if (isTied && !penaltyWinner) {
      setError("Match nul en phase knockout → désignez le vainqueur aux TAB.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit(
        match.id,
        homeGoals,
        awayGoals,
        isTied ? penaltyWinner : null
      );
      onClose();
    } catch {
      setError("Erreur lors de l'enregistrement. Réessayez.");
    } finally {
      setLoading(false);
    }
  }, [match.id, homeGoals, awayGoals, penaltyWinner, isTied, onSubmit, onClose]);

  const handleReset = useCallback(async () => {
    setLoading(true);
    try {
      await onSubmit(match.id, null, null, null);
      onClose();
    } catch {
      setError("Erreur lors de la réinitialisation.");
    } finally {
      setLoading(false);
    }
  }, [match.id, onSubmit, onClose]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,10,5,0.55)" }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="score-modal-title"
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* En-tête */}
        <div className="bg-gradient-to-br from-stone-800 to-stone-900 px-6 py-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
              {match.stage === "GROUP"
                ? `Groupe ${match.group}`
                : match.stage.replace(/_/g, " ")}
            </span>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-white transition-colors text-xl leading-none focus:outline-none"
              aria-label="Fermer"
            >
              ×
            </button>
          </div>
          <h2
            id="score-modal-title"
            className="text-white font-bold text-lg leading-tight"
          >
            {homeTeam?.teamName ?? match.homeTeam} vs {awayTeam?.teamName ?? match.awayTeam}
          </h2>
          <p className="text-stone-400 text-xs mt-1">
            {new Date(match.date).toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            · {match.city}
          </p>
        </div>

        {/* Corps */}
        <div className="px-6 py-7">
          <div className="flex items-center justify-center">
            <div className="flex flex-col items-center gap-1 w-16 flex-shrink-0">
              {homeTeam?.flagUrl && (
                <img
                  src={homeTeam.flagUrl}
                  alt={homeTeam.teamName}
                  className="w-10 h-7 object-cover rounded bg-stone-100"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
              <span className="text-xs font-bold text-stone-700">
                {homeTeam?.teamCode ?? match.homeTeam}
              </span>
            </div>

            <GoalInput
              value={homeGoals}
              onChange={(v) => { setHomeGoals(v); setPenaltyWinner(null); }}
              label="Dom."
              inputRef={homeRef}
              onTabNext={() => { awayRef.current?.focus(); awayRef.current?.select(); }}
              onEnter={handleSubmit}
            />

            <span className="text-stone-300 font-bold text-xl self-end pb-2">–</span>

            <GoalInput
              value={awayGoals}
              onChange={(v) => { setAwayGoals(v); setPenaltyWinner(null); }}
              label="Ext."
              inputRef={awayRef}
              onEnter={handleSubmit}
            />

            <div className="flex flex-col items-center gap-1 w-16 flex-shrink-0">
              {awayTeam?.flagUrl && (
                <img
                  src={awayTeam.flagUrl}
                  alt={awayTeam.teamName}
                  className="w-10 h-7 object-cover rounded bg-stone-100"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
              <span className="text-xs font-bold text-stone-700">
                {awayTeam?.teamCode ?? match.awayTeam}
              </span>
            </div>
          </div>

          {/* Tirs au but (knockout + égalité) */}
          {isTied && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700 mb-3 text-center">
                Égalité → Vainqueur aux tirs au but
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setPenaltyWinner("HOME")}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    penaltyWinner === "HOME"
                      ? "bg-amber-500 text-white shadow-md"
                      : "bg-white border border-amber-200 text-stone-600 hover:border-amber-400"
                  }`}
                >
                  {homeTeam?.teamCode ?? match.homeTeam} gagne
                </button>
                <button
                  onClick={() => setPenaltyWinner("AWAY")}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    penaltyWinner === "AWAY"
                      ? "bg-amber-500 text-white shadow-md"
                      : "bg-white border border-amber-200 text-stone-600 hover:border-amber-400"
                  }`}
                >
                  {awayTeam?.teamCode ?? match.awayTeam} gagne
                </button>
              </div>
            </div>
          )}

          {/* Estimation des points FIFA */}
          {pointsEstimate && (
            <div className="mt-6 p-4 bg-orange-100 border border-stone-200 rounded-2xl">
              <p className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-3 text-center">
                Estimation points FIFA
              </p>
              <div className="flex items-center justify-center gap-6">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-xs text-stone-500">
                    {homeTeam?.teamCode}
                  </span>
                  <span className="text-sm text-stone-700">
                    {homeTeam?.points.toFixed(2)} →{" "}
                    <span className="font-bold">
                      {pointsEstimate.newHomePoints.toFixed(2)}
                    </span>
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      pointsEstimate.homeDelta > 0
                        ? "text-emerald-600"
                        : pointsEstimate.homeDelta < 0
                        ? "text-red-500"
                        : "text-stone-400"
                    }`}
                  >
                    {pointsEstimate.homeDelta > 0 ? "+" : ""}
                    {pointsEstimate.homeDelta.toFixed(2)}
                  </span>
                </div>

                <div className="w-px h-10 bg-stone-200" />

                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-xs text-stone-500">
                    {awayTeam?.teamCode}
                  </span>
                  <span className="text-sm text-stone-700">
                    {awayTeam?.points.toFixed(2)} →{" "}
                    <span className="font-bold">
                      {pointsEstimate.newAwayPoints.toFixed(2)}
                    </span>
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      pointsEstimate.awayDelta > 0
                        ? "text-emerald-600"
                        : pointsEstimate.awayDelta < 0
                        ? "text-red-500"
                        : "text-stone-400"
                    }`}
                  >
                    {pointsEstimate.awayDelta > 0 ? "+" : ""}
                    {pointsEstimate.awayDelta.toFixed(2)}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-stone-400 text-center mt-3">
                Probabilité de victoire avant match :{" "}
                {(pointsEstimate.expectedHome * 100).toFixed(0)}% /{" "}
                {(pointsEstimate.expectedAway * 100).toFixed(0)}%
              </p>
            </div>
          )}

          {error && (
            <p className="mt-4 text-center text-sm text-red-600 font-medium">{error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex flex-col gap-2">
          <button
            onClick={handleSubmit}
            disabled={loading || (isTied && !penaltyWinner)}
            className="w-full py-3.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {loading ? "Enregistrement…" : "Confirmer le score"}
          </button>

          {(match.homeGoals !== null || match.awayGoals !== null) && (
            <button
              onClick={handleReset}
              disabled={loading}
              className="w-full py-2.5 rounded-2xl bg-transparent text-stone-400 hover:text-red-500 text-sm font-medium transition-colors focus:outline-none"
            >
              Effacer le score
            </button>
          )}
        </div>
      </div>
    </div>
  );
}