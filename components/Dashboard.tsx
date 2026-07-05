// "use client";

// /**
//  * components/Dashboard.tsx
//  * Tableau de bord principal — Coupe du Monde 2026
//  * Refonte complète : design chaleureux, structuré, lisible.
//  *
//  * Palette :
//  * - Fond : stone-50 (crème chaud, pas de noir)
//  * - Accents : amber-400/500 (or FIFA)
//  * - Succès/qualification : emerald-500
//  * - Textes : stone-800 / stone-500
//  * - Header : stone-900 avec fil doré
//  *
//  * Onglets :
//  * 1. Matchs       — liste par journée avec filtre groupe/phase
//  * 2. Groupes      — les 12 groupes A→L en grille
//  * 3. 3e qualifiés — classement des meilleurs 3e (règle WC 2026)
//  * 4. Bracket      — arbre knockout 1/32 → finale
//  * 5. FIFA         — classement FIFA live
//  */

// import { useCallback, useEffect, useMemo, useState } from "react";
// import type { Match, Team } from "@/lib/data";
// import { computeGroupStandings } from "@/lib/standings";
// import { computeAllThirdPlaced } from "@/lib/third-place";
// import { buildBracket } from "@/lib/knockout";
// import { GroupTable } from "./GroupTable";
// import { MatchCard } from "./MatchCard";
// import { KnockoutBracket } from "./KnockoutBracket";
// import { FifaTable } from "./FifaRankings";

// // ── Types ─────────────────────────────────────────────────────────────────────

// type TabKey = "matches" | "groups" | "thirds" | "bracket" | "fifa";

// const TABS: { key: TabKey; label: string; icon: string }[] = [
//   { key: "matches", label: "Matchs", icon: "⚽" },
//   { key: "groups", label: "Groupes", icon: "📊" },
//   { key: "thirds", label: "3e qualifiés", icon: "🥉" },
//   { key: "bracket", label: "Bracket", icon: "🏆" },
//   { key: "fifa", label: "Classement FIFA", icon: "🌍" },
// ];

// // ── Composant principal ───────────────────────────────────────────────────────

// export default function Dashboard() {
//   const [matches, setMatches] = useState<Match[]>([]);
//   const [teams, setTeams] = useState<Team[]>([]);
//   const [activeTab, setActiveTab] = useState<TabKey>("matches");
//   const [groupFilter, setGroupFilter] = useState<string>("ALL");
//   const [stageFilter, setStageFilter] = useState<"ALL" | "GROUP" | "KNOCKOUT">("ALL");
//   const [saveError, setSaveError] = useState<string | null>(null);

//   // Chargement initial
//   useEffect(() => {
//     fetch("/api/matches").then((r) => r.json()).then(setMatches).catch(() => {});
//     fetch("/api/teams").then((r) => r.json()).then(setTeams).catch(() => {});
//   }, []);

//   // ── Données dérivées ────────────────────────────────────────────────────────

//   const groups = useMemo(
//     () => Array.from(new Set(teams.map((t) => t.group).filter(Boolean))).sort() as string[],
//     [teams]
//   );

//   const allGroupStandings = useMemo(
//     () =>
//       groups.map((g) => ({
//         group: g,
//         standings: computeGroupStandings(g, teams, matches),
//       })),
//     [groups, teams, matches]
//   );

//   const thirdPlaced = useMemo(
//     () => computeAllThirdPlaced(allGroupStandings),
//     [allGroupStandings]
//   );

//   const bracket = useMemo(() => buildBracket(matches, teams), [matches, teams]);

//   const fifaRankings = useMemo(
//     () => [...teams].sort((a, b) => b.points - a.points),
//     [teams]
//   );

//   // ── Matchs filtrés + regroupés par journée ──────────────────────────────────

//   const matchdays = useMemo(() => {
//     const dateKey = (iso: string) => iso.slice(0, 10);
//     const today = new Date().toISOString().slice(0, 10);
//     const isPlayed = (m: Match) => m.homeGoals !== null && m.awayGoals !== null;

//     let filtered = matches;
//     if (groupFilter !== "ALL") {
//       filtered = filtered.filter((m) => m.group === groupFilter);
//     }
//     if (stageFilter === "GROUP") {
//       filtered = filtered.filter((m) => m.stage === "GROUP");
//     } else if (stageFilter === "KNOCKOUT") {
//       filtered = filtered.filter((m) => m.stage !== "GROUP");
//     }

//     const byDate = new Map<string, Match[]>();
//     for (const m of filtered) {
//       const d = dateKey(m.date);
//       if (!byDate.has(d)) byDate.set(d, []);
//       byDate.get(d)!.push(m);
//     }

