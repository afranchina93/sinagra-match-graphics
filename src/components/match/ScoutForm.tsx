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

const STAT_COLS: { key: keyof Omit<PlayerMatchStat, 'playerId' | 'playerName' | 'playerNumber' | 'tracked'>; label: string; title: string }[] = [
  { key: 'tiriF',      label: 'TF',  title: 'Tiri Fuori' },
  { key: 'tiriP',      label: 'TP',  title: 'Tiri in Porta' },
  { key: 'crossF',     label: 'CF',  title: 'Cross dal Fondo' },
  { key: 'chiusure',   label: 'CD',  title: 'Chiusure Difensive' },
  { key: 'pallePerse', label: 'PP',  title: 'Palle Perse' },
  { key: 'palleRecup', label: 'PR',  title: 'Palle Recuperate' },
  { key: 'assist',     label: 'A',   title: 'Assist' },
  { key: 'gol',        label: 'G',   title: 'Gol' },
];

// ── Contatore angoli ──────────────────────────────────────────────────────────

function CounterPill({
  label, value, onInc, onDec,
}: { label: string; value: number; onInc: () => void; onDec: () => void }) {
  return (
    <div className="flex items-center gap-2 bg-app-surface border border-white/10 rounded-lg px-3 py-2">
      <span className="text-[9px] uppercase tracking-[0.14em] text-app-muted w-16">{label}</span>
      <button
        onClick={onDec}
        className="w-8 h-8 rounded-md bg-app-raised border border-white/10 flex items-center justify-center text-app-muted hover:text-app-text text-lg leading-none select-none touch-manipulation"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >−</button>
      <span className="font-condensed font-black text-[18px] text-app-signal w-8 text-center tabular-nums">{value}</span>
      <button
        onClick={onInc}
        className="w-8 h-8 rounded-md bg-app-raised border border-white/10 flex items-center justify-center text-app-muted hover:text-app-text text-lg leading-none select-none touch-manipulation"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >+</button>
    </div>
  );
}

// ── Modal per giocatore ───────────────────────────────────────────────────────

function PlayerModal({
  stat,
  onClose,
  onToggleTracked,
  onUpdate,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  stat: PlayerMatchStat;
  onClose: () => void;
  onToggleTracked: () => void;
  onUpdate: (key: keyof PlayerMatchStat, delta: number) => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-app-surface border-t border-white/10 rounded-t-2xl max-h-[80vh] overflow-y-auto pb-safe">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="font-condensed text-[22px] font-black text-app-signal">{stat.playerNumber}</span>
            <span className="font-condensed text-[17px] font-bold text-app-text uppercase">{stat.playerName}</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Tracked toggle */}
            <button
              onClick={onToggleTracked}
              className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-full border transition-colors touch-manipulation ${
                stat.tracked
                  ? 'bg-app-signal/15 border-app-signal/40 text-app-signal'
                  : 'bg-white/5 border-white/15 text-app-dim'
              }`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${stat.tracked ? 'bg-app-signal' : 'bg-app-dim/40'}`} />
              {stat.tracked ? 'Tracciato' : 'Non tracciato'}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-app-muted hover:text-app-text transition-colors touch-manipulation"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <AppIcon name="close" size={16} />
            </button>
          </div>
        </div>

        {/* Stats grid */}
        <div className="px-4 py-4 space-y-2">
          {!stat.tracked && (
            <p className="text-[11px] text-app-dim text-center pb-2">
              Attiva il tracciamento per registrare le statistiche
            </p>
          )}
          {STAT_COLS.map(col => (
            <div
              key={col.key}
              className={`flex items-center justify-between gap-3 bg-app-raised border border-white/8 rounded-lg px-4 py-2 transition-opacity ${!stat.tracked ? 'opacity-30 pointer-events-none' : ''}`}
            >
              <div className="flex-1">
                <span className="text-[12px] font-semibold text-app-text">{col.title}</span>
                <span className="ml-1.5 text-[9px] text-app-dim uppercase">{col.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { if ((stat[col.key] as number) > 0) onUpdate(col.key, -1); }}
                  disabled={(stat[col.key] as number) === 0}
                  className="w-10 h-10 rounded-xl bg-app-surface border border-white/10 flex items-center justify-center text-[20px] font-bold text-app-muted disabled:opacity-20 active:bg-red-400/20 active:text-red-300 transition-colors touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >−</button>
                <span className={`font-condensed text-[22px] font-black w-8 text-center tabular-nums ${(stat[col.key] as number) > 0 ? 'text-app-signal' : 'text-app-dim/40'}`}>
                  {stat[col.key] as number}
                </span>
                <button
                  onClick={() => onUpdate(col.key, +1)}
                  className="w-10 h-10 rounded-xl bg-app-surface border border-white/10 flex items-center justify-center text-[20px] font-bold text-app-muted active:bg-app-signal/20 active:text-app-signal transition-colors touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >+</button>
              </div>
            </div>
          ))}
        </div>

        {/* Prev / Next navigation */}
        <div className="flex items-center justify-between px-4 pb-6 pt-2 gap-3">
          <button
            onClick={onPrev}
            disabled={!hasPrev}
            className="flex-1 h-11 flex items-center justify-center gap-1.5 rounded-xl bg-app-raised border border-white/10 text-[12px] font-semibold text-app-muted disabled:opacity-25 active:bg-white/5 transition-colors touch-manipulation"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <AppIcon name="arrow-left" size={13} />
            Precedente
          </button>
          <button
            onClick={onNext}
            disabled={!hasNext}
            className="flex-1 h-11 flex items-center justify-center gap-1.5 rounded-xl bg-app-raised border border-white/10 text-[12px] font-semibold text-app-muted disabled:opacity-25 active:bg-white/5 transition-colors touch-manipulation"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            Successivo
            <AppIcon name="arrow-left" size={13} className="rotate-180" />
          </button>
        </div>
      </div>
    </>
  );
}

