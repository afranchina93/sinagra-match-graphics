import { useEffect, useState } from 'react';
import { AppIcon } from '../ui/AppIcon';
import type { Player, MatchView, PlayerMatchStat } from '../../domain/types';
import { loadMatchView, loadMatchScout } from '../../storage/db';
import { PitchView } from './PitchView';

interface CoachMatchDetailProps {
  matchId: string;
  players: Player[];
  onBack: () => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function CoachMatchDetail({ matchId, players, onBack }: CoachMatchDetailProps) {
  const [view, setView] = useState<MatchView | null>(null);
  const [scoutStats, setScoutStats] = useState<Record<string, PlayerMatchStat>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadMatchView(matchId),
      loadMatchScout(matchId),
    ]).then(([v, scout]) => {
      setView(v);
      setScoutStats(scout.stats);
    }).catch(console.error).finally(() => setLoading(false));
  }, [matchId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <AppIcon name="spinner" size={24} className="animate-spin text-app-signal" />
      </div>
    );
  }

  if (!view) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[12px] text-app-muted hover:text-app-text transition-colors">
          <AppIcon name="arrow-left" size={14} />
          Indietro
        </button>
        <p className="text-[12px] text-app-dim text-center py-8">Partita non trovata.</p>
      </div>
    );
  }

  const { match, opponent, starters, bench, goals } = view;
  const homeTeam = match.isHome ? 'Sinagra' : (opponent?.name ?? '?');
  const awayTeam = match.isHome ? (opponent?.name ?? '?') : 'Sinagra';
  const playerMap = new Map(players.map(p => [p.id, p]));

  const benchPlayers = bench.map(id => playerMap.get(id)).filter(Boolean) as Player[];
  const trackedStats = Object.values(scoutStats).filter(s =>
    s.tracked || s.tiriF > 0 || s.tiriP > 0 || s.crossF > 0 || s.chiusure > 0 ||
    s.pallePerse > 0 || s.palleRecup > 0 || s.assist > 0 || s.gol > 0
  );

  return (
    <div className="space-y-5">
      {/* Back */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[12px] text-app-muted hover:text-app-text transition-colors"
      >
        <AppIcon name="arrow-left" size={14} />
        Partite
      </button>

      {/* Header */}
      <div className="bg-app-surface border border-white/10 rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-app-muted">{formatDate(match.matchDate)}</span>
          <span className="text-[11px] font-bold text-app-muted uppercase tracking-widest border border-white/20 rounded px-2 py-0.5">
            {match.formation}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-condensed text-[15px] font-bold text-app-text truncate">
            {homeTeam} vs {awayTeam}
          </span>
          <span className="font-condensed text-2xl font-black text-app-signal shrink-0">
            {match.homeGoals}–{match.awayGoals}
          </span>
        </div>
      </div>

      {/* Pitch */}
      <div>
        <h3 className="font-condensed text-[13px] font-bold uppercase text-app-text border-b border-white/10 pb-2 mb-3">
          Campo
        </h3>
        <div className="max-w-[260px] mx-auto rounded-lg overflow-hidden">
          <PitchView formation={match.formation} starters={starters} players={players} numberOverrides={match.numberOverrides} />
        </div>
      </div>

      {/* Bench */}
      {benchPlayers.length > 0 && (
        <div>
          <h3 className="font-condensed text-[13px] font-bold uppercase text-app-text border-b border-white/10 pb-2 mb-3">
            Panchina
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {benchPlayers.map(p => (
              <span key={p.id} className="inline-flex items-center gap-1 bg-app-surface border border-white/10 rounded-md px-2.5 py-1.5 text-[12px]">
                <span className="text-app-signal font-bold">{match.numberOverrides?.[p.id] ?? p.number}</span>
                <span className="text-app-text">{p.lastName}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Goals */}
      {goals.length > 0 && (
        <div>
          <h3 className="font-condensed text-[13px] font-bold uppercase text-app-text border-b border-white/10 pb-2 mb-3">
            Marcatori
          </h3>
          <div className="space-y-1">
            {goals.map(g => (
              <div key={g.id} className="flex items-center gap-2 py-1">
                <span className="text-[11px] text-app-signal font-bold w-8 shrink-0">{g.minute}'</span>
                <span className="text-[13px] text-app-text font-semibold">{g.playerName}</span>
                {g.note && (
                  <span className="text-[10px] font-bold text-app-muted border border-white/20 rounded px-1.5 py-0.5">
                    {g.note}
                  </span>
                )}
                <span className="text-[10px] text-app-dim ml-auto">{g.side === 'home' ? homeTeam : awayTeam}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scout stats */}
      {trackedStats.length > 0 && (
        <div>
          <h3 className="font-condensed text-[13px] font-bold uppercase text-app-text border-b border-white/10 pb-2 mb-3">
            Stats Scout
          </h3>
          <div className="space-y-3">
            {trackedStats.map(s => {
              const p = playerMap.get(s.playerId);
              const isGK = p?.role === 'goalkeeper';
              const cells = isGK
                ? [
                    { label: 'Palle perse',      v: s.pallePerse },
                    { label: 'Palle recuperate', v: s.palleRecup },
                    { label: 'Chiusure',         v: s.chiusure },
                  ]
                : [
                    { label: 'Tiri fuori',       v: s.tiriF },
                    { label: 'Tiri in porta',    v: s.tiriP },
                    { label: 'Cross dal fondo',  v: s.crossF },
                    { label: 'Chiusure',         v: s.chiusure },
                    { label: 'Palle perse',      v: s.pallePerse },
                    { label: 'Palle recuperate', v: s.palleRecup },
                    { label: 'Assist',           v: s.assist },
                    { label: 'Gol',              v: s.gol },
                  ];

              return (
                <div key={s.playerId} className="bg-app-surface border border-white/10 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-app-signal font-bold text-[12px]">{s.playerNumber}</span>
                    <span className="text-[13px] font-semibold text-app-text">{s.playerName}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {cells.map(({ label, v }) => (
                      <div key={label} className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-app-dim">{label}</span>
                        <span className={`text-[12px] font-bold tabular-nums ${v > 0 ? 'text-app-signal' : 'text-app-muted'}`}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