//     // Une journée est considérée "en attente" (donc pas "past") si au moins
//     // un de ses matchs n'a pas encore de score saisi — même si la date est
//     // dépassée. Ça évite qu'un match passé mais non renseigné disparaisse
//     // en bas de la liste : il reste classé avec les matchs à venir.
//     const dayStatus = (date: string, dayMatches: Match[]): "past" | "today" | "upcoming" => {
//       const hasUnplayed = dayMatches.some((m) => !isPlayed(m));
//       if (date === today) return "today";
//       if (date < today) return hasUnplayed ? "upcoming" : "past";
//       return "upcoming";
//     };

//     const statusRank = (status: "past" | "today" | "upcoming") =>
//       status === "today" ? 0 : status === "upcoming" ? 1 : 2; // today, puis à venir/en attente, puis terminés

//     return Array.from(byDate.entries())
//       .map(([date, dayMatches]) => ({
//         date,
//         matches: dayMatches.sort(
//           (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
//         ),
//         status: dayStatus(date, dayMatches),
//       }))
//       .sort((a, b) => {
//         const rankA = statusRank(a.status);
//         const rankB = statusRank(b.status);
//         if (rankA !== rankB) return rankA - rankB;
//         // à venir/en attente : du plus proche (ou plus ancien en retard) au plus loin
//         // terminés : du plus récent au plus ancien
//         return rankA === 2 ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
//       })
//       .map((day, idx) => ({ ...day, index: idx + 1 }));
//   }, [matches, groupFilter, stageFilter]);

//   // ── Saisie de score ────────────────────────────────────────────────────────

//   const handleScoreChange = useCallback(
//     async (
//       matchId: string,
//       homeGoals: number | null,
//       awayGoals: number | null,
//       penaltyWinner: "HOME" | "AWAY" | null
//     ) => {
//       // Mise à jour optimiste
//       setMatches((prev) =>
//         prev.map((m) =>
//           m.id === matchId ? { ...m, homeGoals, awayGoals, penaltyWinner } : m
//         )
//       );
//       setSaveError(null);

//       const res = await fetch("/api/matches", {
//         method: "PATCH",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ id: matchId, homeGoals, awayGoals, penaltyWinner }),
//       });

//       if (!res.ok) {
//         setSaveError("Erreur d'enregistrement. Vérifiez votre connexion.");
//         return;
//       }

//       const data: { match: Match; teams: Team[] | null; warning: string | null } =
//         await res.json();

//       setMatches((prev) => prev.map((m) => (m.id === matchId ? data.match : m)));
//       if (data.teams) setTeams(data.teams);
//       if (data.warning) setSaveError(data.warning);
//     },
//     []
//   );

//   // ── Statistiques en-tête ───────────────────────────────────────────────────

//   const playedCount = matches.filter(
//     (m) => m.homeGoals !== null && m.awayGoals !== null
//   ).length;
//   const totalGoals = matches.reduce(
//     (acc, m) => acc + (m.homeGoals ?? 0) + (m.awayGoals ?? 0),
//     0
//   );

//   const teamLookup = useMemo(() => {
//     const map = new Map<string, Team>();
//     for (const t of teams) map.set(t.teamCode, t);
//     return map;
//   }, [teams]);

//   // ── Rendu ──────────────────────────────────────────────────────────────────

//   return (
//     <div className="min-h-screen bg-stone-50 text-stone-800 font-sans">

//       {/* ===== HEADER ===== */}
//       <header className="bg-stone-900 text-white">
//         <div className="max-w-6xl mx-auto px-6 pt-8 pb-6">
//           {/* Fil doré */}
//           <div className="h-0.5 w-16 bg-amber-400 mb-5 rounded-full" />

//           <div className="flex flex-wrap items-end justify-between gap-6">
//             <div>
//               <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-400 mb-2">
//                 FIFA World Cup · Canada · Mexique · États-Unis
//               </p>
//               <h1 className="text-4xl font-black leading-none tracking-tight">
//                 2026
//                 <span className="ml-3 text-amber-400">⚽</span>
//               </h1>
//               <p className="text-stone-400 text-sm mt-2">Tableau de bord officieux du tournoi</p>
//             </div>

//             {/* Stats rapides */}
//             <div className="flex gap-5">
//               <Stat value={playedCount} label="Matchs joués" total={matches.length} />
//               <Stat value={totalGoals} label="Buts marqués" />
//               <Stat
//                 value={thirdPlaced.filter((t) => t.qualified).length}
//                 label="3e qualifiés"
//                 total={8}
//               />
//             </div>
//           </div>

//           {/* Prochains matchs */}
//           <NextMatchBanner matches={matches} teams={teamLookup} />
//         </div>

