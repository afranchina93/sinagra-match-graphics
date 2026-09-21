import { useState } from 'react';
import { AppIcon } from '../ui/AppIcon';
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

const labelCls = 'block text-[9px] uppercase tracking-[0.14em] text-app-muted mb-1.5';
const inputCls = 'bg-app-surface border border-white/10 text-app-text text-[12px] rounded-md px-2.5 py-2 focus:outline-none focus:border-app-signal/60 transition-colors';

function GoalCounter({
  label, value, onChange,
}: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[9px] text-app-muted uppercase tracking-[0.14em]">{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-9 h-9 rounded-md bg-app-raised border border-white/10 hover:border-white/20 text-app-text font-bold text-lg flex items-center justify-center transition-colors"
        >−</button>
        <span className="text-app-text font-condensed font-black text-3xl w-10 text-center">
          {value}
        </span>
        <button
          onClick={() => onChange(value + 1)}
          className="w-9 h-9 rounded-md bg-app-raised border border-white/10 hover:border-white/20 text-app-text font-bold text-lg flex items-center justify-center transition-colors"
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
            <div key={g.id} className="flex items-center gap-2 px-3 py-2 rounded-md bg-app-surface border border-white/10 group">
              <span className="text-[13px] font-condensed font-bold text-red-400 w-9 shrink-0">
                {g.minute}&apos;
              </span>
              <span className="text-[13px] text-app-text flex-1 uppercase tracking-wide">{g.playerName}</span>
              {g.note && (
                <span className="text-[11px] font-bold text-app-signal shrink-0">({g.note})</span>
              )}
              <button
                onClick={() => remove(g.id)}
                className="text-app-dim hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <AppIcon name="trash" size={13} />
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
              className={`px-2 py-2 rounded-md text-[11px] font-bold uppercase tracking-wide transition-colors ${
                note === value
                  ? 'bg-app-signal text-[#111710]'
                  : 'bg-app-surface text-app-muted border border-white/10 hover:border-app-signal/40'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button onClick={add} className="text-app-signal hover:text-[#f0ff66] transition-colors">
          <AppIcon name="plus" size={16} />
        </button>
      </div>
    </div>
  );
}

export function ResultForm({ match, goals, phase, onPhaseChange, onChange, onGoalsChange, players }: ResultFormProps) {
  return (
    <div className="space-y-5">
      <h2 className="font-condensed text-[15px] font-bold uppercase text-app-text border-b border-white/10 pb-2">
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
              className={`flex-1 py-2.5 rounded-md text-[11px] font-bold uppercase tracking-[0.04em] transition-colors ${
                phase === p
                  ? 'bg-app-signal text-[#111710]'
                  : 'bg-app-surface text-app-muted border border-white/10 hover:border-app-signal/40'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>Gol</label>
        <div className="flex items-center justify-around bg-app-surface border border-white/10 rounded-lg p-5">
          <GoalCounter
            label="Casa"
            value={match.homeGoals}
            onChange={(v) => onChange({ ...match, homeGoals: v })}
          />
          <span className="text-app-dim font-condensed font-black text-3xl">—</span>
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

      <p className="text-[11px] text-app-dim text-center">
        I dati vengono salvati automaticamente
      </p>
    </div>
  );
}