// ── Riga tabella (read-only overview) ────────────────────────────────────────

function PlayerRow({
  stat,
  player,
  onOpen,
  dimmed,
}: {
  stat: PlayerMatchStat;
  player?: Player;
  onOpen: () => void;
  dimmed?: boolean;
}) {
  const total = STAT_COLS.reduce((acc, c) => acc + ((stat[c.key] as number) ?? 0), 0);

  return (
    <tr
      className={`border-b border-white/5 active:bg-white/5 transition-colors cursor-pointer ${!stat.tracked ? 'opacity-40' : ''}`}
      onClick={onOpen}
    >
      {/* Nome — sticky */}
      <td className="sticky left-0 z-10 bg-app-canvas px-2 py-0 w-[110px] border-r border-white/5">
        <div className="flex items-center gap-1.5 h-[44px]">
          <span className={`w-2 h-2 rounded-full shrink-0 ${stat.tracked ? 'bg-app-signal' : 'bg-app-dim/30 border border-white/15'}`} />
          <span className={`text-[10px] font-bold tabular-nums shrink-0 ${dimmed ? 'text-app-dim' : 'text-app-muted'}`}>
            {stat.playerNumber}
          </span>
          <div className="flex flex-col min-w-0">
            <span className={`text-[11px] font-semibold truncate leading-tight ${dimmed ? 'text-app-muted/70' : 'text-app-text'}`}>
              {player ? player.lastName : stat.playerName}
            </span>
            {player?.firstName && (
              <span className={`text-[9px] truncate leading-tight ${dimmed ? 'text-app-dim/60' : 'text-app-muted'}`}>
                {player.firstName}
              </span>
            )}
          </div>
        </div>
      </td>

      {/* Stats: valori compatti, solo lettura */}
      {STAT_COLS.map(c => {
        const v = (stat[c.key] as number) ?? 0;
        return (
          <td key={c.key} className="px-1 py-0 w-[46px] text-center border-r border-white/5">
            <span className={`text-[13px] font-condensed font-bold ${v > 0 ? 'text-app-signal' : 'text-app-dim/25'}`}>
              {v > 0 ? v : '·'}
            </span>
          </td>
        );
      })}

      {/* Total + chevron */}
      <td className="pr-2 pl-1 py-0 w-[36px]">
        <div className="flex items-center gap-1 justify-end">
          {total > 0 && (
            <span className="text-[10px] text-app-muted tabular-nums">{total}</span>
          )}
          <AppIcon name="chevron-down" size={10} className="text-app-dim/40 -rotate-90" />
        </div>
      </td>
    </tr>
  );
}

// ── ScoutForm principale ──────────────────────────────────────────────────────