//         {/* Onglets */}
//         <nav className="max-w-6xl mx-auto px-6">
//           <div className="flex gap-1 border-b border-stone-700">
//             {TABS.map((tab) => (
//               <button
//                 key={tab.key}
//                 onClick={() => setActiveTab(tab.key)}
//                 className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition-all ${
//                   activeTab === tab.key
//                     ? "border-amber-400 text-amber-400"
//                     : "border-transparent text-stone-400 hover:text-stone-200"
//                 }`}
//               >
//                 <span>{tab.icon}</span>
//                 {tab.label}
//               </button>
//             ))}
//           </div>
//         </nav>
//       </header>

//       {/* ===== CONTENU ===== */}
//       <main className="max-w-6xl mx-auto px-6 py-8">
//         {saveError && (
//           <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
//             {saveError}
//           </div>
//         )}

//         {/* ─ Matchs ─ */}
//         {activeTab === "matches" && (
//           <div className="space-y-8">
//             {/* Filtres */}
//             <div className="flex flex-wrap gap-3 items-center">
//               <select
//                 value={groupFilter}
//                 onChange={(e) => setGroupFilter(e.target.value)}
//                 className="px-3 py-2 rounded-xl border border-stone-200 bg-white text-sm text-stone-700 focus:outline-none focus:border-amber-400"
//               >
//                 <option value="ALL">Tous les groupes</option>
//                 {groups.map((g) => (
//                   <option key={g} value={g}>Groupe {g}</option>
//                 ))}
//               </select>

//               <select
//                 value={stageFilter}
//                 onChange={(e) => setStageFilter(e.target.value as typeof stageFilter)}
//                 className="px-3 py-2 rounded-xl border border-stone-200 bg-white text-sm text-stone-700 focus:outline-none focus:border-amber-400"
//               >
//                 <option value="ALL">Toutes les phases</option>
//                 <option value="GROUP">Phase de groupes</option>
//                 <option value="KNOCKOUT">Élimination directe</option>
//               </select>

//               {(groupFilter !== "ALL" || stageFilter !== "ALL") && (
//                 <button
//                   onClick={() => { setGroupFilter("ALL"); setStageFilter("ALL"); }}
//                   className="text-xs text-stone-400 hover:text-stone-600 underline"
//                 >
//                   Réinitialiser
//                 </button>
//               )}

//               <span className="ml-auto text-sm text-stone-400">
//                 {matchdays.reduce((a, d) => a + d.matches.length, 0)} matchs affichés
//               </span>
//             </div>

//             {/* Journées */}
//             {matchdays.length === 0 ? (
//               <div className="text-center py-16 text-stone-400">
//                 Aucun match pour ces filtres.
//               </div>
//             ) : (
//               matchdays.map((day) => (
//                 <section key={day.date}>
//                   <div className="flex items-center gap-3 mb-4">
//                     <h2 className="font-black text-lg text-stone-800">
//                       {new Date(day.date).toLocaleDateString("fr-FR", {
//                         weekday: "long",
//                         day: "numeric",
//                         month: "long",
//                       })}
//                     </h2>
//                     <span
//                       className={`text-[10.5px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${
//                         day.status === "today"
//                           ? "bg-amber-100 text-amber-700"
//                           : day.status === "past"
//                           ? "bg-stone-100 text-stone-400"
//                           : "bg-emerald-50 text-emerald-600"
//                       }`}
//                     >
//                       {day.status === "today" ? "Aujourd'hui" : day.status === "past" ? "Terminé" : "À venir"}
//                     </span>
//                   </div>

//                   <div className="lg:w-[60%] w-full max-w-full space-y-8 mx-auto">
//                     {day.matches.map((m) => (
//                       <MatchCard
//                         key={m.id}
//                         match={m}
//                         homeTeam={teamLookup.get(m.homeTeam) ?? null}
//                         awayTeam={teamLookup.get(m.awayTeam) ?? null}
//                         canEdit={true}
//                         onSubmitResult={handleScoreChange}
//                       />
//                     ))}
//                   </div>
//                 </section>
//               ))
//             )}
//           </div>
//         )}

//         {/* ─ Groupes ─ */}
//         {activeTab === "groups" && (
//           <div>
//             <div className="mb-6">
//               <h2 className="text-2xl font-black text-stone-800">Phase de groupes</h2>
//               <p className="text-stone-500 text-sm mt-1">12 groupes · 4 équipes chacun · 2 qualifiés directs + 1 potentiel 3e</p>
//             </div>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               {allGroupStandings.map(({ group, standings }) => (
//                 <GroupTable key={group} group={group} standings={standings} />
//               ))}
//             </div>
//           </div>
//         )}

//         {/* ─ 3e qualifiés ─ */}
//         {activeTab === "thirds" && (
//           <div>
//             <div className="mb-6">
//               <h2 className="text-2xl font-black text-stone-800">Meilleurs 3e qualifiés</h2>
//               <p className="text-stone-500 text-sm mt-1">
//                 Les 8 meilleurs 3e (sur 12) se qualifient pour les 1/32e · Critères : Points → Diff. buts → Buts marqués → Points FIFA
//               </p>
//             </div>
//             <ThirdPlaceTable thirds={thirdPlaced} />
//           </div>
//         )}

