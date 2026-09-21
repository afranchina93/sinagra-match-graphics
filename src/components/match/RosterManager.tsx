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

type SortKey = 'role' | 'presenze' | 'minuti' | 'gol';

// ── Player Row ────────────────────────────────────────────────────────────────

function PlayerRow({ player, stats, onDelete, onSelect, readOnly }: {
  player: Player;
  stats: PlayerStats | undefined;
  onDelete: (id: string) => Promise<void>;
  onSelect: (p: Player) => void;
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
            {player.lastName} {player.firstName.charAt(0)}.
          </span>
        </button>

        {/* Stats chips */}
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
          <button
            onClick={() => onDelete(player.id)}
            className="text-app-dim hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
          >
            <AppIcon name="trash" size={13} />
          </button>
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

function StaffRow({ person, onDelete, onSelect }: {
  person: StaffPerson;
  onDelete: (id: string) => Promise<void>;
  onSelect: (p: StaffPerson) => void;
}) {
  return (
    <div className="rounded-md hover:bg-app-surface/60 group transition-colors">
      <div className="flex items-center gap-2.5 px-2.5 py-2">
        <button
          onClick={() => onSelect(person)}
          className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
        >
          <span className="text-[10px] text-purple-400 font-bold w-14 shrink-0 truncate">{staffRoleLabel(person.role)}</span>
          <span className="text-[13px] text-app-text flex-1 truncate">
            {person.lastName} {person.firstName}
          </span>
        </button>
        <button onClick={() => onDelete(person.id)}
          className="text-app-dim hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
          <AppIcon name="trash" size={13} />
        </button>
      </div>
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

  const [addingPlayer, setAddingPlayer] = useState(false);
  const [playerForm, setPlayerForm] = useState<NewPlayer>(EMPTY_PLAYER);
  const [savingPlayer, setSavingPlayer] = useState(false);

  const [addingStaff, setAddingStaff] = useState(false);
  const [staffForm, setStaffForm] = useState<NewStaff>(EMPTY_STAFF);
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
        return diff; // role sort always asc
      }
      const sa = statsMap[a.id];
      const sb = statsMap[b.id];
      if (sortKey === 'presenze') diff = (sa?.appearances ?? 0) - (sb?.appearances ?? 0);
      if (sortKey === 'minuti')   diff = (sa?.minutesPlayed ?? 0) - (sb?.minutesPlayed ?? 0);
      if (sortKey === 'gol')      diff = (sa?.goals ?? 0) - (sb?.goals ?? 0);
      return sortDir === 'asc' ? diff : -diff;
    });
  }

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

  return (
    <div className="space-y-4">
      {/* Section toggle */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex gap-1">
          <button
            onClick={() => setSection('players')}
            className={`text-[12px] font-bold px-3 py-1.5 rounded-md uppercase tracking-[0.04em] transition-colors ${section === 'players' ? 'bg-app-signal text-[#111710]' : 'text-app-muted hover:text-app-text'}`}
          >
            Giocatori ({players.length})
          </button>
          <button
            onClick={() => setSection('staff')}
            className={`text-[12px] font-bold px-3 py-1.5 rounded-md uppercase tracking-[0.04em] transition-colors ${section === 'staff' ? 'bg-purple-400 text-[#111710]' : 'text-app-muted hover:text-app-text'}`}
          >
            Staff ({staff.length})
          </button>
        </div>
        {!readOnly && (
          <button
            onClick={() => section === 'players' ? setAddingPlayer(a => !a) : setAddingStaff(a => !a)}
            className="flex items-center gap-1 text-[12px] text-app-signal hover:text-[#f0ff66] font-semibold transition-colors"
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
          {addingPlayer && (
            <div className="bg-app-surface border border-white/10 rounded-lg p-3 space-y-2">
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
                className="w-full bg-app-signal text-[#111710] rounded-md py-2 text-[12px] font-bold uppercase tracking-[0.04em] hover:bg-[#f0ff66] transition-colors disabled:opacity-50">
                {savingPlayer ? 'Salvataggio...' : 'Aggiungi giocatore'}
              </button>
            </div>
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
                  <AppIcon
                    name="chevron-down"
                    size={10}
                    className={sortDir === 'asc' ? 'rotate-180' : ''}
                  />
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
              <PlayerRow
                key={p.id}
                player={p}
                stats={statsMap[p.id]}
                onDelete={onDeletePlayer}
                onSelect={onSelectPlayer}
                readOnly={readOnly}
              />
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
          {addingStaff && (
            <div className="bg-app-surface border border-white/10 rounded-lg p-3 space-y-2">
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
                className="w-full bg-purple-400 text-[#111710] rounded-md py-2 text-[12px] font-bold uppercase tracking-[0.04em] hover:bg-purple-300 transition-colors disabled:opacity-50">
                {savingStaff ? 'Salvataggio...' : 'Aggiungi membro staff'}
              </button>
            </div>
          )}

          <div className="space-y-0.5">
            {staff.map(s => (
              <StaffRow key={s.id} person={s} onDelete={onDeleteStaff} onSelect={onSelectStaff} />
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
