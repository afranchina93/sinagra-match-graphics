import { useEffect, useState } from 'react';
import { AppIcon } from '../ui/AppIcon';
import type { Player, PlayerStats, PlayerMatchHistoryRow } from '../../domain/types';
import { loadPlayerStats, loadPlayerMatchHistory } from '../../storage/db';

interface PlayerPageProps {
  player: Player;
  onBack: () => void;
  onMatchSelect?: (matchId: string) => void;
}

const ROLE_LABEL: Record<string, string> = {
  goalkeeper: 'Portiere',
  defender: 'Difensore',
  midfielder: 'Centrocampista',
  forward: 'Attaccante',
};

const STATUS_LABEL: Record<string, string> = {
  titolare: 'Titolare',
  subentrato: 'Subentrato',
  panchina: 'Panchina',
  non_convocato: 'N/C',
};

const STATUS_COLOR: Record<string, string> = {
  titolare: 'bg-app-signal/20 text-app-signal',
  subentrato: 'bg-blue-500/20 text-blue-300',
  panchina: 'bg-white/10 text-app-muted',
  non_convocato: 'bg-white/5 text-app-dim',
};

function slotRole(slotId: string | null): string {
  if (!slotId) return '';
  if (slotId === 'gk') return 'P';
  if (slotId.startsWith('def')) return 'D';
  if (slotId.startsWith('mid')) return 'C';
  if (slotId.startsWith('fwd')) return 'A';
  return slotId;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
}