//         {/* ─ Bracket ─ */}
//         {activeTab === "bracket" && (
//           <div>
//             <div className="mb-6">
//               <h2 className="text-2xl font-black text-stone-800">Tableau des éliminations</h2>
//               <p className="text-stone-500 text-sm mt-1">1/32e → 1/16e → Quarts → Demies → Finale</p>
//             </div>
//             <KnockoutBracket bracket={bracket} />
//           </div>
//         )}

//         {/* ─ Classement FIFA ─ */}
//         {activeTab === "fifa" && (
//           <div>
//             <div className="mb-6">
//               <h2 className="text-2xl font-black text-stone-800">Classement FIFA</h2>
//               <p className="text-stone-500 text-sm mt-1">Mis à jour après chaque résultat saisi</p>
//             </div>
//             <FifaTable rankings={fifaRankings} />
//           </div>
//         )}
//       </main>
//     </div>
//   );
// }

// // ── Sous-composants ───────────────────────────────────────────────────────────

// function Stat({
//   value,
//   label,
//   total,
// }: {
//   value: number;
//   label: string;
//   total?: number;
// }) {
//   return (
//     <div className="text-right">
//       <div className="text-2xl font-black text-white leading-none">
//         {value}
//         {total !== undefined && (
//           <span className="text-stone-500 text-base font-normal"> / {total}</span>
//         )}
//       </div>
//       <div className="text-[11px] text-stone-400 font-medium mt-0.5">{label}</div>
//     </div>
//   );
// }

// function NextMatchBanner({
//   matches,
//   teams,
// }: {
//   matches: Match[];
//   teams: Map<string, Team>;
// }) {
//   const next = [...matches]
//     .filter((m) => m.homeGoals === null && m.awayGoals === null)
//     .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

//   if (!next) return null;

//   const home = teams.get(next.homeTeam);
//   const away = teams.get(next.awayTeam);

//   return (
//     <div className="mt-5 flex items-center gap-4 bg-stone-800 rounded-2xl px-5 py-3.5 border border-stone-700">
//       <span className="text-[10.5px] font-bold uppercase tracking-wider text-amber-400 shrink-0">
//         Prochain match
//       </span>
//       <div className="flex w-full items-center justify-center gap-3">
//         {home?.flagUrl && (
//           <img src={home.flagUrl} alt={home.teamName} className="w-6 h-4 object-cover rounded-sm" />
//         )}
//         <span className="text-white font-bold text-sm">{home?.teamName ?? next.homeTeam}</span>
//         <span className="text-stone-500 font-bold">vs</span>
//         <span className="text-white font-bold text-sm">{away?.teamName ?? next.awayTeam}</span>
//         {away?.flagUrl && (
//           <img src={away.flagUrl} alt={away.teamName} className="w-6 h-4 object-cover rounded-sm" />
//         )}
//       </div>
//       <span className="ml-auto text-stone-400 text-xs flex-shrink-0">
//         {new Date(next.date).toLocaleDateString("fr-FR", {
//           day: "numeric",
//           month: "short",
//           hour: "2-digit",
//           minute: "2-digit",
//         })}
//       </span>
//     </div>
//   );
// }

// function ThirdPlaceTable({
//   thirds,
// }: {
//   thirds: ReturnType<typeof computeAllThirdPlaced>;
// }) {
//   return (
//     <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
//       <div className="flex items-center px-5 py-3 bg-stone-50 border-b border-stone-100 text-[10.5px] font-bold uppercase tracking-wider text-stone-400">
//         <span className="w-8 text-center">Rang</span>
//         <span className="w-12 text-center">Groupe</span>
//         <span className="flex-1">Équipe</span>
//         <span className="w-10 text-center">MJ</span>
//         <span className="w-10 text-center">Diff</span>
//         <span className="w-10 text-center">BP</span>
//         <span className="w-10 text-center">Pts</span>
//         <span className="w-24 text-right">Statut</span>
//       </div>

