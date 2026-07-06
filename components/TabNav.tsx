"use client";

/**
 * components/TabNav.tsx
 * Navigation par onglets — desktop horizontal, mobile burger menu.
 */

import { useState } from "react";

export type TabKey = "matches" | "groups" | "thirds" | "bracket" | "fifa" | "simulator";

export interface TabDef {
  key: TabKey;
  label: string;
  icon: string;
}

export const TABS: TabDef[] = [
  { key: "matches", label: "Matchs", icon: "⚽" },
  { key: "groups", label: "Groupes", icon: "📊" },
  { key: "thirds", label: "3e qualifiés", icon: "🥉" },
  { key: "bracket", label: "Bracket", icon: "🏆" },
  { key: "fifa", label: "Classement FIFA", icon: "🌍" },
  { key: "simulator", label: "Simulateur", icon: "🧮" },
];

interface TabNavProps {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
}

export function TabNav({ activeTab, onChange }: TabNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const activeDef = TABS.find((t) => t.key === activeTab);

  const handleSelect = (key: TabKey) => {
    onChange(key);
    setMenuOpen(false);
  };

  return (
    <div className="relative">
      {/* Desktop : onglets horizontaux */}
      <div className="hidden md:flex gap-1 border-b border-stone-700 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-stone-400 hover:text-stone-200"
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Mobile : bouton burger affichant l'onglet actif */}
      <div className="md:hidden flex items-center justify-between py-3 border-b border-stone-700">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-label="Ouvrir le menu des onglets"
          className="flex items-center gap-2.5 text-stone-100"
        >
          <BurgerIcon open={menuOpen} />
          <span className="text-sm font-bold">
            {activeDef?.icon} {activeDef?.label}
          </span>
        </button>
      </div>

      {/* Mobile : menu déroulant */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-30 md:hidden"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute left-0 right-0 top-full z-40 md:hidden bg-stone-900 border border-stone-700 rounded-b-xl shadow-xl overflow-hidden">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleSelect(tab.key)}
                className={`w-full flex items-center gap-3 px-5 py-3.5 text-sm font-semibold text-left transition-colors ${
                  activeTab === tab.key
                    ? "bg-stone-800 text-amber-400"
                    : "text-stone-300 hover:bg-stone-800/60"
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function BurgerIcon({ open }: { open: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
      {open ? (
        <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}