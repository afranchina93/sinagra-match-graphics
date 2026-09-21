import { useState, useCallback, useRef } from 'react';
import { AppIcon } from '../ui/AppIcon';
import type { Player, PlayerMatchStat, MatchScoutNotes, MatchView } from '../../domain/types';
import { upsertPlayerMatchStat, saveScoutNotes } from '../../storage/db';
import { FORMATIONS } from '../../domain/types';

interface ScoutFormProps {
  matchId: string;
  view: MatchView;
  players: Player[];
  stats: Record<string, PlayerMatchStat>;
  notes: MatchScoutNotes;
  onStatsChange: (stats: Record<string, PlayerMatchStat>) => void;
  onNotesChange: (notes: MatchScoutNotes) => void;
}

const STAT_COLS: { key: keyof Omit<PlayerMatchStat, 'playerId' | 'playerName' | 'playerNumber'>; label: string; title: string }[] = [
  { key: 'tiriF',      label: 'TF',  title: 'Tiri Fuori' },
  { key: 'tiriP',      label: 'TP',  title: 'Tiri in Porta' },
  { key: 'crossF',     label: 'CF',  title: 'Cross dal Fondo' },
  { key: 'chiusure',   label: 'CD',  title: 'Chiusure Difensive' },
  { key: 'pallePerse', label: 'PP',  title: 'Palle Perse' },
  { key: 'palleRecup', label: 'PR',  title: 'Palle Recuperate' },
  { key: 'assist',     label: 'A',   title: 'Assist' },
  { key: 'gol',        label: 'G',   title: 'Gol' },
];

function StatCell({
  value,
  onIncrement,
  onDecrement,
}: {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <td className="px-0 py-0">
      <div className="flex flex-col items-center justify-center w-[52px] h-[44px] gap-0">
        <button
          onPointerDown={e => { e.preventDefault(); onIncrement(); }}
          className="flex-1 w-full flex items-center justify-center text-[14px] font-condensed font-bold text-app-text active:bg-app-signal/20 select-none touch-manipulation"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {value > 0 ? (
            <span className={value > 0 ? 'text-app-signal' : 'text-app-dim'}>{value}</span>
          ) : (
            <span className="text-app-dim/30">·</span>
          )}
        </button>
        {value > 0 && (
          <button
            onPointerDown={e => { e.preventDefault(); onDecrement(); }}
            className="w-full flex items-center justify-center h-[14px] text-app-dim hover:text-red-400 active:text-red-400 select-none touch-manipulation"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <span className="text-[9px] leading-none">−</span>
          </button>
        )}
      </div>
    </td>
  );
}

function CounterPill({
  label, value, onInc, onDec,
}: { label: string; value: number; onInc: () => void; onDec: () => void }) {
  return (
    <div className="flex items-center gap-2 bg-app-surface border border-white/10 rounded-lg px-3 py-2">
      <span className="text-[9px] uppercase tracking-[0.14em] text-app-muted w-16">{label}</span>
      <button onPointerDown={e => { e.preventDefault(); onDec(); }}
        className="w-7 h-7 rounded-md bg-app-raised border border-white/10 flex items-center justify-center text-app-muted hover:text-app-text text-lg leading-none select-none touch-manipulation"
        style={{ WebkitTapHighlightColor: 'transparent' }}>−</button>
      <span className="font-condensed font-black text-[18px] text-app-signal w-8 text-center tabular-nums">{value}</span>
      <button onPointerDown={e => { e.preventDefault(); onInc(); }}
        className="w-7 h-7 rounded-md bg-app-raised border border-white/10 flex items-center justify-center text-app-muted hover:text-app-text text-lg leading-none select-none touch-manipulation"
        style={{ WebkitTapHighlightColor: 'transparent' }}>+</button>
    </div>
  );
}