export function ScoutForm({ matchId, view, players, stats, notes, onStatsChange, onNotesChange }: ScoutFormProps) {
  const [showNotes, setShowNotes] = useState(false);
  const [openPlayerId, setOpenPlayerId] = useState<string | null>(null);

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
          playerName: `${p.lastName} ${p.firstName}`.toUpperCase(),
          playerNumber: p.number,
          tracked: false,
          tiriF: 0, tiriP: 0, crossF: 0, chiusure: 0,
          pallePerse: 0, palleRecup: 0, assist: 0, gol: 0,
        };
      }
    }
  }

  const toggleTracked = useCallback((playerId: string) => {
    const current = fullStats[playerId];
    if (!current) return;
    const next = { ...current, tracked: !current.tracked };
    onStatsChange({ ...fullStats, [playerId]: next });
    upsertPlayerMatchStat(matchId, next).catch(console.error);
  }, [fullStats, matchId]);

  const updateStat = useCallback((
    playerId: string,
    key: keyof PlayerMatchStat,
    delta: number,
  ) => {
    const current = fullStats[playerId];
    if (!current || !current.tracked) return;
    const val = Math.max(0, ((current[key] as number) ?? 0) + delta);
    const next = { ...current, [key]: val };
    onStatsChange({ ...fullStats, [playerId]: next });
    // Salva immediatamente — nessun debounce per evitare perdita dati su refresh
    upsertPlayerMatchStat(matchId, next).catch(console.error);
  }, [fullStats, matchId]);

  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function updateNotes(patch: Partial<MatchScoutNotes>) {
    const updated = { ...notes, ...patch };
    onNotesChange(updated);
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(() => saveScoutNotes(matchId, updated), 800);
  }

  const inputCls = 'w-full bg-app-surface border border-white/10 text-app-text text-[13px] rounded-md px-3 py-2.5 focus:outline-none focus:border-app-signal/60 transition-colors';
  const labelCls = 'block text-[9px] uppercase tracking-[0.14em] text-app-muted mb-1.5';

  // Navigazione prev/next nel modal
  const openIdx = allIds.indexOf(openPlayerId ?? '');
  const openStat = openPlayerId ? fullStats[openPlayerId] : null;

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
    <>
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

        {/* Tabella overview — read-only, tap riga per aprire modal */}
        <div className="overflow-x-auto -mx-4 px-4">
          <div className="inline-block min-w-full">
            <table className="border-collapse" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr className="border-b border-white/10">
                  <th className="sticky left-0 z-10 bg-app-canvas text-left px-2 py-2 w-[110px] border-r border-white/5">
                    <span className="text-[9px] uppercase tracking-[0.14em] text-app-dim">Giocatore</span>
                  </th>
                  {STAT_COLS.map(c => (
                    <th key={c.key} className="px-1 py-2 w-[46px] border-r border-white/5">
                      <span className="text-[9px] uppercase tracking-[0.08em] text-app-muted font-bold block text-center leading-tight">{c.title}</span>
                    </th>
                  ))}
                  <th className="w-[36px]" />
                </tr>
              </thead>
              <tbody>
                {/* Titolari */}
                {starterIds.length > 0 && (
                  <>
                    <tr>
                      <td colSpan={STAT_COLS.length + 2} className="sticky left-0 pt-3 pb-1 px-2">
                        <span className="text-[9px] uppercase tracking-[0.14em] text-app-dim">Titolari</span>
                      </td>
                    </tr>
                    {starterIds.map(id => {
                      const s = fullStats[id];
                      if (!s) return null;
                      return (
                        <PlayerRow
                          key={id}
                          stat={s}
                          player={playerMap[id]}
                          onOpen={() => setOpenPlayerId(id)}
                        />
                      );
                    })}
                  </>
                )}

                {/* Panchina */}
                {view.bench.length > 0 && (
                  <>
                    <tr>
                      <td colSpan={STAT_COLS.length + 2} className="sticky left-0 pt-4 pb-1 px-2 border-t border-white/8">
                        <span className="text-[9px] uppercase tracking-[0.14em] text-app-dim">Panchina</span>
                      </td>
                    </tr>
                    {view.bench.map(id => {
                      const s = fullStats[id];
                      if (!s) return null;
                      return (
                        <PlayerRow
                          key={id}
                          stat={s}
                          player={playerMap[id]}
                          onOpen={() => setOpenPlayerId(id)}
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
          Tocca il nome di un giocatore per registrare le statistiche
        </p>
      </div>

      {/* Modal giocatore */}
      {openPlayerId && openStat && (
        <PlayerModal
          stat={openStat}
          onClose={() => setOpenPlayerId(null)}
          onToggleTracked={() => toggleTracked(openPlayerId)}
          onUpdate={(key, delta) => updateStat(openPlayerId, key, delta)}
          onPrev={() => {
            if (openIdx > 0) setOpenPlayerId(allIds[openIdx - 1]);
          }}
          onNext={() => {
            if (openIdx < allIds.length - 1) setOpenPlayerId(allIds[openIdx + 1]);
          }}
          hasPrev={openIdx > 0}
          hasNext={openIdx < allIds.length - 1}
        />
      )}
    </>
  );
}
