import { useState, useEffect } from 'react';
import type { Player, PlayerRole, StaffPerson, PlayerStats } from '../../domain/types';
import { AppIcon } from '../ui/AppIcon';
import { loadAllPlayersStats } from '../../storage/db';

interface RosterManagerProps {
  players: Player[];
  staff: StaffPerson[];
  onUpsertPlayer: (player: Omit<Player, 'id'> & { id?: string }) => Promise<void>;
  onDeletePlayer: (id: string) => Promise<void>;
  onUpsertStaff: (person: Omit<StaffPerson, 'id'> & { id?: string }) => Promise<StaffPerson>;
  onDeleteStaff: (id: string) => Promise<void>;
  onSelectPlayer: (player: Player) => void;
  onSelectStaff: (person: StaffPerson) => void;
  readOnly?: boolean;
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
  midfielder: 'text-app-signal',
  forward: 'text-red-400',
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
  'bg-app-surface border border-white/10 text-app-text text-[12px] rounded-md px-2.5 py-2 focus:outline-none focus:border-app-signal/60 transition-colors';

const labelCls = 'block text-[9px] uppercase tracking-[0.12em] text-app-muted mb-1';

type SortKey = 'role' | 'presenze' | 'minuti' | 'gol';

// ── Form types ────────────────────────────────────────────────────────────────

interface PlayerForm {
  id?: string;
  number: string;
  firstName: string;
  lastName: string;
  role: PlayerRole;
  dateOfBirth: string;
  matricola: string;
  docIdentity: string;
  posterName: string;
}

interface StaffForm {
  id?: string;
  firstName: string;
  lastName: string;
  role: string;
  dateOfBirth: string;
  matricola: string;
  docIdentity: string;
  tesseraFIGC: string;
}

const EMPTY_PLAYER: PlayerForm = {
  number: '', firstName: '', lastName: '', role: 'midfielder',
  dateOfBirth: '', matricola: '', docIdentity: '', posterName: '',
};

const EMPTY_STAFF: StaffForm = {
  firstName: '', lastName: '', role: 'allenatore',
  dateOfBirth: '', matricola: '', docIdentity: '', tesseraFIGC: '',
};

function playerToForm(p: Player): PlayerForm {
  return {
    id: p.id,
    number: String(p.number),
    firstName: p.firstName,
    lastName: p.lastName,
    role: p.role,
    dateOfBirth: p.dateOfBirth ?? '',
    matricola: p.matricola ?? '',
    docIdentity: p.docIdentity ?? '',
    posterName: p.posterName ?? '',
  };
}

function staffToForm(s: StaffPerson): StaffForm {
  return {
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    role: s.role,
    dateOfBirth: s.dateOfBirth ?? '',
    matricola: s.matricola ?? '',
    docIdentity: s.docIdentity ?? '',
    tesseraFIGC: s.tesseraFIGC ?? '',
  };
}

// ── Inline form panels ────────────────────────────────────────────────────────

function PlayerFormPanel({
  form, setForm, onSave, onCancel, saving, isEdit,
}: {
  form: PlayerForm;
  setForm: (f: PlayerForm) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isEdit: boolean;
}) {
  const set = (k: keyof PlayerForm, v: string) => setForm({ ...form, [k]: v });
  return (
    <div className="bg-app-surface border border-white/10 rounded-lg p-3 space-y-2">
      <div className="grid grid-cols-4 gap-2">
        <div>
          <label className={labelCls}>#</label>
          <input className={inputCls + ' w-full'} type="number" placeholder="#"
            value={form.number} onChange={e => set('number', e.target.value)} />
        </div>
        <div className="col-span-3">
          <label className={labelCls}>Cognome</label>
          <input className={inputCls + ' w-full'} type="text" placeholder="Cognome"
            value={form.lastName} onChange={e => set('lastName', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>Nome</label>
          <input className={inputCls + ' w-full'} type="text" placeholder="Nome"
            value={form.firstName} onChange={e => set('firstName', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Ruolo</label>
          <select className={inputCls + ' w-full'} value={form.role}
            onChange={e => set('role', e.target.value)}>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>Data di nascita</label>
          <input className={inputCls + ' w-full'} type="text" placeholder="GG/MM/AA"
            value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Matricola</label>
          <input className={inputCls + ' w-full'} type="text" placeholder="es. 2392563"
            value={form.matricola} onChange={e => set('matricola', e.target.value)} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Doc. identità</label>
        <input className={inputCls + ' w-full'} type="text" placeholder="n° documento"
          value={form.docIdentity} onChange={e => set('docIdentity', e.target.value)} />
      </div>
      <div>
        <label className={labelCls}>Nome poster (lascia vuoto per automatico)</label>
        <input className={inputCls + ' w-full'} type="text" placeholder={`es. DI PANE`}
          value={form.posterName} onChange={e => set('posterName', e.target.value.toUpperCase())} />
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onSave} disabled={saving}
          className="flex-1 bg-app-signal text-[#111111] rounded-md py-2 text-[12px] font-bold uppercase tracking-[0.04em] hover:bg-[#ffd740] transition-colors disabled:opacity-50">
          {saving ? 'Salvataggio...' : isEdit ? 'Salva modifiche' : 'Aggiungi giocatore'}
        </button>
        <button onClick={onCancel}
          className="px-3 py-2 rounded-md text-[12px] text-app-muted hover:text-app-text border border-white/10 transition-colors">
          Annulla
        </button>
      </div>
    </div>
  );
}

function StaffFormPanel({
  form, setForm, onSave, onCancel, saving, isEdit,
}: {
  form: StaffForm;
  setForm: (f: StaffForm) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isEdit: boolean;
}) {
  const set = (k: keyof StaffForm, v: string) => setForm({ ...form, [k]: v });
  return (
    <div className="bg-app-surface border border-white/10 rounded-lg p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>Cognome</label>
          <input className={inputCls + ' w-full'} type="text" placeholder="Cognome"
            value={form.lastName} onChange={e => set('lastName', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Nome</label>
          <input className={inputCls + ' w-full'} type="text" placeholder="Nome"
            value={form.firstName} onChange={e => set('firstName', e.target.value)} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Ruolo</label>
        <select className={inputCls + ' w-full'} value={form.role}
          onChange={e => set('role', e.target.value)}>
          {STAFF_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>Data di nascita</label>
          <input className={inputCls + ' w-full'} type="text" placeholder="GG/MM/AA"
            value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Matricola</label>
          <input className={inputCls + ' w-full'} type="text" placeholder="es. 2392563"
            value={form.matricola} onChange={e => set('matricola', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>Doc. identità</label>
          <input className={inputCls + ' w-full'} type="text" placeholder="n° documento"
            value={form.docIdentity} onChange={e => set('docIdentity', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Tessera FIGC n°</label>
          <input className={inputCls + ' w-full'} type="text" placeholder="n° tessera"
            value={form.tesseraFIGC} onChange={e => set('tesseraFIGC', e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onSave} disabled={saving}
          className="flex-1 bg-app-accent text-white rounded-md py-2 text-[12px] font-bold uppercase tracking-[0.04em] hover:opacity-90 transition-colors disabled:opacity-50">
          {saving ? 'Salvataggio...' : isEdit ? 'Salva modifiche' : 'Aggiungi membro staff'}
        </button>
        <button onClick={onCancel}
          className="px-3 py-2 rounded-md text-[12px] text-app-muted hover:text-app-text border border-white/10 transition-colors">
          Annulla
        </button>
      </div>
    </div>
  );
}

// ── Player Row ────────────────────────────────────────────────────────────────

function PlayerRow({ player, stats, onDelete, onSelect, onEdit, readOnly }: {
  player: Player;
  stats: PlayerStats | undefined;
  onDelete: (id: string) => Promise<void>;
  onSelect: (p: Player) => void;
  onEdit: (p: Player) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="rounded-md hover:bg-app-surface/60 group transition-colors">
      <div className="flex items-center gap-2.5 px-2.5 py-2">
        <button
          onClick={() => onSelect(player)}
          className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
        >
          <span className={`text-[12px] font-bold w-5 shrink-0 ${ROLE_COLORS[player.role]}`}>{player.number}</span>
          <span className="text-[13px] text-app-text flex-1 truncate">
            {player.lastName} {player.firstName}
          </span>
        </button>

        {stats && (
          <div className="flex items-center gap-1.5 shrink-0">
            <StatChip value={stats.appearances} label="P" />
            <StatChip value={stats.minutesPlayed} label="'" />
            {player.role === 'goalkeeper' ? (
              <StatChip value={stats.goalsConceded} label="GS" dim />
            ) : (
              <StatChip value={stats.goals} label="GF" accent={stats.goals > 0} />
            )}
          </div>
        )}
        {!stats && (
          <div className="w-16 h-4 rounded bg-app-raised animate-pulse" />
        )}

        {!readOnly && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
            <button onClick={() => onEdit(player)} className="text-app-dim hover:text-app-signal transition-colors">
              <AppIcon name="pencil" size={13} />
            </button>
            <button onClick={() => onDelete(player.id)} className="text-app-dim hover:text-red-400 transition-colors">
              <AppIcon name="trash" size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatChip({ value, label, accent, dim }: { value: number; label: string; accent?: boolean; dim?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-mono tabular-nums ${
      accent ? 'text-app-signal' : dim ? 'text-app-dim' : 'text-app-muted'
    }`}>
      <span className="font-bold">{value}</span>
      <span className="text-app-dim">{label}</span>
    </span>
  );
}

// ── Staff Row ─────────────────────────────────────────────────────────────────

function StaffRow({ person, onDelete, onSelect, onEdit }: {
  person: StaffPerson;
  onDelete: (id: string) => Promise<void>;
  onSelect: (p: StaffPerson) => void;
  onEdit: (p: StaffPerson) => void;
}) {
  return (
    <div className="rounded-md hover:bg-app-surface/60 group transition-colors">
      <div className="flex items-center gap-2.5 px-2.5 py-2">
        <button
          onClick={() => onSelect(person)}
          className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
        >
          <span className="text-[10px] text-app-accent font-bold w-14 shrink-0 truncate">{staffRoleLabel(person.role)}</span>
          <span className="text-[13px] text-app-text flex-1 truncate">
            {person.lastName} {person.firstName}
          </span>
        </button>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(person)} className="text-app-dim hover:text-app-signal transition-colors">
            <AppIcon name="pencil" size={13} />
          </button>
          <button onClick={() => onDelete(person.id)} className="text-app-dim hover:text-red-400 transition-colors">
            <AppIcon name="trash" size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'role',    label: 'Ruolo' },
  { key: 'presenze', label: 'Presenze' },
  { key: 'minuti',  label: 'Minuti' },
  { key: 'gol',     label: 'Gol' },
];

export function RosterManager({ players, staff, onUpsertPlayer, onDeletePlayer, onUpsertStaff, onDeleteStaff, onSelectPlayer, onSelectStaff, readOnly }: RosterManagerProps) {
  const [section, setSection] = useState<'players' | 'staff'>('players');
  const [statsMap, setStatsMap] = useState<Record<string, PlayerStats>>({});
  const [statsLoading, setStatsLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('role');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Player form state (null = closed, form without id = adding, form with id = editing)
  const [playerForm, setPlayerForm] = useState<PlayerForm | null>(null);
  const [savingPlayer, setSavingPlayer] = useState(false);

  // Staff form state
  const [staffForm, setStaffForm] = useState<StaffForm | null>(null);
  const [savingStaff, setSavingStaff] = useState(false);

  useEffect(() => {
    setStatsLoading(true);
    loadAllPlayersStats()
      .then(setStatsMap)
      .catch(console.error)
      .finally(() => setStatsLoading(false));
  }, [players.length]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  function sortedPlayers(): Player[] {
    return [...players].sort((a, b) => {
      let diff = 0;
      if (sortKey === 'role') {
        const order = ['goalkeeper', 'defender', 'midfielder', 'forward'];
        diff = order.indexOf(a.role) - order.indexOf(b.role) || a.number - b.number;
        return diff;
      }
      const sa = statsMap[a.id];
      const sb = statsMap[b.id];
      if (sortKey === 'presenze') diff = (sa?.appearances ?? 0) - (sb?.appearances ?? 0);
      if (sortKey === 'minuti')   diff = (sa?.minutesPlayed ?? 0) - (sb?.minutesPlayed ?? 0);
      if (sortKey === 'gol')      diff = (sa?.goals ?? 0) - (sb?.goals ?? 0);
      return sortDir === 'asc' ? diff : -diff;
    });
  }

  async function savePlayer() {
    if (!playerForm) return;
    const num = parseInt(playerForm.number);
    if (!playerForm.lastName || isNaN(num)) return;
    setSavingPlayer(true);
    try {
      await onUpsertPlayer({
        id: playerForm.id,
        number: num,
        firstName: playerForm.firstName,
        lastName: playerForm.lastName,
        role: playerForm.role,
        active: true,
        dateOfBirth: playerForm.dateOfBirth || undefined,
        matricola: playerForm.matricola || undefined,
        docIdentity: playerForm.docIdentity || undefined,
        posterName: playerForm.posterName || undefined,
      });
      setPlayerForm(null);
    } finally {
      setSavingPlayer(false);
    }
  }

  async function saveStaff() {
    if (!staffForm) return;
    if (!staffForm.lastName) return;
    setSavingStaff(true);
    try {
      await onUpsertStaff({
        id: staffForm.id,
        firstName: staffForm.firstName,
        lastName: staffForm.lastName,
        role: staffForm.role,
        active: true,
        dateOfBirth: staffForm.dateOfBirth || undefined,
        matricola: staffForm.matricola || undefined,
        docIdentity: staffForm.docIdentity || undefined,
        tesseraFIGC: staffForm.tesseraFIGC || undefined,
      });
      setStaffForm(null);
    } finally {
      setSavingStaff(false);
    }
  }

  const addingPlayer = playerForm !== null && !playerForm.id;
  const editingPlayerId = playerForm?.id;
  const addingStaff = staffForm !== null && !staffForm.id;
  const editingStaffId = staffForm?.id;

  return (
    <div className="space-y-4">
      {/* Section toggle */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex gap-1">
          <button
            onClick={() => setSection('players')}
            className={`text-[12px] font-bold px-3 py-1.5 rounded-md uppercase tracking-[0.04em] transition-colors ${section === 'players' ? 'bg-app-signal text-[#111111]' : 'text-app-muted hover:text-app-text'}`}
          >
            Giocatori ({players.length})
          </button>
          <button
            onClick={() => setSection('staff')}
            className={`text-[12px] font-bold px-3 py-1.5 rounded-md uppercase tracking-[0.04em] transition-colors ${section === 'staff' ? 'bg-app-accent text-white' : 'text-app-muted hover:text-app-text'}`}
          >
            Staff ({staff.length})
          </button>
        </div>
        {!readOnly && (
          <button
            onClick={() => {
              if (section === 'players') {
                setPlayerForm(addingPlayer ? null : { ...EMPTY_PLAYER });
              } else {
                setStaffForm(addingStaff ? null : { ...EMPTY_STAFF });
              }
            }}
            className="flex items-center gap-1 text-[12px] text-app-signal hover:text-[#ffd740] font-semibold transition-colors"
          >
            {(section === 'players' ? addingPlayer : addingStaff)
              ? <AppIcon name="close" size={14} />
              : <AppIcon name="plus" size={14} />}
            {(section === 'players' ? addingPlayer : addingStaff) ? 'Annulla' : 'Aggiungi'}
          </button>
        )}
      </div>

      {/* ── Giocatori ── */}
      {section === 'players' && (
        <>
          {addingPlayer && playerForm && (
            <PlayerFormPanel
              form={playerForm}
              setForm={setPlayerForm}
              onSave={savePlayer}
              onCancel={() => setPlayerForm(null)}
              saving={savingPlayer}
              isEdit={false}
            />
          )}

          {/* Sort controls */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] uppercase tracking-[0.14em] text-app-dim mr-1">Ordina:</span>
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => toggleSort(opt.key)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-[0.04em] transition-colors ${
                  sortKey === opt.key
                    ? 'bg-app-raised text-app-text border border-white/20'
                    : 'text-app-dim hover:text-app-muted border border-transparent'
                }`}
              >
                {opt.label}
                {sortKey === opt.key && opt.key !== 'role' && (
                  <AppIcon name="chevron-down" size={10} className={sortDir === 'asc' ? 'rotate-180' : ''} />
                )}
              </button>
            ))}
            {!statsLoading && (
              <span className="ml-auto text-[9px] text-app-dim font-mono">P · ' · G</span>
            )}
            {statsLoading && (
              <AppIcon name="spinner" size={12} className="ml-auto text-app-dim animate-spin" />
            )}
          </div>

          {/* Player list */}
          <div className="space-y-0.5">
            {sortedPlayers().map(p => (
              <div key={p.id}>
                <PlayerRow
                  player={p}
                  stats={statsMap[p.id]}
                  onDelete={onDeletePlayer}
                  onSelect={onSelectPlayer}
                  onEdit={player => setPlayerForm(editingPlayerId === player.id ? null : playerToForm(player))}
                  readOnly={readOnly}
                />
                {editingPlayerId === p.id && playerForm && (
                  <div className="mt-1 mb-2">
                    <PlayerFormPanel
                      form={playerForm}
                      setForm={setPlayerForm}
                      onSave={savePlayer}
                      onCancel={() => setPlayerForm(null)}
                      saving={savingPlayer}
                      isEdit={true}
                    />
                  </div>
                )}
              </div>
            ))}
            {players.length === 0 && (
              <p className="text-[12px] text-app-dim px-2 py-4 text-center">Nessun giocatore</p>
            )}
          </div>
        </>
      )}

      {/* ── Staff ── */}
      {section === 'staff' && (
        <>
          {addingStaff && staffForm && (
            <StaffFormPanel
              form={staffForm}
              setForm={setStaffForm}
              onSave={saveStaff}
              onCancel={() => setStaffForm(null)}
              saving={savingStaff}
              isEdit={false}
            />
          )}

          <div className="space-y-0.5">
            {staff.map(s => (
              <div key={s.id}>
                <StaffRow
                  person={s}
                  onDelete={onDeleteStaff}
                  onSelect={onSelectStaff}
                  onEdit={person => setStaffForm(editingStaffId === person.id ? null : staffToForm(person))}
                />
                {editingStaffId === s.id && staffForm && (
                  <div className="mt-1 mb-2">
                    <StaffFormPanel
                      form={staffForm}
                      setForm={setStaffForm}
                      onSave={saveStaff}
                      onCancel={() => setStaffForm(null)}
                      saving={savingStaff}
                      isEdit={true}
                    />
                  </div>
                )}
              </div>
            ))}
            {staff.length === 0 && (
              <p className="text-[12px] text-app-dim px-2 py-6 text-center">
                Nessun membro staff.<br/>Aggiungi allenatori e dirigenti.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
