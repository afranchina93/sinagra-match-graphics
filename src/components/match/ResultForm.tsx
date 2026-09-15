import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Match, Scorer, ScorerNote, ResultPhase, Player } from '../../domain/types';

interface ResultFormProps {
  match: Match;
  phase: ResultPhase;
  onPhaseChange: (phase: ResultPhase) => void;
  onChange: (match: Match) => void;
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

function ScorersList({
  title, scorers, onChange, players,
}: { title: string; scorers: Scorer[]; onChange: (s: Scorer[]) => void; players?: Player[] }) {
  const [minute, setMinute] = useState('');
  const [name, setName] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [note, setNote] = useState<ScorerNote | ''>('');

  const useRoster = !!players && players.length > 0;

  function add() {
    const min = parseInt(minute);
    if (isNaN(min) || min < 1) return;

    let playerName: string;
    if (useRoster) {
      if (!selectedPlayerId) return;
      const p = players.find((pl) => pl.id === selectedPlayerId);
      if (!p) return;
      playerName = p.lastName.toUpperCase();
    } else {
      if (!name.trim()) return;
      playerName = name.trim().toUpperCase();
    }

    const scorer: Scorer = { minute: min, playerName, ...(note ? { note } : {}) };
    const updated = [...scorers, scorer].sort((a, b) => a.minute - b.minute);
    onChange(updated);
    setMinute('');
    setName('');
    setSelectedPlayerId('');
    setNote('');
  }

  function remove(i: number) {
    onChange(scorers.filter((_, idx) => idx !== i));
  }

  const sortedPlayers = useRoster
    ? [...players].sort((a, b) => a.number - b.number)
    : [];

  return (
    <div className="space-y-2">
      <span className={labelCls}>{title}</span>

      {/* Lista marcatori esistenti */}
      {scorers.length > 0 && (
        <div className="space-y-1">
          {scorers.map((s, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-800 group">
              <span className="text-xs font-bold text-red-400 w-8 shrink-0" style={{ fontFamily: 'Impact, sans-serif' }}>
                {s.minute}&apos;
              </span>
              <span className="text-xs text-white flex-1 uppercase tracking-wide">{s.playerName}</span>
              {s.note && (
                <span className="text-xs font-bold text-yellow-400 shrink-0">({s.note})</span>
              )}
              <button
                onClick={() => remove(i)}
                className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Form aggiunta */}
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
        {/* Toggle R / AG — nessuna selezione = gol normale */}
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
        <button
          onClick={add}
          className="text-yellow-400 hover:text-yellow-300"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

export function ResultForm({ match, phase, onPhaseChange, onChange, players }: ResultFormProps) {
  return (
    <div className="space-y-5">
      <h2 className="text-sm font-bold text-yellow-400 uppercase tracking-widest border-b border-gray-700 pb-2">
        Risultato
      </h2>

      {/* Toggle fase */}
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

      {/* Risultato */}
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

      {/* Marcatori casa */}
      <ScorersList
        title="Marcatori casa"
        scorers={match.homeScorers}
        onChange={(s) => onChange({ ...match, homeScorers: s })}
        players={players}
      />

      {/* Marcatori ospiti */}
      <ScorersList
        title={`Marcatori ospiti`}
        scorers={match.awayScorers}
        onChange={(s) => onChange({ ...match, awayScorers: s })}
      />

      <p className="text-xs text-gray-600 text-center">
        I dati vengono salvati automaticamente
      </p>
    </div>
  );
}
