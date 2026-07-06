import { Match, Team } from "@/lib/data";

export function NextMatchBanner({
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
    <div className="mt-5 flex sm:flex-row flex-col items-center gap-4 bg-stone-800 rounded-2xl px-5 py-3.5 border border-stone-700">
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
      <span className=" text-stone-400 text-xs shrink-0">
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