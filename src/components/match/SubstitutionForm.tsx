import { useState } from 'react';
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
}

const labelCls = 'block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1';
const inputCls = 'bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-yellow-400 w-full';
const selectCls = 'bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-yellow-400 w-full';

function PlayerInput({
  label,
  playerId,
  number,
  name,
  onChange,
  players,
}: {
  label: string;
  playerId?: string;
  number: number;
  name: string;
  onChange: (id: string | undefined, number: number, name: string) => void;
  players?: Player[];
}) {
  const sorted = players ? [...players].sort((a, b) => a.number - b.number) : [];

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    if (!id) { onChange(undefined, 0, ''); return; }
    const p = players?.find(pl => pl.id === id);
    if (p) onChange(p.id, p.number, p.lastName.toUpperCase());
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

export function SubstitutionForm({ substitutions, onAdd, onDelete, players }: SubstitutionFormProps) {
  const [draft, setDraft] = useState<SubDraft>(EMPTY);

  const canAdd = !!draft.minute && !!draft.playerOutName && !!draft.playerInName;

  function handleAdd() {
    if (!canAdd) return;
    onAdd(draft);
    setDraft(EMPTY);
  }

  return (
    <div className="space-y-5">
      <h2 className="text-sm font-bold text-yellow-400 uppercase tracking-widest border-b border-gray-700 pb-2">
        Sostituzioni
      </h2>

      {substitutions.length > 0 && (
        <div className="space-y-1.5">
          {substitutions.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 bg-gray-800/60 border border-gray-700 rounded px-3 py-2 text-xs">
              <span className="text-yellow-400 font-bold w-10 shrink-0">{s.minute}'</span>
              <span className="text-red-400 flex-1 truncate">↓ {s.playerOutNumber}. {s.playerOutName}</span>
              <span className="text-green-400 flex-1 truncate">↑ {s.playerInNumber}. {s.playerInName}</span>
              <button
                onClick={() => onDelete(i)}
                className="text-gray-600 hover:text-red-400 transition-colors ml-1 shrink-0"
                title="Elimina"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {substitutions.length === 0 && (
        <p className="text-xs text-gray-600 text-center py-2">Nessuna sostituzione salvata</p>
      )}

      <div className="border-t border-gray-700 pt-4 space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nuova sostituzione</p>

        <div>
          <label className={labelCls}>Minuto</label>
          <input
            className={`${inputCls} w-28`}
            type="text"
            placeholder="es. 62 oppure 90+4"
            value={draft.minute}
            onChange={e => setDraft(d => ({ ...d, minute: e.target.value }))}
          />
          <p className="text-xs text-gray-600 mt-1">L&apos;apostrofo viene aggiunto automaticamente</p>
        </div>

        <div className="p-3 rounded bg-gray-800/50 border border-red-900/40">
          <PlayerInput
            label="Esce"
            playerId={draft.playerOutId}
            number={draft.playerOutNumber}
            name={draft.playerOutName}
            onChange={(id, number, name) => setDraft(d => ({ ...d, playerOutId: id, playerOutNumber: number, playerOutName: name }))}
            players={players}
          />
          <div className="mt-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            <span className="text-xs text-red-400 font-semibold">NUMERO ROSSO nel tabellone</span>
          </div>
        </div>

        <div className="p-3 rounded bg-gray-800/50 border border-green-900/40">
          <PlayerInput
            label="Entra"
            playerId={draft.playerInId}
            number={draft.playerInNumber}
            name={draft.playerInName}
            onChange={(id, number, name) => setDraft(d => ({ ...d, playerInId: id, playerInNumber: number, playerInName: name }))}
            players={players}
          />
          <div className="mt-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            <span className="text-xs text-green-400 font-semibold">NUMERO VERDE nel tabellone</span>
          </div>
        </div>

        <button
          onClick={handleAdd}
          disabled={!canAdd}
          className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed text-gray-900 text-xs font-black py-2.5 rounded transition-colors uppercase tracking-wide"
        >
          + Aggiungi sostituzione
        </button>
      </div>
    </div>
  );
}
