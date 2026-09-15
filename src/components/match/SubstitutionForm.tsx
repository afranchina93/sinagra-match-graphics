import type { SubstitutionConfig, Player } from '../../domain/types';

type SubData = Pick<SubstitutionConfig, 'minute' | 'playerOut' | 'playerIn'>;

interface SubstitutionFormProps {
  data: SubData;
  onChange: (d: SubData) => void;
  players?: Player[];  // rosa attiva per selezione rapida
}

const labelCls = 'block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1';
const inputCls = 'bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-yellow-400 w-full';
const selectCls = 'bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-yellow-400 w-full';

function PlayerInput({
  label,
  player,
  onChange,
  players,
}: {
  label: string;
  player: SubData['playerOut'];
  onChange: (p: SubData['playerOut']) => void;
  players?: Player[];
}) {
  const sorted = players ? [...players].sort((a, b) => a.number - b.number) : [];

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    if (!id) { onChange({ number: 0, name: '' }); return; }
    const p = players?.find(pl => pl.id === id);
    if (p) onChange({ number: p.number, name: p.lastName.toUpperCase() });
  }

  return (
    <div className="space-y-2">
      <span className={labelCls}>{label}</span>

      {/* Selezione rapida dalla rosa */}
      {sorted.length > 0 && (
        <select className={selectCls} defaultValue="" onChange={handleSelect}>
          <option value="">Seleziona dalla rosa…</option>
          {sorted.map(p => (
            <option key={p.id} value={p.id}>
              {p.number}. {p.lastName} {p.firstName}
            </option>
          ))}
        </select>
      )}

      {/* Numero + nome (editabili anche manualmente) */}
      <div className="flex gap-2">
        <input
          className={`${inputCls} w-16 text-center`}
          type="number"
          min={1}
          max={99}
          placeholder="#"
          value={player.number || ''}
          onChange={e => onChange({ ...player, number: parseInt(e.target.value) || 0 })}
        />
        <input
          className={inputCls}
          type="text"
          placeholder="Cognome"
          value={player.name}
          onChange={e => onChange({ ...player, name: e.target.value.toUpperCase() })}
        />
      </div>
    </div>
  );
}

export function SubstitutionForm({ data, onChange, players }: SubstitutionFormProps) {
  return (
    <div className="space-y-5">
      <h2 className="text-sm font-bold text-yellow-400 uppercase tracking-widest border-b border-gray-700 pb-2">
        Sostituzione
      </h2>

      {/* Minuto */}
      <div>
        <label className={labelCls}>Minuto</label>
        <input
          className={`${inputCls} w-28`}
          type="text"
          placeholder="es. 62 oppure 90+4"
          value={data.minute}
          onChange={e => onChange({ ...data, minute: e.target.value })}
        />
        <p className="text-xs text-gray-600 mt-1">L&apos;apostrofo viene aggiunto automaticamente</p>
      </div>

      {/* Giocatore uscente */}
      <div className="p-3 rounded bg-gray-800/50 border border-red-900/40">
        <PlayerInput
          label="Esce"
          player={data.playerOut}
          onChange={p => onChange({ ...data, playerOut: p })}
          players={players}
        />
        <div className="mt-1 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
          <span className="text-xs text-red-400 font-semibold">NUMERO ROSSO nel tabellone</span>
        </div>
      </div>

      {/* Giocatore entrante */}
      <div className="p-3 rounded bg-gray-800/50 border border-green-900/40">
        <PlayerInput
          label="Entra"
          player={data.playerIn}
          onChange={p => onChange({ ...data, playerIn: p })}
          players={players}
        />
        <div className="mt-1 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          <span className="text-xs text-green-400 font-semibold">NUMERO VERDE nel tabellone</span>
        </div>
      </div>

      <p className="text-xs text-gray-600 text-center">
        La sostituzione non viene salvata — è per export al volo
      </p>
    </div>
  );
}
