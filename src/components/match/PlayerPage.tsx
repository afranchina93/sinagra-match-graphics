import { useEffect, useState } from 'react';
import { ArrowLeft, User } from 'lucide-react';
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
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          Rosa
        </button>
      </div>

      {/* Player card */}
      <div className="bg-gray-800 rounded-lg p-4 flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
          <User size={22} className="text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-yellow-400">{player.number}</span>
            <h2 className="text-base font-bold text-white uppercase truncate">
              {player.lastName} {player.firstName}
            </h2>
          </div>
          <span className="text-xs text-gray-400">{ROLE_LABEL[player.role] ?? player.role}</span>
        </div>
      </div>

      {/* Player details */}
      <div className="bg-gray-800 rounded-lg divide-y divide-gray-700">
        {player.dateOfBirth && (
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Data di nascita</span>
            <span className="text-xs text-white font-semibold">{player.dateOfBirth}</span>
          </div>
        )}
        {player.matricola && (
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Matricola</span>
            <span className="text-xs text-white font-semibold">{player.matricola}</span>
          </div>
        )}
        {player.docIdentity && (
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Doc. Identità</span>
            <span className="text-xs text-white font-semibold">{player.docIdentity}</span>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div>
        <h3 className="text-xs font-bold text-yellow-400 uppercase tracking-widest mb-3">Statistiche stagione</h3>
        {stats === null ? (
          <p className="text-xs text-gray-600 text-center py-4">Caricamento...</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
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
    <div className="bg-gray-800 rounded-lg px-4 py-3 text-center">
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">{label}</div>
    </div>
  );
}
