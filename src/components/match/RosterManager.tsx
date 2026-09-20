import { useState } from 'react';
import type { Player, PlayerRole } from '../../domain/types';
import { Plus, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react';

interface RosterManagerProps {
  players: Player[];
  onUpsert: (player: Omit<Player, 'id'> & { id?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const ROLES: { value: PlayerRole; label: string }[] = [
  { value: 'goalkeeper', label: 'Portiere' },
  { value: 'defender', label: 'Difensore' },
  { value: 'midfielder', label: 'Centrocampista' },
  { value: 'forward', label: 'Attaccante' },
];

const ROLE_COLORS: Record<PlayerRole, string> = {
  goalkeeper: 'text-blue-400',
  defender: 'text-green-400',
  midfielder: 'text-yellow-400',
  forward: 'text-red-400',
};

const ROLE_LABELS: Record<PlayerRole, string> = {
  goalkeeper: 'POR',
  defender: 'DIF',
  midfielder: 'CEN',
  forward: 'ATT',
};

interface NewPlayer {
  number: string;
  firstName: string;
  lastName: string;
  role: PlayerRole;
}

const EMPTY: NewPlayer = { number: '', firstName: '', lastName: '', role: 'midfielder' };

const inputCls =
  'bg-gray-900 border border-gray-700 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-yellow-400';

function PlayerRow({ player, onUpsert, onDelete }: {
  player: Player;
  onUpsert: (p: Omit<Player, 'id'> & { id?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [dob, setDob] = useState(player.dateOfBirth ?? '');
  const [matricola, setMatricola] = useState(player.matricola ?? '');
  const [saving, setSaving] = useState(false);

  async function saveExtras() {
    if (dob === (player.dateOfBirth ?? '') && matricola === (player.matricola ?? '')) return;
    setSaving(true);
    try {
      await onUpsert({
        id: player.id,
        number: player.number,
        firstName: player.firstName,
        lastName: player.lastName,
        role: player.role,
        active: player.active,
        dateOfBirth: dob || undefined,
        matricola: matricola || undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  const hasExtras = !!(player.dateOfBirth || player.matricola);

  return (
    <div className="rounded hover:bg-gray-800/50 group">
      <div className="flex items-center gap-2 px-2 py-1">
        <span className={`text-xs font-bold w-5 ${ROLE_COLORS[player.role]}`}>{player.number}</span>
        <span className="text-xs text-white flex-1">
          {player.lastName} {player.firstName.charAt(0)}.
        </span>
        {hasExtras && (
          <span className="text-xs text-gray-600 font-mono">{player.matricola ?? '—'}</span>
        )}
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-gray-600 hover:text-yellow-400 transition-colors"
          title="Dati distinta"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        <button
          onClick={() => onDelete(player.id)}
          className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {expanded && (
        <div className="px-2 pb-2 pt-1 space-y-2 border-t border-gray-700/50 ml-7">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">
                Data nascita (GG/MM/AA)
              </label>
              <input
                className={inputCls + ' w-full'}
                type="text"
                placeholder="es. 06/07/01"
                value={dob}
                onChange={e => setDob(e.target.value)}
                onBlur={saveExtras}
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">
                N° Matricola FIGC
              </label>
              <input
                className={inputCls + ' w-full'}
                type="text"
                placeholder="es. 2392563"
                value={matricola}
                onChange={e => setMatricola(e.target.value)}
                onBlur={saveExtras}
              />
            </div>
          </div>
          {saving && <p className="text-[10px] text-gray-500">Salvataggio...</p>}
        </div>
      )}
    </div>
  );
}

export function RosterManager({ players, onUpsert, onDelete }: RosterManagerProps) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<NewPlayer>(EMPTY);
  const [saving, setSaving] = useState(false);

  async function addPlayer() {
    const num = parseInt(form.number);
    if (!form.lastName || isNaN(num)) return;
    setSaving(true);
    try {
      await onUpsert({
        number: num,
        firstName: form.firstName,
        lastName: form.lastName,
        role: form.role,
        active: true,
      });
      setForm(EMPTY);
      setAdding(false);
    } finally {
      setSaving(false);
    }
  }

  const byRole: Record<PlayerRole, Player[]> = {
    goalkeeper: [],
    defender: [],
    midfielder: [],
    forward: [],
  };
  players.forEach((p) => byRole[p.role]?.push(p));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-gray-700 pb-2">
        <h2 className="text-sm font-bold text-yellow-400 uppercase tracking-widest">Rosa</h2>
        <button
          onClick={() => setAdding(!adding)}
          className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300 font-semibold"
        >
          {adding ? <X size={14} /> : <Plus size={14} />}
          {adding ? 'Annulla' : 'Aggiungi'}
        </button>
      </div>

      {adding && (
        <div className="bg-gray-800 rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-4 gap-2">
            <input
              className={inputCls}
              type="number"
              placeholder="#"
              value={form.number}
              onChange={(e) => setForm({ ...form, number: e.target.value })}
            />
            <input
              className={`${inputCls} col-span-3`}
              type="text"
              placeholder="Cognome"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              className={inputCls}
              type="text"
              placeholder="Nome"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
            <select
              className={inputCls}
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as PlayerRole })}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={addPlayer}
            disabled={saving}
            className="w-full bg-yellow-400 text-gray-900 rounded py-1.5 text-xs font-bold uppercase tracking-wide hover:bg-yellow-300 transition-colors disabled:opacity-50"
          >
            {saving ? 'Salvataggio...' : 'Aggiungi giocatore'}
          </button>
        </div>
      )}

      {(Object.entries(byRole) as [PlayerRole, Player[]][]).map(([role, rolePlayers]) => (
        <div key={role}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-xs font-bold ${ROLE_COLORS[role]}`}>{ROLE_LABELS[role]}</span>
            <span className="text-xs text-gray-500">({rolePlayers.length})</span>
          </div>
          <div className="space-y-0.5">
            {rolePlayers.map((p) => (
              <PlayerRow key={p.id} player={p} onUpsert={onUpsert} onDelete={onDelete} />
            ))}
            {rolePlayers.length === 0 && (
              <p className="text-xs text-gray-600 px-2">Nessun giocatore</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
