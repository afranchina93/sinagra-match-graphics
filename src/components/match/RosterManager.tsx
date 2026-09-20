import { useState } from 'react';
import type { Player, PlayerRole, StaffPerson } from '../../domain/types';
import { Plus, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react';

interface RosterManagerProps {
  players: Player[];
  staff: StaffPerson[];
  onUpsertPlayer: (player: Omit<Player, 'id'> & { id?: string }) => Promise<void>;
  onDeletePlayer: (id: string) => Promise<void>;
  onUpsertStaff: (person: Omit<StaffPerson, 'id'> & { id?: string }) => Promise<StaffPerson>;
  onDeleteStaff: (id: string) => Promise<void>;
  onSelectPlayer: (player: Player) => void;
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

const STAFF_ROLES: { value: string; label: string }[] = [
  { value: 'allenatore',     label: 'Allenatore' },
  { value: 'direttore_gara', label: 'Dir. addetto gara' },
  { value: 'dirigente',      label: 'Dirigente' },
  { value: 'medico_sociale', label: 'Medico Sociale' },
  { value: 'collaboratore',  label: 'Collaboratore' },
  { value: 'forza_pubblica', label: 'Forza Pubblica' },
];

const staffRoleLabel = (role: string) =>
  STAFF_ROLES.find(r => r.value === role)?.label ?? role;

const inputCls =
  'bg-gray-900 border border-gray-700 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-yellow-400';

// ── Player Row ────────────────────────────────────────────────────────────────

function PlayerRow({ player, onUpsert, onDelete, onSelect }: {
  player: Player;
  onUpsert: (p: Omit<Player, 'id'> & { id?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSelect: (p: Player) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [dob, setDob] = useState(player.dateOfBirth ?? '');
  const [matricola, setMatricola] = useState(player.matricola ?? '');
  const [docIdentity, setDocIdentity] = useState(player.docIdentity ?? '');
  const [saving, setSaving] = useState(false);

  async function saveExtras() {
    if (
      dob === (player.dateOfBirth ?? '') &&
      matricola === (player.matricola ?? '') &&
      docIdentity === (player.docIdentity ?? '')
    ) return;
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
        docIdentity: docIdentity || undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  const hasExtras = !!(player.dateOfBirth || player.matricola || player.docIdentity);

  return (
    <div className="rounded hover:bg-gray-800/50 group">
      <div className="flex items-center gap-2 px-2 py-1">
        <button
          onClick={() => onSelect(player)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
        >
          <span className={`text-xs font-bold w-5 shrink-0 ${ROLE_COLORS[player.role]}`}>{player.number}</span>
          <span className="text-xs text-white flex-1 truncate">
            {player.lastName} {player.firstName.charAt(0)}.
          </span>
        </button>
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
              <input className={inputCls + ' w-full'} type="text" placeholder="es. 06/07/01"
                value={dob} onChange={e => setDob(e.target.value)} onBlur={saveExtras} />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">
                N° Matricola FIGC
              </label>
              <input className={inputCls + ' w-full'} type="text" placeholder="es. 2392563"
                value={matricola} onChange={e => setMatricola(e.target.value)} onBlur={saveExtras} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">
              N° Carta d&apos;identità
            </label>
            <input className={inputCls + ' w-full'} type="text" placeholder="es. CA15790TF"
              value={docIdentity} onChange={e => setDocIdentity(e.target.value)} onBlur={saveExtras} />
          </div>
          {saving && <p className="text-[10px] text-gray-500">Salvataggio...</p>}
        </div>
      )}
    </div>
  );
}

// ── Staff Row ─────────────────────────────────────────────────────────────────

function StaffRow({ person, onUpsert, onDelete }: {
  person: StaffPerson;
  onUpsert: (p: Omit<StaffPerson, 'id'> & { id?: string }) => Promise<StaffPerson>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [fields, setFields] = useState({
    role: person.role,
    dob: person.dateOfBirth ?? '',
    matricola: person.matricola ?? '',
    docIdentity: person.docIdentity ?? '',
    tesseraFIGC: person.tesseraFIGC ?? '',
  });
  const [saving, setSaving] = useState(false);

  async function save(updated = fields) {
    setSaving(true);
    try {
      await onUpsert({
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        role: updated.role,
        dateOfBirth: updated.dob || undefined,
        matricola: updated.matricola || undefined,
        docIdentity: updated.docIdentity || undefined,
        tesseraFIGC: updated.tesseraFIGC || undefined,
        active: person.active,
      });
    } finally {
      setSaving(false);
    }
  }

  function update(key: keyof typeof fields, value: string) {
    const next = { ...fields, [key]: value };
    setFields(next);
    return next;
  }

  return (
    <div className="rounded hover:bg-gray-800/50 group">
      <div className="flex items-center gap-2 px-2 py-1">
        <span className="text-[10px] text-purple-400 font-bold w-14 truncate">{staffRoleLabel(person.role)}</span>
        <span className="text-xs text-white flex-1">
          {person.lastName} {person.firstName}
        </span>
        <button onClick={() => setExpanded(e => !e)} className="text-gray-600 hover:text-yellow-400 transition-colors">
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        <button onClick={() => onDelete(person.id)}
          className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
          <Trash2 size={12} />
        </button>
      </div>

      {expanded && (
        <div className="px-2 pb-2 pt-1 space-y-2 border-t border-gray-700/50 ml-16">
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Ruolo</label>
            <select className={inputCls + ' w-full'} value={fields.role}
              onChange={e => { const next = update('role', e.target.value); save(next); }}>
              {STAFF_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Data nascita</label>
              <input className={inputCls + ' w-full'} placeholder="GG/MM/AA"
                value={fields.dob} onChange={e => setFields(f => ({ ...f, dob: e.target.value }))}
                onBlur={() => save()} />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Matricola</label>
              <input className={inputCls + ' w-full'} placeholder="es. 112403"
                value={fields.matricola} onChange={e => setFields(f => ({ ...f, matricola: e.target.value }))}
                onBlur={() => save()} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">N° C.I.</label>
              <input className={inputCls + ' w-full'} placeholder="es. CA15790TF"
                value={fields.docIdentity} onChange={e => setFields(f => ({ ...f, docIdentity: e.target.value }))}
                onBlur={() => save()} />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Tessera FIGC</label>
              <input className={inputCls + ' w-full'} placeholder="n° tessera"
                value={fields.tesseraFIGC} onChange={e => setFields(f => ({ ...f, tesseraFIGC: e.target.value }))}
                onBlur={() => save()} />
            </div>
          </div>
          {saving && <p className="text-[10px] text-gray-500">Salvataggio...</p>}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface NewPlayer {
  number: string;
  firstName: string;
  lastName: string;
  role: PlayerRole;
}

const EMPTY_PLAYER: NewPlayer = { number: '', firstName: '', lastName: '', role: 'midfielder' };

interface NewStaff {
  firstName: string;
  lastName: string;
  role: string;
}

const EMPTY_STAFF: NewStaff = { firstName: '', lastName: '', role: 'allenatore' };

export function RosterManager({ players, staff, onUpsertPlayer, onDeletePlayer, onUpsertStaff, onDeleteStaff, onSelectPlayer }: RosterManagerProps) {
  const [section, setSection] = useState<'players' | 'staff'>('players');

  // Player form
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [playerForm, setPlayerForm] = useState<NewPlayer>(EMPTY_PLAYER);
  const [savingPlayer, setSavingPlayer] = useState(false);

  // Staff form
  const [addingStaff, setAddingStaff] = useState(false);
  const [staffForm, setStaffForm] = useState<NewStaff>(EMPTY_STAFF);
  const [savingStaff, setSavingStaff] = useState(false);

  async function addPlayer() {
    const num = parseInt(playerForm.number);
    if (!playerForm.lastName || isNaN(num)) return;
    setSavingPlayer(true);
    try {
      await onUpsertPlayer({ number: num, firstName: playerForm.firstName, lastName: playerForm.lastName, role: playerForm.role, active: true });
      setPlayerForm(EMPTY_PLAYER);
      setAddingPlayer(false);
    } finally {
      setSavingPlayer(false);
    }
  }

  async function addStaffMember() {
    if (!staffForm.lastName) return;
    setSavingStaff(true);
    try {
      await onUpsertStaff({ firstName: staffForm.firstName, lastName: staffForm.lastName, role: staffForm.role, active: true });
      setStaffForm(EMPTY_STAFF);
      setAddingStaff(false);
    } finally {
      setSavingStaff(false);
    }
  }

  const byRole: Record<PlayerRole, Player[]> = { goalkeeper: [], defender: [], midfielder: [], forward: [] };
  players.forEach((p) => byRole[p.role]?.push(p));

  return (
    <div className="space-y-4">
      {/* Section toggle */}
      <div className="flex items-center justify-between border-b border-gray-700 pb-2">
        <div className="flex gap-1">
          <button
            onClick={() => setSection('players')}
            className={`text-xs font-bold px-3 py-1 rounded uppercase tracking-wide transition-colors ${section === 'players' ? 'bg-yellow-400 text-gray-900' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Giocatori ({players.length})
          </button>
          <button
            onClick={() => setSection('staff')}
            className={`text-xs font-bold px-3 py-1 rounded uppercase tracking-wide transition-colors ${section === 'staff' ? 'bg-purple-400 text-gray-900' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Staff ({staff.length})
          </button>
        </div>
        <button
          onClick={() => section === 'players' ? setAddingPlayer(a => !a) : setAddingStaff(a => !a)}
          className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300 font-semibold"
        >
          {(section === 'players' ? addingPlayer : addingStaff) ? <X size={14} /> : <Plus size={14} />}
          {(section === 'players' ? addingPlayer : addingStaff) ? 'Annulla' : 'Aggiungi'}
        </button>
      </div>

      {/* ── Giocatori ── */}
      {section === 'players' && (
        <>
          {addingPlayer && (
            <div className="bg-gray-800 rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-4 gap-2">
                <input className={inputCls} type="number" placeholder="#"
                  value={playerForm.number} onChange={e => setPlayerForm({ ...playerForm, number: e.target.value })} />
                <input className={`${inputCls} col-span-3`} type="text" placeholder="Cognome"
                  value={playerForm.lastName} onChange={e => setPlayerForm({ ...playerForm, lastName: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input className={inputCls} type="text" placeholder="Nome"
                  value={playerForm.firstName} onChange={e => setPlayerForm({ ...playerForm, firstName: e.target.value })} />
                <select className={inputCls} value={playerForm.role}
                  onChange={e => setPlayerForm({ ...playerForm, role: e.target.value as PlayerRole })}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <button onClick={addPlayer} disabled={savingPlayer}
                className="w-full bg-yellow-400 text-gray-900 rounded py-1.5 text-xs font-bold uppercase tracking-wide hover:bg-yellow-300 transition-colors disabled:opacity-50">
                {savingPlayer ? 'Salvataggio...' : 'Aggiungi giocatore'}
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
                {rolePlayers.map(p => (
                  <PlayerRow key={p.id} player={p} onUpsert={onUpsertPlayer} onDelete={onDeletePlayer} onSelect={onSelectPlayer} />
                ))}
                {rolePlayers.length === 0 && <p className="text-xs text-gray-600 px-2">Nessun giocatore</p>}
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── Staff ── */}
      {section === 'staff' && (
        <>
          {addingStaff && (
            <div className="bg-gray-800 rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input className={inputCls} type="text" placeholder="Cognome"
                  value={staffForm.lastName} onChange={e => setStaffForm({ ...staffForm, lastName: e.target.value })} />
                <input className={inputCls} type="text" placeholder="Nome"
                  value={staffForm.firstName} onChange={e => setStaffForm({ ...staffForm, firstName: e.target.value })} />
              </div>
              <select className={inputCls + ' w-full'} value={staffForm.role}
                onChange={e => setStaffForm({ ...staffForm, role: e.target.value })}>
                {STAFF_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <button onClick={addStaffMember} disabled={savingStaff}
                className="w-full bg-purple-400 text-gray-900 rounded py-1.5 text-xs font-bold uppercase tracking-wide hover:bg-purple-300 transition-colors disabled:opacity-50">
                {savingStaff ? 'Salvataggio...' : 'Aggiungi membro staff'}
              </button>
            </div>
          )}

          <div className="space-y-0.5">
            {staff.map(s => (
              <StaffRow key={s.id} person={s} onUpsert={onUpsertStaff} onDelete={onDeleteStaff} />
            ))}
            {staff.length === 0 && (
              <p className="text-xs text-gray-600 px-2 py-4 text-center">
                Nessun membro staff.<br/>Aggiungi allenatori e dirigenti.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
