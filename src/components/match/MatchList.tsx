import { AppIcon } from '../ui/AppIcon';
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
        className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] bg-app-signal text-[#111710] text-[13px] font-bold rounded-md transition-colors hover:bg-[#f0ff66] uppercase tracking-[0.04em]"
      >
        <AppIcon name="plus" size={14} />
        Nuova partita
      </button>

      {matches.length === 0 && (
        <p className="text-[12px] text-app-dim text-center py-6">
          Nessuna partita ancora creata
        </p>
      )}

      <div className="space-y-2">
        {matches.map((m) => {
          const opponent = m.opponentId ? teamMap[m.opponentId] : null;
          const comp = m.competitionId ? compMap[m.competitionId] : null;
          const isActive = m.id === currentMatchId;

          return (
            <div
              key={m.id}
              className={`group flex items-center gap-3 rounded-lg px-3 py-3 cursor-pointer transition-colors ${
                isActive
                  ? 'bg-app-signal/10 border border-app-signal/30'
                  : 'bg-app-surface border border-white/10 hover:border-white/20'
              }`}
              onClick={() => onSelect(m.id)}
            >
              <AppIcon
                name="chevron-right"
                size={14}
                className={isActive ? 'text-app-signal shrink-0' : 'text-app-dim shrink-0'}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-[13px] font-bold truncate ${
                      isActive ? 'text-app-signal' : 'text-app-text'
                    }`}
                  >
                    {opponent?.name ?? '— Avversario —'}
                  </span>
                  <span className="text-[11px] text-app-dim shrink-0">
                    {m.isHome ? 'Casa' : 'Trasferta'}
                  </span>
                </div>
                <div className="text-[11px] text-app-muted truncate mt-0.5">
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
                className="shrink-0 text-app-dim hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <AppIcon name="trash" size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
