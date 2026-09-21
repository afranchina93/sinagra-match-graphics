import { useEffect, useState } from 'react';
import { AppIcon } from '../ui/AppIcon';
import type { Player } from '../../domain/types';
import type { PlayerStats } from '../../domain/types';
import { loadPlayerStats } from '../../storage/db';

interface PlayerPageProps {
  player: Player;
  onBack: () => void;
}

const ROLE_LABEL: Record<string, string> = {
  goalkeeper: 'Portiere',
  defender: 'Difensore',
  midfielder: 'Centrocampista',
  forward: 'Attaccante',
};

export function PlayerPage({ player, onBack }: PlayerPageProps) {
  const [stats, setStats] = useState<PlayerStats | null>(null);

  useEffect(() => {
    loadPlayerStats(player.id).then(setStats).catch(console.error);
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

      {/* Statistics */}
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