export function PlayerPage({ player, onBack, onMatchSelect }: PlayerPageProps) {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [history, setHistory] = useState<PlayerMatchHistoryRow[] | null>(null);

  useEffect(() => {
    loadPlayerStats(player.id).then(setStats).catch(console.error);
    loadPlayerMatchHistory(player.id).then(setHistory).catch(console.error);
  }, [player.id]);

  return (
    <div className="space-y-5">
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[12px] text-app-muted hover:text-app-text transition-colors"
        >
          <AppIcon name="arrow-left" size={14} />
          Rosa
        </button>
      </div>

      {/* Player card */}
      <div className="bg-app-surface border border-white/10 rounded-lg p-4 flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-app-raised border border-white/10 flex items-center justify-center shrink-0">
          <AppIcon name="user" size={22} className="text-app-muted" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-condensed text-2xl font-black text-app-signal">{player.number}</span>
            <h2 className="font-condensed text-[17px] font-bold text-app-text uppercase truncate">
              {player.lastName} {player.firstName}
            </h2>
          </div>
          <span className="text-[12px] text-app-muted">{ROLE_LABEL[player.role] ?? player.role}</span>
        </div>
      </div>

      {/* Player details */}
      {(player.dateOfBirth || player.matricola || player.docIdentity) && (
        <div className="bg-app-surface border border-white/10 rounded-lg divide-y divide-white/10">
          {player.dateOfBirth && (
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[11px] text-app-muted uppercase tracking-[0.1em]">Data di nascita</span>
              <span className="text-[13px] text-app-text font-semibold">{player.dateOfBirth}</span>
            </div>
          )}
          {player.matricola && (
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[11px] text-app-muted uppercase tracking-[0.1em]">Matricola</span>
              <span className="text-[13px] text-app-text font-semibold">{player.matricola}</span>
            </div>
          )}
          {player.docIdentity && (
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[11px] text-app-muted uppercase tracking-[0.1em]">Doc. Identità</span>
              <span className="text-[13px] text-app-text font-semibold">{player.docIdentity}</span>
            </div>
          )}
        </div>
      )}

      {/* Season statistics */}
      <div>
        <h3 className="font-condensed text-[13px] font-bold uppercase text-app-text border-b border-white/10 pb-2 mb-3">
          Statistiche stagione
        </h3>
        {stats === null ? (
          <p className="text-[12px] text-app-dim text-center py-4">Caricamento...</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Presenze" value={stats.appearances} />
            <StatCard label="Da titolare" value={stats.starterAppearances} />
            <StatCard label="Minuti giocati" value={stats.minutesPlayed} />
            <StatCard label="Gol" value={stats.goals} />
            {player.role === 'goalkeeper' && (
              <StatCard label="Gol subiti" value={stats.goalsConceded} />
            )}
          </div>
        )}
      </div>

      {/* Per-match history */}
      <div>
        <h3 className="font-condensed text-[13px] font-bold uppercase text-app-text border-b border-white/10 pb-2 mb-3">
          Per partita
        </h3>
        {history === null ? (
          <p className="text-[12px] text-app-dim text-center py-4">Caricamento...</p>
        ) : history.length === 0 ? (
          <p className="text-[12px] text-app-dim text-center py-4">Nessuna partita registrata</p>
        ) : (
          <div className="space-y-2">
            {history.map(row => (
              <MatchHistoryCard key={row.matchId} row={row} isGK={player.role === 'goalkeeper'} onSelect={onMatchSelect} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-app-surface border border-white/10 rounded-lg px-4 py-4 text-center">
      <div className="font-condensed text-3xl font-black text-app-text">{value}</div>
      <div className="text-[10px] text-app-muted uppercase tracking-[0.1em] mt-1">{label}</div>
    </div>
  );
}

function MatchHistoryCard({ row, isGK, onSelect }: { row: PlayerMatchHistoryRow; isGK: boolean; onSelect?: (matchId: string) => void }) {
  const homeTeam = row.isHome ? 'Sinagra' : (row.opponentName ?? '?');
  const awayTeam = row.isHome ? (row.opponentName ?? '?') : 'Sinagra';
  const score = `${row.homeGoals}–${row.awayGoals}`;
  const roleLabel = slotRole(row.slotId);

  return (
    <div
      className={`bg-app-surface border border-white/10 rounded-lg px-4 py-3 space-y-2 ${onSelect ? 'cursor-pointer hover:border-white/20 transition-colors' : ''}`}
      onClick={onSelect ? () => onSelect(row.matchId) : undefined}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] text-app-muted shrink-0">{formatDate(row.matchDate)}</span>
          <span className="text-[12px] text-app-text font-semibold truncate">
            {homeTeam} vs {awayTeam}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-condensed text-[14px] font-bold text-app-text">{score}</span>
          {onSelect && <span className="text-app-muted text-[14px]">›</span>}
        </div>
      </div>

      {/* Status + formation row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_COLOR[row.status]}`}>
          {STATUS_LABEL[row.status]}
        </span>
        {row.status !== 'non_convocato' && (
          <>
            <span className="text-[11px] text-app-muted">{row.formation}</span>
            {roleLabel && (
              <span className="text-[11px] text-app-signal font-bold">{roleLabel}</span>
            )}
            {row.minutesPlayed > 0 && (
              <span className="text-[11px] text-app-muted">{row.minutesPlayed}'</span>
            )}
            {row.goals > 0 && (
              <span className="text-[11px] font-bold text-app-signal">
                {row.goals} {row.goals === 1 ? 'gol' : 'gol'}
              </span>
            )}
          </>
        )}
      </div>

      {/* Scout stats */}
      {row.status !== 'non_convocato' && row.status !== 'panchina' && (
        row.scoutStats ? (
          <ScoutStatsRow stats={row.scoutStats} isGK={isGK} />
        ) : (
          <p className="text-[10px] text-app-dim italic">non analizzato</p>
        )
      )}
    </div>
  );
}

function ScoutStatsRow({ stats, isGK }: { stats: NonNullable<PlayerMatchHistoryRow['scoutStats']>; isGK: boolean }) {
  const cells = isGK
    ? [
        { label: 'Palle perse',      v: stats.pallePerse },
        { label: 'Palle recuperate', v: stats.palleRecup },
        { label: 'Chiusure',         v: stats.chiusure },
      ]
    : [
        { label: 'Tiri fuori',       v: stats.tiriF },
        { label: 'Tiri in porta',    v: stats.tiriP },
        { label: 'Cross dal fondo',  v: stats.crossF },
        { label: 'Chiusure',         v: stats.chiusure },
        { label: 'Palle perse',      v: stats.pallePerse },
        { label: 'Palle recuperate', v: stats.palleRecup },
        { label: 'Assist',           v: stats.assist },
        { label: 'Gol',              v: stats.gol },
      ];

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
      {cells.map(({ label, v }) => (
        <div key={label} className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-app-dim">{label}</span>
          <span className={`text-[12px] font-bold tabular-nums ${v > 0 ? 'text-app-signal' : 'text-app-muted'}`}>{v}</span>
        </div>
      ))}
    </div>
  );
}
