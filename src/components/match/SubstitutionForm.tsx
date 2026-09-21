import { useState } from 'react';
import { AppIcon } from '../ui/AppIcon';
import type { MatchSubstitution, Player } from '../../domain/types';

type SubDraft = {
  minute: string;
  playerOutId?: string;
  playerOutNumber: number;
  playerOutName: string;
  playerInId?: string;
  playerInNumber: number;
  playerInName: string;
};

const EMPTY: SubDraft = {
  minute: '',
  playerOutId: undefined,
  playerOutNumber: 0,
  playerOutName: '',
  playerInId: undefined,
  playerInNumber: 0,
  playerInName: '',
};

interface SubstitutionFormProps {
  matchId: string;
  substitutions: MatchSubstitution[];
  onAdd: (entry: SubDraft) => void;
  onDelete: (index: number) => void;
  players?: Player[];
  numberOverrides?: Record<string, number>;
}

const labelCls = 'block text-[9px] uppercase tracking-[0.14em] text-app-muted mb-1.5';
const inputCls = 'bg-app-surface border border-white/10 text-app-text text-[12px] rounded-md px-2.5 py-2 focus:outline-none focus:border-app-signal/60 transition-colors w-full';
const selectCls = 'bg-app-surface border border-white/10 text-app-text text-[12px] rounded-md px-2.5 py-2 focus:outline-none focus:border-app-signal/60 transition-colors w-full';

function PlayerInput({
  label,
  playerId,
  number,
  name,
  onChange,
  players,
  numberOverrides,
}: {
  label: string;
  playerId?: string;
  number: number;
  name: string;
  onChange: (id: string | undefined, number: number, name: string) => void;
  players?: Player[];
  numberOverrides?: Record<string, number>;
}) {
  const sorted = players ? [...players].sort((a, b) => a.number - b.number) : [];

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    if (!id) { onChange(undefined, 0, ''); return; }
    const p = players?.find(pl => pl.id === id);
    if (p) onChange(p.id, numberOverrides?.[p.id] ?? p.number, p.lastName.split(' ')[0].toUpperCase());
  }

  return (
    <div className="space-y-2">
      <span className={labelCls}>{label}</span>
      {sorted.length > 0 && (
        <select className={selectCls} value={playerId ?? ''} onChange={handleSelect}>
          <option value="">Seleziona dalla rosa…</option>
          {sorted.map(p => (
            <option key={p.id} value={p.id}>
              {p.number}. {p.lastName} {p.firstName}
            </option>
          ))}
        </select>
      )}
      <div className="flex gap-2">
        <input
          className={`${inputCls} w-16 text-center`}
          type="number"
          min={1}
          max={99}
          placeholder="#"
          value={number || ''}
          onChange={e => onChange(undefined, parseInt(e.target.value) || 0, name)}
        />
        <input
          className={inputCls}
          type="text"
          placeholder="Cognome"
          value={name}
          onChange={e => onChange(undefined, number, e.target.value.toUpperCase())}
        />
      </div>
    </div>
  );
}

export function SubstitutionForm({ substitutions, onAdd, onDelete, players, numberOverrides }: SubstitutionFormProps) {
  const [draft, setDraft] = useState<SubDraft>(EMPTY);

  const canAdd = !!draft.minute && !!draft.playerOutName && !!draft.playerInName;

  function handleAdd() {
    if (!canAdd) return;
    onAdd(draft);
    setDraft(EMPTY);
  }

  return (
    <div className="space-y-5">
      <h2 className="font-condensed text-[15px] font-bold uppercase text-app-text border-b border-white/10 pb-2">
        Sostituzioni
      </h2>

      {substitutions.length > 0 && (
        <div className="space-y-2">
          {substitutions.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 bg-app-surface border border-white/10 rounded-lg px-3 py-2.5 text-[12px]">
              <span className="text-app-signal font-bold w-10 shrink-0">{s.minute}'</span>
              <span className="text-red-400 flex-1 truncate">↓ {s.playerOutNumber}. {s.playerOutName}</span>
              <span className="text-green-400 flex-1 truncate">↑ {s.playerInNumber}. {s.playerInName}</span>
              <button
                onClick={() => onDelete(i)}
                className="text-app-dim hover:text-red-400 transition-colors ml-1 shrink-0"
                title="Elimina"
              >
                <AppIcon name="trash" size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {substitutions.length === 0 && (
        <p className="text-[12px] text-app-dim text-center py-2">Nessuna sostituzione salvata</p>
      )}

      <div className="border-t border-white/10 pt-4 space-y-4">
        <p className="text-[9px] uppercase tracking-[0.14em] text-app-muted">Nuova sostituzione</p>

        <div>
          <label className={labelCls}>Minuto</label>
          <input
            className={`${inputCls} w-32`}
            type="text"
            placeholder="es. 62 oppure 90+4"
            value={draft.minute}
            onChange={e => setDraft(d => ({ ...d, minute: e.target.value }))}
          />
          <p className="text-[11px] text-app-dim mt-1">L&apos;apostrofo viene aggiunto automaticamente</p>
        </div>

        <div className="p-3 rounded-lg bg-app-surface border border-red-900/30">
          <PlayerInput
            label="Esce"
            playerId={draft.playerOutId}
            number={draft.playerOutNumber}
            name={draft.playerOutName}
            onChange={(id, number, name) => setDraft(d => ({ ...d, playerOutId: id, playerOutNumber: number, playerOutName: name }))}
            players={players}
            numberOverrides={numberOverrides}
          />
          <div className="mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            <span className="text-[10px] text-red-400 font-semibold uppercase tracking-wider">Numero rosso nel tabellone</span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-app-surface border border-green-900/30">
          <PlayerInput
            label="Entra"
            playerId={draft.playerInId}
            number={draft.playerInNumber}
            name={draft.playerInName}
            onChange={(id, number, name) => setDraft(d => ({ ...d, playerInId: id, playerInNumber: number, playerInName: name }))}
            players={players}
            numberOverrides={numberOverrides}
          />
          <div className="mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            <span className="text-[10px] text-green-400 font-semibold uppercase tracking-wider">Numero verde nel tabellone</span>
          </div>
        </div>

        <button
          onClick={handleAdd}
          disabled={!canAdd}
          className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] bg-app-signal text-[#111111] text-[13px] font-bold rounded-md transition-colors hover:bg-[#ffd740] disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-[0.04em]"
        >
          <AppIcon name="plus" size={14} />
          Aggiungi sostituzione
        </button>
      </div>
    </div>
  );
}