//       {thirds.map((entry, idx) => (
//         <div
//           key={entry.standing.team.teamCode}
//           className={`flex items-center px-5 py-3 border-b border-stone-50 last:border-b-0 ${
//             entry.qualified ? "bg-amber-50/30" : ""
//           }`}
//         >
//           <span className="w-8 text-center font-bold text-stone-400 text-sm">{idx + 1}</span>
//           <span className="w-12 text-center">
//             <span className="w-6 h-6 rounded bg-stone-800 text-amber-400 flex items-center justify-center font-black text-xs mx-auto">
//               {entry.group}
//             </span>
//           </span>
//           <span className="flex-1 flex items-center gap-2.5">
//             <img
//               src={entry.standing.team.flagUrl}
//               alt={entry.standing.team.teamName}
//               className="w-6 h-4 object-cover rounded-sm"
//               loading="lazy"
//             />
//             <span className="font-semibold text-sm text-stone-800">
//               {entry.standing.team.teamName}
//             </span>
//           </span>
//           <span className="w-10 text-center text-sm text-stone-500">{entry.standing.played}</span>
//           <span className="w-10 text-center text-sm text-stone-500">
//             {entry.standing.goalDiff > 0
//               ? `+${entry.standing.goalDiff}`
//               : entry.standing.goalDiff}
//           </span>
//           <span className="w-10 text-center text-sm text-stone-500">{entry.standing.goalsFor}</span>
//           <span className="w-10 text-center font-black text-stone-800">{entry.standing.points}</span>
//           <span className="w-24 text-right">
//             {entry.qualified ? (
//               <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
//                 Qualifié
//               </span>
//             ) : entry.standing.played < 3 ? (
//               <span className="text-[10px] text-stone-300">En cours</span>
//             ) : (
//               <span className="text-[10px] text-stone-300">Éliminé</span>
//             )}
//           </span>
//         </div>
//       ))}

//       {thirds.length === 0 && (
//         <div className="text-center py-12 text-stone-400 text-sm">
//           Aucun résultat de groupe disponible.
//         </div>
//       )}
//     </div>
//   );
// }

"use client";

