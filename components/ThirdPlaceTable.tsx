
import { computeAllThirdPlaced } from "@/lib/third-place";
export function ThirdPlaceTable({
  thirds,
}: {
  thirds: ReturnType<typeof computeAllThirdPlaced>;
}) {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
      <div className="flex items-center px-5 py-3 bg-stone-50 border-b border-stone-100 text-[10.5px] font-bold uppercase tracking-wider text-stone-400">
        <span className="w-8 text-center">Rang</span>
        <span className="w-12 text-center">Groupe</span>
        <span className="flex-1 min-w-0">Équipe</span>
        <span className="w-8 text-center">Pts</span>
        <span className="w-8 text-center">MJ</span>
        <span className="w-8 text-center">Diff</span>
        <span className="w-8 text-center hidden sm:block">BP</span>        
        <span className="w-16 text-right">Statut</span>
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
          <span className="flex-1 min-w-0 flex items-center gap-2.5">
            <img
              src={entry.standing.team.flagUrl}
              alt={entry.standing.team.teamName}
              className="w-6 h-4 object-cover rounded-sm"
              loading="lazy"
            />
            <span className="font-semibold text-sm text-stone-800 hidden sm:inline-block truncate leading-none py-1">
              {entry.standing.team.teamName}
            </span>
            <span className="font-semibold text-sm text-stone-800 block sm:hidden">
              {entry.standing.team.teamCode}
            </span>
          </span>
          <span className="w-8 text-center font-black text-stone-800">{entry.standing.points}</span>
          <span className="w-8 text-center text-sm text-stone-500">{entry.standing.played}</span>
          <span className="w-8 text-center text-sm text-stone-500">
            {entry.standing.goalDiff > 0
              ? `+${entry.standing.goalDiff}`
              : entry.standing.goalDiff}
          </span>
          <span className="w-10 text-center text-sm text-stone-500 hidden sm:block">{entry.standing.goalsFor}</span>
          
          <span className="w-16 text-right">
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