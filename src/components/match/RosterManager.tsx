import { useState } from 'react';
import type { Player, PlayerRole } from '../../domain/types';
import { Plus, Trash2, X } from 'lucide-react';

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

  const inputCls =
    'bg-gray-900 border border-gray-700 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-yellow-400';

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
          <div className="space-y-1">
            {rolePlayers.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-800 group"
              >
                <span className={`text-xs font-bold w-5 ${ROLE_COLORS[role]}`}>{p.number}</span>
                <span className="text-xs text-white flex-1">
                  {p.lastName} {p.firstName.charAt(0)}.
                </span>
                <button
                  onClick={() => onDelete(p.id)}
                  className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={12} />
                </button>
              </div>
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
