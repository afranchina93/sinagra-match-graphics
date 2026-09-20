import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Match, ScorerNote, ResultPhase, Player, MatchGoal } from '../../domain/types';

interface ResultFormProps {
  match: Match;
  goals: MatchGoal[];
  phase: ResultPhase;
  onPhaseChange: (phase: ResultPhase) => void;
  onChange: (match: Match) => void;
  onGoalsChange: (goals: MatchGoal[]) => void;
  players?: Player[];
}

const labelCls = 'block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1';
const inputCls = 'bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-yellow-400';

function GoalCounter({
  label, value, onChange,
}: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 text-white font-bold text-lg flex items-center justify-center"
        >−</button>
        <span className="text-white font-black text-2xl w-8 text-center" style={{ fontFamily: 'Impact, sans-serif' }}>
          {value}
        </span>
        <button
          onClick={() => onChange(value + 1)}
          className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 text-white font-bold text-lg flex items-center justify-center"
        >+</button>
      </div>
    </div>
  );
}

const NOTE_LABELS: { value: ScorerNote; label: string }[] = [
  { value: 'R',  label: 'Rig.' },
  { value: 'AG', label: 'A.G.' },
];

function GoalsList({
  title, side, matchId, goals, onGoalsChange, players,
}: {
  title: string;
  side: 'home' | 'away';
  matchId: string;
  goals: MatchGoal[];
  onGoalsChange: (goals: MatchGoal[]) => void;
  players?: Player[];
}) {
  const [minute, setMinute] = useState('');
  const [name, setName] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [note, setNote] = useState<ScorerNote | ''>('');

  const sideGoals = goals.filter(g => g.side === side);
  const useRoster = !!players && players.length > 0 && side === 'home';
  const sortedPlayers = useRoster ? [...players].sort((a, b) => a.number - b.number) : [];

  function add() {
    const min = parseInt(minute);
    if (isNaN(min) || min < 1) return;

    let playerName: string;
    let playerId: string | undefined;
    if (useRoster) {
      if (!selectedPlayerId) return;
      const p = players!.find((pl) => pl.id === selectedPlayerId);
      if (!p) return;
      playerName = p.lastName.toUpperCase();
      playerId = p.id;
    } else {
      if (!name.trim()) return;
      playerName = name.trim().toUpperCase();
    }

    const newGoal: MatchGoal = {
      id: crypto.randomUUID(),
      matchId,
      playerId,
      playerName,
      minute: min,
      side,
      note: note || undefined,
      sortOrder: goals.length,
    };
    const updated = [...goals, newGoal].sort((a, b) => a.minute - b.minute);
    onGoalsChange(updated);
    setMinute('');
    setName('');
    setSelectedPlayerId('');
    setNote('');
  }

  function remove(id: string) {
    onGoalsChange(goals.filter(g => g.id !== id));
  }

  return (
    <div className="space-y-2">
      <span className={labelCls}>{title}</span>

      {sideGoals.length > 0 && (
        <div className="space-y-1">
          {sideGoals.map((g) => (
            <div key={g.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-800 group">
              <span className="text-xs font-bold text-red-400 w-8 shrink-0" style={{ fontFamily: 'Impact, sans-serif' }}>
                {g.minute}&apos;
              </span>
              <span className="text-xs text-white flex-1 uppercase tracking-wide">{g.playerName}</span>
              {g.note && (
                <span className="text-xs font-bold text-yellow-400 shrink-0">({g.note})</span>
              )}
              <button
                onClick={() => remove(g.id)}
                className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 items-center">
        <input
          className={`${inputCls} w-14 text-center`}
          type="number"
          min={1}
          max={120}
          placeholder="'"
          value={minute}
          onChange={(e) => setMinute(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        {useRoster ? (
          <select
            className={`${inputCls} flex-1`}
            value={selectedPlayerId}
            onChange={(e) => setSelectedPlayerId(e.target.value)}
          >
            <option value="">Scegli giocatore…</option>
            {sortedPlayers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.number}. {p.lastName} {p.firstName}
              </option>
            ))}
          </select>
        ) : (
          <input
            className={`${inputCls} flex-1`}
            type="text"
            placeholder="Nome giocatore"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
        )}
        <div className="flex gap-1 shrink-0">
          {NOTE_LABELS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setNote((prev) => prev === value ? '' : value)}
              className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide transition-colors ${
                note === value
                  ? 'bg-yellow-400 text-gray-900'
                  : 'bg-gray-800 text-gray-500 border border-gray-700 hover:border-yellow-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button onClick={add} className="text-yellow-400 hover:text-yellow-300">
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

export function ResultForm({ match, goals, phase, onPhaseChange, onChange, onGoalsChange, players }: ResultFormProps) {
  return (
    <div className="space-y-5">
      <h2 className="text-sm font-bold text-yellow-400 uppercase tracking-widest border-b border-gray-700 pb-2">
        Risultato
      </h2>

      <div>
        <label className={labelCls}>Fase</label>
        <div className="flex gap-2">
          {(['HALF TIME', 'LIVE', 'FULL TIME'] as ResultPhase[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPhaseChange(p)}
              className={`flex-1 py-2 rounded text-xs font-bold uppercase tracking-wide transition-colors ${
                phase === p
                  ? 'bg-yellow-400 text-gray-900'
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-yellow-400'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>Gol</label>
        <div className="flex items-center justify-around bg-gray-800 rounded-lg p-4">
          <GoalCounter
            label="Casa"
            value={match.homeGoals}
            onChange={(v) => onChange({ ...match, homeGoals: v })}
          />
          <span className="text-red-400 font-black text-3xl" style={{ fontFamily: 'Impact, sans-serif' }}>—</span>
          <GoalCounter
            label="Ospiti"
            value={match.awayGoals}
            onChange={(v) => onChange({ ...match, awayGoals: v })}
          />
        </div>
      </div>

      <GoalsList
        title="Marcatori casa"
        side="home"
        matchId={match.id}
        goals={goals}
        onGoalsChange={onGoalsChange}
        players={players}
      />

      <GoalsList
        title="Marcatori ospiti"
        side="away"
        matchId={match.id}
        goals={goals}
        onGoalsChange={onGoalsChange}
      />

      <p className="text-xs text-gray-600 text-center">
        I dati vengono salvati automaticamente
      </p>
    </div>
  );
}
