// components/TeamSearchSelect.tsx
"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import type { Team } from "@/lib/data";

interface TeamSearchSelectProps {
  teams: Team[];
  value: Team | null;
  onChange: (team: Team) => void;
  excludeCountryCode?: string;
  placeholder?: string;
}

export default function TeamSearchSelect({
  teams,
  value,
  onChange,
  excludeCountryCode,
  placeholder = "Rechercher une équipe…",
}: TeamSearchSelectProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const filtered = teams.filter(
      (t) => t.teamCode !== excludeCountryCode
    );

    if (!query.trim()) return filtered.slice(0, 8);

    const q = query.trim().toLowerCase();
    return filtered
      .filter(
        (t) =>
          t.teamName.toLowerCase().includes(q) ||
          t.teamCode.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [teams, query, excludeCountryCode]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setIsEditing(false);
        setQuery("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(team: Team) {
    onChange(team);
    setQuery("");
    setIsOpen(false);
    setIsEditing(false);
  }

  // Texte affiché dans le champ : ce qu'on tape en édition,
  // sinon le nom de l'équipe déjà choisie, sinon vide.
  const displayValue = isEditing ? query : value ? value.teamName : query;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          value={displayValue}
          onChange={(e) => {
            setIsEditing(true);
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={(e) => {
            setIsEditing(true);
            setQuery("");
            setIsOpen(true);
            // Sélectionne tout le texte existant pour permettre de
            // retaper immédiatement par-dessus le nom déjà choisi.
            e.target.select();
          }}
          placeholder={placeholder}
          className={`w-full rounded-xl bg-[#F5F7F1] border border-[#D8DED2] text-sm font-medium text-[#16241A] placeholder:text-[#9AA79C] focus:outline-none focus:ring-2 focus:ring-[#1B7A3D] focus:border-[#1B7A3D] transition-colors ${
            value && !isEditing
              ? "h-[52px] pl-12 pr-3 text-transparent caret-transparent"
              : "py-2.5 pl-9 pr-3"
          }`}
        />

        {/* Loupe affichée tant qu'aucune équipe n'est choisie / en édition */}
        {!(value && !isEditing) && (
          <svg
            viewBox="0 0 20 20"
            fill="none"
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9AA79C] pointer-events-none"
          >
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.75" />
            <path
              d="M14 14l4 4"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        )}

        {/* Aperçu équipe sélectionnée : drapeau + nom + rang/points sur deux lignes */}
        {value && !isEditing && (
          <div className="absolute inset-0 flex items-center gap-3 pl-3 pr-3 pointer-events-none">
            <img
              src={value.flagUrl}
              alt=""
              className="h-9 w-12 rounded-[3px] object-cover border border-[#E1E6DA] flex-shrink-0"
            />
            <span className="flex-1 min-w-0">
              <span className="block text-xl font-bold uppercase text-[#16241A] truncate leading-tight">
                {value.teamName}
              </span>
              <span className="block text-[14px] font-semibold text-[#5B6B5F] tabular-nums leading-tight">
                <span className="text-[#c40938]">#{value.rank}</span> · <span className="text-[#6b170c]">{value.points.toFixed(2)} pts</span>
              </span>
            </span>
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="h-4 w-4 text-[#9AA79C] flex-shrink-0"
            >
              <path
                d="M6 8l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>

      {isOpen && (
        <ul className="absolute z-20 mt-2 w-full max-h-72 overflow-auto rounded-xl bg-white border border-[#E1E6DA] shadow-[0_8px_24px_-8px_rgba(22,36,26,0.18)] py-1.5">
          {results.length === 0 && (
            <li className="px-3 py-2.5 text-sm font-medium text-[#9AA79C] text-center">
              Aucune équipe trouvée
            </li>
          )}

          {results.map((team) => (
            <li key={team.teamCode}>
              <button
                type="button"
                onClick={() => handleSelect(team)}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[#F5F7F1] transition-colors"
              >
                <img
                  src={team.flagUrl}
                  alt=""
                  className="h-6 w-9 rounded-[3px] object-cover border border-[#E1E6DA] flex-shrink-0"
                />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-[#16241A] truncate">
                    {team.teamName}
                  </span>
                </span>
                <span className="text-[11px] font-bold uppercase tabular-nums text-[#1B7A3D] bg-[#EAF4EC] rounded-full px-2 py-0.5 flex-shrink-0">
                  #{team.rank}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}