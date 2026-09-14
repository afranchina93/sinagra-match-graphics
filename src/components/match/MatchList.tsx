import { Plus, Trash2, ChevronRight } from 'lucide-react';
import type { Match, Team, Competition } from '../../domain/types';

interface MatchListProps {
  matches: Match[];
  teams: Team[];
  competitions: Competition[];
  currentMatchId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Data da definire';
  try {
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function MatchList({
  matches,
  teams,
  competitions,
  currentMatchId,
  onSelect,
  onCreate,
  onDelete,
}: MatchListProps) {
  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t]));
  const compMap = Object.fromEntries(competitions.map((c) => [c.id, c]));

  return (
    <div className="space-y-3">
      <button
        onClick={onCreate}
        className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 text-sm font-black py-2.5 rounded transition-colors uppercase tracking-wide"
      >
        <Plus size={14} />
        Nuova partita
      </button>

      {matches.length === 0 && (
        <p className="text-xs text-gray-500 text-center py-4">
          Nessuna partita ancora creata
        </p>
      )}

      <div className="space-y-1.5">
        {matches.map((m) => {
          const opponent = m.opponentId ? teamMap[m.opponentId] : null;
          const comp = m.competitionId ? compMap[m.competitionId] : null;
          const isActive = m.id === currentMatchId;

          return (
            <div
              key={m.id}
              className={`group flex items-center gap-2 rounded px-2 py-2 cursor-pointer transition-colors ${
                isActive
                  ? 'bg-yellow-400/10 border border-yellow-400/40'
                  : 'hover:bg-gray-800 border border-transparent'
              }`}
              onClick={() => onSelect(m.id)}
            >
              <ChevronRight
                size={12}
                className={isActive ? 'text-yellow-400' : 'text-gray-600'}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={`text-xs font-bold truncate ${
                      isActive ? 'text-yellow-400' : 'text-white'
                    }`}
                  >
                    {opponent?.name ?? '— Avversario —'}
                  </span>
                  <span className="text-xs text-gray-500 shrink-0">
                    {m.isHome ? 'Casa' : 'Trasferta'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {formatDate(m.matchDate)}
                  {comp ? ` · ${comp.name}` : ''}
                  {m.matchday ? ` · ${m.matchday}` : ''}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(m.id);
                }}
                className="shrink-0 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