/**
 * components/Dashboard.tsx
 * Tableau de bord principal — Coupe du Monde 2026
 * Refonte complète : design chaleureux, structuré, lisible.
 *
 * Palette :
 * - Fond : stone-50 (crème chaud, pas de noir)
 * - Accents : amber-400/500 (or FIFA)
 * - Succès/qualification : emerald-500
 * - Textes : stone-800 / stone-500
 * - Header : stone-900 avec fil doré
 *
 * Onglets :
 * 1. Matchs       — liste par journée avec filtre groupe/phase
 * 2. Groupes      — les 12 groupes A→L en grille
 * 3. 3e qualifiés — classement des meilleurs 3e (règle WC 2026)
 * 4. Bracket      — arbre knockout 1/32 → finale
 * 5. FIFA         — classement FIFA live
 * 6. Simulateur   — calculateur de points FIFA (carte "pelouse" encastrée)
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Match, Team } from "@/lib/data";
import { computeGroupStandings } from "@/lib/standings";
import { computeAllThirdPlaced } from "@/lib/third-place";
import { buildBracket } from "@/lib/knockout";
import { GroupTable } from "./GroupTable";
import { MatchCard } from "./MatchCard";
import { KnockoutBracket } from "./KnockoutBracket";
import { FifaTable } from "./FifaRankings";
import FifaSimulator from "./FifaSimulator";

// ── Types ─────────────────────────────────────────────────────────────────────

type TabKey = "matches" | "groups" | "thirds" | "bracket" | "fifa" | "simulator";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "matches", label: "Matchs", icon: "⚽" },
  { key: "groups", label: "Groupes", icon: "📊" },
  { key: "thirds", label: "3e qualifiés", icon: "🥉" },
  { key: "bracket", label: "Bracket", icon: "🏆" },
  { key: "fifa", label: "Classement FIFA", icon: "🌍" },
  { key: "simulator", label: "Simulateur", icon: "🧮" },
];

// ── Composant principal ───────────────────────────────────────────────────────

export default function Dashboard() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("matches");
  const [groupFilter, setGroupFilter] = useState<string>("ALL");
  const [stageFilter, setStageFilter] = useState<"ALL" | "GROUP" | "KNOCKOUT">("ALL");
  const [saveError, setSaveError] = useState<string | null>(null);

  // Chargement initial
  useEffect(() => {
    fetch("/api/matches").then((r) => r.json()).then(setMatches).catch(() => {});
    fetch("/api/teams").then((r) => r.json()).then(setTeams).catch(() => {});
  }, []);

  // ── Données dérivées ────────────────────────────────────────────────────────

  const groups = useMemo(
    () => Array.from(new Set(teams.map((t) => t.group).filter(Boolean))).sort() as string[],
    [teams]
  );

  const allGroupStandings = useMemo(
    () =>
      groups.map((g) => ({
        group: g,
        standings: computeGroupStandings(g, teams, matches),
      })),
    [groups, teams, matches]
  );

  const thirdPlaced = useMemo(
    () => computeAllThirdPlaced(allGroupStandings),
    [allGroupStandings]
  );

  const bracket = useMemo(() => buildBracket(matches, teams), [matches, teams]);

  const fifaRankings = useMemo(
    () => [...teams].sort((a, b) => b.points - a.points),
    [teams]
  );

  // ── Matchs filtrés + regroupés par journée ──────────────────────────────────

  const matchdays = useMemo(() => {
    const dateKey = (iso: string) => iso.slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    const isPlayed = (m: Match) => m.homeGoals !== null && m.awayGoals !== null;

    let filtered = matches;
    if (groupFilter !== "ALL") {
      filtered = filtered.filter((m) => m.group === groupFilter);
    }
    if (stageFilter === "GROUP") {
      filtered = filtered.filter((m) => m.stage === "GROUP");
    } else if (stageFilter === "KNOCKOUT") {
      filtered = filtered.filter((m) => m.stage !== "GROUP");
    }

    const byDate = new Map<string, Match[]>();
    for (const m of filtered) {
      const d = dateKey(m.date);
      if (!byDate.has(d)) byDate.set(d, []);
      byDate.get(d)!.push(m);
    }

    // Une journée est considérée "en attente" (donc pas "past") si au moins
    // un de ses matchs n'a pas encore de score saisi — même si la date est
    // dépassée. Ça évite qu'un match passé mais non renseigné disparaisse
    // en bas de la liste : il reste classé avec les matchs à venir.
    const dayStatus = (date: string, dayMatches: Match[]): "past" | "today" | "upcoming" => {
      const hasUnplayed = dayMatches.some((m) => !isPlayed(m));
      if (date === today) return "today";
      if (date < today) return hasUnplayed ? "upcoming" : "past";
      return "upcoming";
    };

    const statusRank = (status: "past" | "today" | "upcoming") =>
      status === "today" ? 0 : status === "upcoming" ? 1 : 2; // today, puis à venir/en attente, puis terminés

    return Array.from(byDate.entries())
      .map(([date, dayMatches]) => ({
        date,
        matches: dayMatches.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        ),
        status: dayStatus(date, dayMatches),
      }))
      .sort((a, b) => {
        const rankA = statusRank(a.status);
        const rankB = statusRank(b.status);
        if (rankA !== rankB) return rankA - rankB;
        // à venir/en attente : du plus proche (ou plus ancien en retard) au plus loin
        // terminés : du plus récent au plus ancien
        return rankA === 2 ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
      })
      .map((day, idx) => ({ ...day, index: idx + 1 }));
  }, [matches, groupFilter, stageFilter]);

  // ── Saisie de score ────────────────────────────────────────────────────────

  const handleScoreChange = useCallback(
    async (
      matchId: string,
      homeGoals: number | null,
      awayGoals: number | null,
      penaltyWinner: "HOME" | "AWAY" | null
    ) => {
      // Mise à jour optimiste
      setMatches((prev) =>
        prev.map((m) =>
          m.id === matchId ? { ...m, homeGoals, awayGoals, penaltyWinner } : m
        )
      );
      setSaveError(null);

      const res = await fetch("/api/matches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: matchId, homeGoals, awayGoals, penaltyWinner }),
      });

      if (!res.ok) {
        setSaveError("Erreur d'enregistrement. Vérifiez votre connexion.");
        return;
      }

      // Fix : la route PATCH /api/matches renvoie `rankings`, pas `teams`.
      // Avant, `data.teams` était toujours `undefined` et le classement FIFA
      // affiché ne se mettait donc jamais à jour après une saisie de score.
      const data: { match: Match; rankings: Team[] | null; warning: string | null } =
        await res.json();

      setMatches((prev) => prev.map((m) => (m.id === matchId ? data.match : m)));
      if (data.rankings) setTeams(data.rankings);
      if (data.warning) setSaveError(data.warning);
    },
    []
  );

  // ── Statistiques en-tête ───────────────────────────────────────────────────

  const playedCount = matches.filter(
    (m) => m.homeGoals !== null && m.awayGoals !== null
  ).length;
  const totalGoals = matches.reduce(
    (acc, m) => acc + (m.homeGoals ?? 0) + (m.awayGoals ?? 0),
    0
  );

  const teamLookup = useMemo(() => {
    const map = new Map<string, Team>();
    for (const t of teams) map.set(t.teamCode, t);
    return map;
  }, [teams]);

  // ── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 font-sans">

      {/* ===== HEADER ===== */}
      <header className="bg-stone-900 text-white">
        <div className="max-w-6xl mx-auto px-6 pt-8 pb-6">
          {/* Fil doré */}
          <div className="h-0.5 w-16 bg-amber-400 mb-5 rounded-full" />

          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-400 mb-2">
                FIFA World Cup · Canada · Mexique · États-Unis
              </p>
              <h1 className="text-4xl font-black leading-none tracking-tight">
                2026
                <span className="ml-3 text-amber-400">⚽</span>
              </h1>
              <p className="text-stone-400 text-sm mt-2">Tableau de bord officieux du tournoi</p>
            </div>

            {/* Stats rapides */}
            <div className="flex gap-5">
              <Stat value={playedCount} label="Matchs joués" total={matches.length} />
              <Stat value={totalGoals} label="Buts marqués" />
              <Stat
                value={thirdPlaced.filter((t) => t.qualified).length}
                label="3e qualifiés"
                total={8}
              />
            </div>
          </div>

          {/* Prochains matchs */}
          <NextMatchBanner matches={matches} teams={teamLookup} />
        </div>

        {/* Onglets */}
        <nav className="max-w-6xl mx-auto px-6">
          <div className="flex gap-1 border-b border-stone-700 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
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
        </nav>
      </header>

      {/* ===== CONTENU ===== */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {saveError && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
            {saveError}
          </div>
        )}

        {/* ─ Matchs ─ */}
        {activeTab === "matches" && (
          <div className="space-y-8">
            {/* Filtres */}
            <div className="flex flex-wrap gap-3 items-center">
              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-stone-200 bg-white text-sm text-stone-700 focus:outline-none focus:border-amber-400"
              >
                <option value="ALL">Tous les groupes</option>
                {groups.map((g) => (
                  <option key={g} value={g}>Groupe {g}</option>
                ))}
              </select>

              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value as typeof stageFilter)}
                className="px-3 py-2 rounded-xl border border-stone-200 bg-white text-sm text-stone-700 focus:outline-none focus:border-amber-400"
              >
                <option value="ALL">Toutes les phases</option>
                <option value="GROUP">Phase de groupes</option>
                <option value="KNOCKOUT">Élimination directe</option>
              </select>

              {(groupFilter !== "ALL" || stageFilter !== "ALL") && (
                <button
                  onClick={() => { setGroupFilter("ALL"); setStageFilter("ALL"); }}
                  className="text-xs text-stone-400 hover:text-stone-600 underline"
                >
                  Réinitialiser
                </button>
              )}

              <span className="ml-auto text-sm text-stone-400">
                {matchdays.reduce((a, d) => a + d.matches.length, 0)} matchs affichés
              </span>
            </div>

            {/* Journées */}
            {matchdays.length === 0 ? (
              <div className="text-center py-16 text-stone-400">
                Aucun match pour ces filtres.
              </div>
            ) : (
              matchdays.map((day) => (
                <section key={day.date}>
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="font-black text-lg text-stone-800">
                      {new Date(day.date).toLocaleDateString("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </h2>
                    <span
                      className={`text-[10.5px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${
                        day.status === "today"
                          ? "bg-amber-100 text-amber-700"
                          : day.status === "past"
                          ? "bg-stone-100 text-stone-400"
                          : "bg-emerald-50 text-emerald-600"
                      }`}
                    >
                      {day.status === "today" ? "Aujourd'hui" : day.status === "past" ? "Terminé" : "À venir"}
                    </span>
                  </div>

                  <div className="lg:w-[60%] w-full max-w-full space-y-8 mx-auto">
                    {day.matches.map((m) => (
                      <MatchCard
                        key={m.id}
                        match={m}
                        homeTeam={teamLookup.get(m.homeTeam) ?? null}
                        awayTeam={teamLookup.get(m.awayTeam) ?? null}
                        canEdit={true}
                        onSubmitResult={handleScoreChange}
                      />
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        )}

        {/* ─ Groupes ─ */}
        {activeTab === "groups" && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-black text-stone-800">Phase de groupes</h2>
              <p className="text-stone-500 text-sm mt-1">12 groupes · 4 équipes chacun · 2 qualifiés directs + 1 potentiel 3e</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allGroupStandings.map(({ group, standings }) => (
                <GroupTable key={group} group={group} standings={standings} />
              ))}
            </div>
          </div>
        )}

        {/* ─ 3e qualifiés ─ */}
        {activeTab === "thirds" && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-black text-stone-800">Meilleurs 3e qualifiés</h2>
              <p className="text-stone-500 text-sm mt-1">
                Les 8 meilleurs 3e (sur 12) se qualifient pour les 1/32e · Critères : Points → Diff. buts → Buts marqués → Points FIFA
              </p>
            </div>
            <ThirdPlaceTable thirds={thirdPlaced} />
          </div>
        )}

        {/* ─ Bracket ─ */}
        {activeTab === "bracket" && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-black text-stone-800">Tableau des éliminations</h2>
              <p className="text-stone-500 text-sm mt-1">1/32e → 1/16e → Quarts → Demies → Finale</p>
            </div>
            <KnockoutBracket bracket={bracket} />
          </div>
        )}

        {/* ─ Classement FIFA ─ */}
        {activeTab === "fifa" && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-black text-stone-800">Classement FIFA</h2>
              <p className="text-stone-500 text-sm mt-1">Mis à jour après chaque résultat saisi</p>
            </div>
            <FifaTable rankings={fifaRankings} />
          </div>
        )}

        {/* ─ Simulateur ─ */}
        {activeTab === "simulator" && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-black text-stone-800">Simulateur de points FIFA</h2>
              <p className="text-stone-500 text-sm mt-1">
                Teste l'impact d'un résultat avant qu'il n'arrive · les points de départ sont pré-remplis depuis le classement mais restent modifiables pour rester à jour
              </p>
            </div>
            <FifaSimulator teams={teams} />
          </div>
        )}
      </main>
    </div>
  );
}