export function ScoutForm({ matchId, view, players, stats, notes, onStatsChange, onNotesChange }: ScoutFormProps) {
  const [showNotes, setShowNotes] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playerMap = Object.fromEntries(players.map(p => [p.id, p]));
  const starterIds = Object.values(view.starters).filter(Boolean);
  const allIds = [...new Set([...starterIds, ...view.bench])];

  // Ensure all lineup players exist in stats map
  const fullStats: Record<string, PlayerMatchStat> = { ...stats };
  for (const id of allIds) {
    if (!fullStats[id]) {
      const p = playerMap[id];
      if (p) {
        fullStats[id] = {
          playerId: id,
          playerName: p.lastName.toUpperCase(),
          playerNumber: p.number,
          tiriF: 0, tiriP: 0, crossF: 0, chiusure: 0,
          pallePerse: 0, palleRecup: 0, assist: 0, gol: 0,
        };
      }
    }
  }

  function debouncedSave(updated: Record<string, PlayerMatchStat>, playerId: string) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const s = updated[playerId];
      if (s) upsertPlayerMatchStat(matchId, s);
    }, 600);
  }

  const updateStat = useCallback((
    playerId: string,
    key: keyof PlayerMatchStat,
    delta: number,
  ) => {
    const current = fullStats[playerId];
    if (!current) return;
    const val = Math.max(0, ((current[key] as number) ?? 0) + delta);
    const updated = {
      ...fullStats,
      [playerId]: { ...current, [key]: val },
    };
    onStatsChange(updated);
    debouncedSave(updated, playerId);
  }, [fullStats, matchId]);

  function updateNotes(patch: Partial<MatchScoutNotes>) {
    const updated = { ...notes, ...patch };
    onNotesChange(updated);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveScoutNotes(matchId, updated), 800);
  }

  const inputCls = 'w-full bg-app-surface border border-white/10 text-app-text text-[13px] rounded-md px-3 py-2.5 focus:outline-none focus:border-app-signal/60 transition-colors';
  const labelCls = 'block text-[9px] uppercase tracking-[0.14em] text-app-muted mb-1.5';

  if (allIds.length === 0) {
    return (
      <div className="space-y-5">
        <h2 className="font-condensed text-[15px] font-bold uppercase text-app-text border-b border-white/10 pb-2">
          Scout Gara
        </h2>
        <p className="text-[12px] text-app-dim text-center py-8">
          Seleziona prima la formazione nel tab Formazione per abilitare lo scout.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-condensed text-[15px] font-bold uppercase text-app-text border-b border-white/10 pb-2">
        Scout Gara
      </h2>

      {/* Note tattiche (collassabile) */}
      <div className="border border-white/10 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowNotes(s => !s)}
          className="w-full flex items-center justify-between px-3 py-3 text-[12px] font-semibold text-app-muted uppercase tracking-[0.06em] hover:bg-app-surface transition-colors"
        >
          Note Tattiche & Angoli
          <AppIcon name="chevron-down" size={14} className={`transition-transform ${showNotes ? 'rotate-180' : ''}`} />
        </button>

        {showNotes && (
          <div className="px-3 pb-4 pt-3 space-y-4 border-t border-white/10">
            {/* Angoli */}
            <div>
              <p className={labelCls}>Angoli</p>
              <div className="flex flex-col gap-2">
                <CounterPill
                  label="Sinagra"
                  value={notes.cornersHome}
                  onInc={() => updateNotes({ cornersHome: notes.cornersHome + 1 })}
                  onDec={() => updateNotes({ cornersHome: Math.max(0, notes.cornersHome - 1) })}
                />
                <CounterPill
                  label="Avversario"
                  value={notes.cornersAway}
                  onInc={() => updateNotes({ cornersAway: notes.cornersAway + 1 })}
                  onDec={() => updateNotes({ cornersAway: Math.max(0, notes.cornersAway - 1) })}
                />
              </div>
            </div>

            {/* Formazione avversaria */}
            <div>
              <label className={labelCls}>Modulo Avversario</label>
              <select className={inputCls} value={notes.opponentFormation}
                onChange={e => updateNotes({ opponentFormation: e.target.value })}>
                <option value="">— Non specificato —</option>
                {FORMATIONS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Note Sinagra</label>
                <textarea
                  className={inputCls + ' resize-none'}
                  rows={3}
                  placeholder="Osservazioni tattiche..."
                  value={notes.sinagraNotes}
                  onChange={e => updateNotes({ sinagraNotes: e.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Note Avversario</label>
                <textarea
                  className={inputCls + ' resize-none'}
                  rows={3}
                  placeholder="Punti di forza/debolezza..."
                  value={notes.opponentNotes}
                  onChange={e => updateNotes({ opponentNotes: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legenda colonne */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 px-1">
        {STAT_COLS.map(c => (
          <span key={c.key} className="text-[9px] text-app-dim font-mono">
            <span className="text-app-muted font-bold">{c.label}</span> {c.title}
          </span>
        ))}
      </div>

      {/* Tabella stats — scrollabile orizzontalmente */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="inline-block min-w-full">
          <table className="border-collapse" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr className="border-b border-white/10">
                <th className="sticky left-0 z-10 bg-app-canvas text-left px-2 py-2 w-[96px]">
                  <span className="text-[9px] uppercase tracking-[0.14em] text-app-dim">Giocatore</span>
                </th>
                {STAT_COLS.map(c => (
                  <th key={c.key} className="px-0 py-2 w-[52px]">
                    <span className="text-[9px] uppercase tracking-[0.1em] text-app-muted font-bold block text-center">{c.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Titolari */}
              {starterIds.length > 0 && (
                <>
                  <tr>
                    <td colSpan={STAT_COLS.length + 1} className="sticky left-0 pt-3 pb-1 px-2">
                      <span className="text-[9px] uppercase tracking-[0.14em] text-app-dim">Titolari</span>
                    </td>
                  </tr>
                  {starterIds.map(id => {
                    const s = fullStats[id];
                    if (!s) return null;
                    return (
                      <PlayerStatRow
                        key={id}
                        stat={s}
                        onIncrement={key => updateStat(id, key, +1)}
                        onDecrement={key => updateStat(id, key, -1)}
                      />
                    );
                  })}
                </>
              )}

              {/* Panchina */}
              {view.bench.length > 0 && (
                <>
                  <tr>
                    <td colSpan={STAT_COLS.length + 1} className="sticky left-0 pt-4 pb-1 px-2 border-t border-white/8">
                      <span className="text-[9px] uppercase tracking-[0.14em] text-app-dim">Panchina</span>
                    </td>
                  </tr>
                  {view.bench.map(id => {
                    const s = fullStats[id];
                    if (!s) return null;
                    return (
                      <PlayerStatRow
                        key={id}
                        stat={s}
                        onIncrement={key => updateStat(id, key, +1)}
                        onDecrement={key => updateStat(id, key, -1)}
                        dimmed
                      />
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] text-app-dim text-center">
        Tocca un valore per incrementare · il − sotto per decrementare
      </p>
    </div>
  );
}

function PlayerStatRow({
  stat, onIncrement, onDecrement, dimmed,
}: {
  stat: PlayerMatchStat;
  onIncrement: (key: keyof PlayerMatchStat) => void;
  onDecrement: (key: keyof PlayerMatchStat) => void;
  dimmed?: boolean;
}) {
  return (
    <tr className="border-b border-white/5">
      <td className="sticky left-0 z-10 bg-app-canvas px-2 py-0 w-[96px]">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-bold tabular-nums w-5 shrink-0 ${dimmed ? 'text-app-dim' : 'text-app-signal'}`}>
            {stat.playerNumber}
          </span>
          <span className={`text-[11px] font-semibold truncate ${dimmed ? 'text-app-muted' : 'text-app-text'}`}>
            {stat.playerName.length > 7 ? stat.playerName.slice(0, 7) + '…' : stat.playerName}
          </span>
        </div>
      </td>
      {STAT_COLS.map(c => (
        <StatCell
          key={c.key}
          value={(stat[c.key] as number) ?? 0}
          onIncrement={() => onIncrement(c.key)}
          onDecrement={() => onDecrement(c.key)}
        />
      ))}
    </tr>
  );
}
