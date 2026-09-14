import type { Player, Lineup } from '../../domain/types';
import { formationLayouts } from '../../domain/formations';

interface LineupSelectorProps {
  roster: Player[];
  formation: string;
  lineup: Lineup;
  onChange: (lineup: Lineup) => void;
}

const ROLE_LABELS: Record<string, string> = {
  goalkeeper: 'POR',
  defender: 'DIF',
  midfielder: 'CEN',
  forward: 'ATT',
};

const ROLE_COLORS: Record<string, string> = {
  goalkeeper: 'text-blue-400',
  defender: 'text-green-400',
  midfielder: 'text-yellow-400',
  forward: 'text-red-400',
};

export function LineupSelector({ roster, formation, lineup, onChange }: LineupSelectorProps) {
  const layout = formationLayouts[formation] ?? formationLayouts['4-3-3'];
  const playerMap = Object.fromEntries(roster.map((p) => [p.id, p]));

  // playerIds already selected as starters
  const selectedStarterIds = new Set(Object.values(lineup.starters));

  function setStarter(slotId: string, playerId: string) {
    // If this player is already in another slot, remove them from that slot first
    const newStarters = { ...lineup.starters };
    if (playerId) {
      for (const [sid, pid] of Object.entries(newStarters)) {
        if (pid === playerId && sid !== slotId) {
          delete newStarters[sid];
        }
      }
      // Also remove from bench if present
      const newBench = lineup.bench.filter((id) => id !== playerId);
      newStarters[slotId] = playerId;
      onChange({ ...lineup, starters: newStarters, bench: newBench });
    } else {
      delete newStarters[slotId];
      onChange({ ...lineup, starters: newStarters });
    }
  }

  function toggleBench(playerId: string) {
    if (lineup.bench.includes(playerId)) {
      onChange({ ...lineup, bench: lineup.bench.filter((id) => id !== playerId) });
    } else {
      // Max 9 on bench
      if (lineup.bench.length >= 9) return;
      // Remove from starters if present
      const newStarters = { ...lineup.starters };
      for (const [sid, pid] of Object.entries(newStarters)) {
        if (pid === playerId) delete newStarters[sid];
      }
      onChange({ ...lineup, starters: newStarters, bench: [...lineup.bench, playerId] });
    }
  }

  const inputCls = 'w-full bg-gray-900 border border-gray-700 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-yellow-400';

  return (
    <div className="space-y-4">
      {/* Starters */}
      <div>
        <h2 className="text-sm font-bold text-yellow-400 uppercase tracking-widest border-b border-gray-700 pb-2 mb-3">
          Titolari ({layout.slots.length})
        </h2>
        <div className="space-y-1.5">
          {layout.slots.map((slot) => {
            const selectedId = lineup.starters[slot.id] ?? '';
            const selectedPlayer = selectedId ? playerMap[selectedId] : null;
            return (
              <div key={slot.id} className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold w-8 shrink-0 ${ROLE_COLORS[slot.role] ?? 'text-gray-400'}`}
                >
                  {slot.label ?? ROLE_LABELS[slot.role]}
                </span>
                <select
                  className={inputCls}
                  value={selectedId}
                  onChange={(e) => setStarter(slot.id, e.target.value)}
                >
                  <option value="">— seleziona —</option>
                  {roster.map((p) => {
                    const isInOtherSlot = selectedStarterIds.has(p.id) && p.id !== selectedId;
                    return (
                      <option
                        key={p.id}
                        value={p.id}
                        disabled={isInOtherSlot}
                      >
                        {p.number} {p.lastName} {p.firstName.charAt(0)}.
                        {isInOtherSlot ? ' ✓' : ''}
                      </option>
                    );
                  })}
                </select>
                {selectedPlayer && (
                  <span className={`text-xs shrink-0 ${ROLE_COLORS[selectedPlayer.role]}`}>
                    {ROLE_LABELS[selectedPlayer.role]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bench */}
      <div>
        <h2 className="text-sm font-bold text-yellow-400 uppercase tracking-widest border-b border-gray-700 pb-2 mb-3">
          Panchina ({lineup.bench.length}/9)
        </h2>
        <div className="space-y-1">
          {roster
            .filter((p) => !selectedStarterIds.has(p.id))
            .map((p) => {
              const isOnBench = lineup.bench.includes(p.id);
              return (
                <label
                  key={p.id}
                  className={`flex items-center gap-2 cursor-pointer rounded px-2 py-1 transition-colors ${
                    isOnBench ? 'bg-gray-700' : 'hover:bg-gray-800'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isOnBench}
                    onChange={() => toggleBench(p.id)}
                    className="accent-yellow-400"
                  />
                  <span className={`text-xs font-bold w-6 ${ROLE_COLORS[p.role]}`}>{p.number}</span>
                  <span className="text-xs text-white">
                    {p.lastName} {p.firstName.charAt(0)}.
                  </span>
                  <span className={`text-xs ml-auto ${ROLE_COLORS[p.role]}`}>
                    {ROLE_LABELS[p.role]}
                  </span>
                </label>
              );
            })}
        </div>
      </div>

      {/* Coach */}
      <div>
        <h2 className="text-sm font-bold text-yellow-400 uppercase tracking-widest border-b border-gray-700 pb-2 mb-3">
          Allenatore
        </h2>
        <input
          className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-yellow-400"
          type="text"
          placeholder="Nome allenatore"
          value={lineup.coach}
          onChange={(e) => onChange({ ...lineup, coach: e.target.value })}
        />
      </div>
    </div>
  );
}