// ── Sous-composants ───────────────────────────────────────────────────────────

function Stat({
  value,
  label,
  total,
}: {
  value: number;
  label: string;
  total?: number;
}) {
  return (
    <div className="text-right">
      <div className="text-2xl font-black text-white leading-none">
        {value}
        {total !== undefined && (
          <span className="text-stone-500 text-base font-normal"> / {total}</span>
        )}
      </div>
      <div className="text-[11px] text-stone-400 font-medium mt-0.5">{label}</div>
    </div>
  );
}

function NextMatchBanner({
  matches,
  teams,
}: {
  matches: Match[];
  teams: Map<string, Team>;
}) {
  const next = [...matches]
    .filter((m) => m.homeGoals === null && m.awayGoals === null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  if (!next) return null;

  const home = teams.get(next.homeTeam);
  const away = teams.get(next.awayTeam);

  return (
    <div className="mt-5 flex items-center gap-4 bg-stone-800 rounded-2xl px-5 py-3.5 border border-stone-700">
      <span className="text-[10.5px] font-bold uppercase tracking-wider text-amber-400 shrink-0">
        Prochain match
      </span>
      <div className="flex w-full items-center justify-center gap-3">
        {home?.flagUrl && (
          <img src={home.flagUrl} alt={home.teamName} className="w-6 h-4 object-cover rounded-sm" />
        )}
        <span className="text-white font-bold text-sm">{home?.teamName ?? next.homeTeam}</span>
        <span className="text-stone-500 font-bold">vs</span>
        <span className="text-white font-bold text-sm">{away?.teamName ?? next.awayTeam}</span>
        {away?.flagUrl && (
          <img src={away.flagUrl} alt={away.teamName} className="w-6 h-4 object-cover rounded-sm" />
        )}
      </div>
      <span className="ml-auto text-stone-400 text-xs flex-shrink-0">
        {new Date(next.date).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </div>
  );
}

function ThirdPlaceTable({
  thirds,
}: {
  thirds: ReturnType<typeof computeAllThirdPlaced>;
}) {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
      <div className="flex items-center px-5 py-3 bg-stone-50 border-b border-stone-100 text-[10.5px] font-bold uppercase tracking-wider text-stone-400">
        <span className="w-8 text-center">Rang</span>
        <span className="w-12 text-center">Groupe</span>
        <span className="flex-1">Équipe</span>
        <span className="w-10 text-center">MJ</span>
        <span className="w-10 text-center">Diff</span>
        <span className="w-10 text-center">BP</span>
        <span className="w-10 text-center">Pts</span>
        <span className="w-24 text-right">Statut</span>
      </div>

      {thirds.map((entry, idx) => (
        <div
          key={entry.standing.team.teamCode}
          className={`flex items-center px-5 py-3 border-b border-stone-50 last:border-b-0 ${
            entry.qualified ? "bg-amber-50/30" : ""
          }`}
        >
          <span className="w-8 text-center font-bold text-stone-400 text-sm">{idx + 1}</span>
          <span className="w-12 text-center">
            <span className="w-6 h-6 rounded bg-stone-800 text-amber-400 flex items-center justify-center font-black text-xs mx-auto">
              {entry.group}
            </span>
          </span>
          <span className="flex-1 flex items-center gap-2.5">
            <img
              src={entry.standing.team.flagUrl}
              alt={entry.standing.team.teamName}
              className="w-6 h-4 object-cover rounded-sm"
              loading="lazy"
            />
            <span className="font-semibold text-sm text-stone-800">
              {entry.standing.team.teamName}
            </span>
          </span>
          <span className="w-10 text-center text-sm text-stone-500">{entry.standing.played}</span>
          <span className="w-10 text-center text-sm text-stone-500">
            {entry.standing.goalDiff > 0
              ? `+${entry.standing.goalDiff}`
              : entry.standing.goalDiff}
          </span>
          <span className="w-10 text-center text-sm text-stone-500">{entry.standing.goalsFor}</span>
          <span className="w-10 text-center font-black text-stone-800">{entry.standing.points}</span>
          <span className="w-24 text-right">
            {entry.qualified ? (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                Qualifié
              </span>
            ) : entry.standing.played < 3 ? (
              <span className="text-[10px] text-stone-300">En cours</span>
            ) : (
              <span className="text-[10px] text-stone-300">Éliminé</span>
            )}
          </span>
        </div>
      ))}

      {thirds.length === 0 && (
        <div className="text-center py-12 text-stone-400 text-sm">
          Aucun résultat de groupe disponible.
        </div>
      )}
    </div>
  );
}