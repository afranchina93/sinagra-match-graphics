import type { Player, Lineup, Match } from '../../domain/types';
import { FORMATIONS } from '../../domain/types';
import { formationLayouts } from '../../domain/formations';

interface LineupSelectorProps {
  roster: Player[];
  formation: string;
  lineup: Lineup;
  onChange: (lineup: Lineup) => void;
  onFormationChange: (formation: string) => void;
  match: Match;
  onMatchChange: (m: Match) => void;
}

const ROLE_LABELS: Record<string, string> = {
  goalkeeper: 'POR',
  defender: 'DIF',
  midfielder: 'CEN',
  forward: 'ATT',
};

const SLOT_LABEL_IT: Record<string, string> = {
  GK:  'POR',
  LB:  'TS',
  RB:  'TD',
  CB:  'DC',
  LCB: 'DC-S',
  RCB: 'DC-D',
  LWB: 'FS',
  RWB: 'FD',
  DM:  'MED',
  CM:  'CC',
  LCM: 'CC-S',
  RCM: 'CC-D',
  LM:  'CS',
  RM:  'CD',
  AM:  'TRQ',
  LAM: 'TRQ-S',
  RAM: 'TRQ-D',
  TRQ: 'TRQ',
  LW:  'ALA-S',
  RW:  'ALA-D',
  CF:  'CA',
  ST:  'ATT',
  LS:  'ATT-S',
  RS:  'ATT-D',
};

const ROLE_COLORS: Record<string, string> = {
  goalkeeper: 'text-blue-400',
  defender: 'text-green-400',
  midfielder: 'text-app-signal',
  forward: 'text-red-400',
};

export function LineupSelector({ roster, formation, lineup, onChange, onFormationChange, match, onMatchChange }: LineupSelectorProps) {
  const layout = formationLayouts[formation] ?? formationLayouts['4-3-3'];
  const playerMap = Object.fromEntries(roster.map((p) => [p.id, p]));

  const currentSlotIds = new Set(layout.slots.map((s) => s.id));
  const selectedStarterIds = new Set(
    Object.entries(lineup.starters)
      .filter(([slotId]) => currentSlotIds.has(slotId))
      .map(([, playerId]) => playerId)
  );

  function setStarter(slotId: string, playerId: string) {
    const newStarters = { ...lineup.starters };
    if (playerId) {
      for (const [sid, pid] of Object.entries(newStarters)) {
        if (pid === playerId && sid !== slotId) {
          delete newStarters[sid];
        }
      }
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
      if (lineup.bench.length >= 9) return;
      const newStarters = { ...lineup.starters };
      for (const [sid, pid] of Object.entries(newStarters)) {
        if (pid === playerId) delete newStarters[sid];
      }
      onChange({ ...lineup, starters: newStarters, bench: [...lineup.bench, playerId] });
    }
  }

  const inputCls = 'w-full bg-app-surface border border-white/10 text-app-text text-[12px] rounded-md px-2.5 py-2 focus:outline-none focus:border-app-signal/60 transition-colors';

  return (
    <div className="space-y-5">
      {/* Modulo */}
      <div>
        <label className="block text-[9px] uppercase tracking-[0.14em] text-app-muted mb-1.5">Modulo</label>
        <select
          className={inputCls}
          value={formation}
          onChange={(e) => onFormationChange(e.target.value)}
        >
          {FORMATIONS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      {/* Starters */}
      <div>
        <h2 className="font-condensed text-[15px] font-bold uppercase text-app-text border-b border-white/10 pb-2 mb-3">
          Titolari ({layout.slots.length})
        </h2>
        <div className="space-y-2">
          {layout.slots.map((slot) => {
            const selectedId = lineup.starters[slot.id] ?? '';
            const selectedPlayer = selectedId ? playerMap[selectedId] : null;
            return (
              <div key={slot.id} className="flex items-center gap-2">
                <span
                  className={`text-[11px] font-bold w-9 shrink-0 ${ROLE_COLORS[slot.role] ?? 'text-app-muted'}`}
                >
                  {(slot.label ? (SLOT_LABEL_IT[slot.label] ?? slot.label) : ROLE_LABELS[slot.role])}
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
                  <span className={`text-[11px] shrink-0 ${ROLE_COLORS[selectedPlayer.role]}`}>
                    {ROLE_LABELS[selectedPlayer.role]}
                  </span>
                )}
                {selectedId && playerMap[selectedId] && (
                  <input
                    type="number"
                    min={1} max={99}
                    value={match.numberOverrides?.[selectedId] ?? playerMap[selectedId].number}
                    onChange={e => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val > 0) {
                        onMatchChange({
                          ...match,
                          numberOverrides: { ...(match.numberOverrides ?? {}), [selectedId]: val }
                        });
                      }
                    }}
                    className="w-11 bg-app-raised border border-white/10 text-app-signal text-[12px] font-bold text-center rounded-md px-1 py-2 focus:outline-none focus:border-app-signal/60"
                    title="Numero per questa partita"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bench */}
      <div>
        <h2 className="font-condensed text-[15px] font-bold uppercase text-app-text border-b border-white/10 pb-2 mb-3">
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
                  className={`flex items-center gap-2.5 cursor-pointer rounded-md px-2.5 py-2 transition-colors ${
                    isOnBench ? 'bg-app-raised border border-white/10' : 'hover:bg-app-surface border border-transparent'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isOnBench}
                    onChange={() => toggleBench(p.id)}
                    className="accent-app-signal"
                  />
                  <span className={`text-[12px] font-bold w-6 ${ROLE_COLORS[p.role]}`}>{p.number}</span>
                  <span className="text-[13px] text-app-text flex-1">
                    {p.lastName} {p.firstName.charAt(0)}.
                  </span>
                  <span className={`text-[11px] ml-auto ${ROLE_COLORS[p.role]}`}>
                    {ROLE_LABELS[p.role]}
                  </span>
                </label>
              );
            })}
        </div>
      </div>

      {/* Coach */}
      <div>
        <h2 className="font-condensed text-[15px] font-bold uppercase text-app-text border-b border-white/10 pb-2 mb-3">
          Allenatore
        </h2>
        <input
          className="w-full bg-app-surface border border-white/10 text-app-text text-[13px] rounded-md px-3 py-2.5 focus:outline-none focus:border-app-signal/60 transition-colors"
          type="text"
          placeholder="Nome allenatore"
          value={lineup.coach}
          onChange={(e) => onChange({ ...lineup, coach: e.target.value })}
        />
      </div>
    </div>
  );
}
