import type { ReactNode } from 'react';
import { useRef, useState, useEffect, useCallback } from 'react';
import { Download, RotateCcw, Copy, Users, Settings, List } from 'lucide-react';
import { FormationPoster } from './components/graphics/FormationPoster';
import { MatchForm } from './components/match/MatchForm';
import { LineupSelector } from './components/match/LineupSelector';
import { RosterManager } from './components/match/RosterManager';
import { defaultRoster, defaultLineupStarters, defaultBench, defaultCoach } from './domain/roster';
import type { AppState, MatchConfig, Lineup, Player } from './domain/types';
import { saveState, loadState, clearState } from './storage/localStorage';
import { exportAsPng } from './export/exportImage';

const DEFAULT_MATCH_CONFIG: MatchConfig = {
  opponent: '',
  isHome: true,
  date: '',
  competition: 'Campionato di Promozione',
  matchday: 'Giornata 1',
  formation: '4-3-3',
  stadium: 'Campo Sportivo Sinagra',
};

const DEFAULT_LINEUP: Lineup = {
  starters: defaultLineupStarters,
  bench: defaultBench,
  coach: defaultCoach,
};

const DEFAULT_STATE: AppState = {
  roster: defaultRoster,
  matchConfig: DEFAULT_MATCH_CONFIG,
  lineup: DEFAULT_LINEUP,
};

type Tab = 'match' | 'lineup' | 'roster';

export default function App() {
  const previewRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<AppState>(() => loadState() ?? DEFAULT_STATE);
  const [tab, setTab] = useState<Tab>('match');
  const [exporting, setExporting] = useState(false);
  const [saved, setSaved] = useState(false);

  // Autosave on state changes
  useEffect(() => {
    saveState(state);
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 1200);
    return () => clearTimeout(t);
  }, [state]);

  const setMatchConfig = useCallback((matchConfig: MatchConfig) => {
    setState((s) => ({ ...s, matchConfig }));
  }, []);

  const setLineup = useCallback((lineup: Lineup) => {
    setState((s) => ({ ...s, lineup }));
  }, []);

  const setRoster = useCallback((roster: Player[]) => {
    setState((s) => ({ ...s, roster }));
  }, []);

  function handleReset() {
    if (!confirm('Vuoi resettare tutto ai valori predefiniti?')) return;
    clearState();
    setState(DEFAULT_STATE);
  }

  function handleDuplicate() {
    setState((s) => ({
      ...s,
      matchConfig: { ...s.matchConfig, opponent: '', date: '' },
    }));
  }

  async function handleExport() {
    if (!previewRef.current) return;
    setExporting(true);
    try {
      const opponent = state.matchConfig.opponent || 'avversario';
      await exportAsPng(
        previewRef.current,
        `sinagra-vs-${opponent.toLowerCase().replace(/\s+/g, '-')}.png`
      );
    } catch (err) {
      console.error('Export failed:', err);
      alert("Errore durante l'esportazione. Riprova.");
    } finally {
      setExporting(false);
    }
  }

  const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'match', label: 'Partita', icon: <Settings size={14} /> },
    { id: 'lineup', label: 'Formazione', icon: <List size={14} /> },
    { id: 'roster', label: 'Rosa', icon: <Users size={14} /> },
  ];

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* LEFT PANEL */}
      <div className="w-80 flex flex-col bg-gray-900 border-r border-gray-800 shrink-0">
        {/* Panel header */}
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-sm font-black text-white uppercase tracking-widest leading-tight">
            Sinagra Match
          </h1>
          <p className="text-xs text-yellow-400 font-semibold mt-0.5">Graphics Generator</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                tab === t.id
                  ? 'text-yellow-400 border-b-2 border-yellow-400 bg-gray-800'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4">
          {tab === 'match' && (
            <MatchForm config={state.matchConfig} onChange={setMatchConfig} />
          )}
          {tab === 'lineup' && (
            <LineupSelector
              roster={state.roster}
              formation={state.matchConfig.formation}
              lineup={state.lineup}
              onChange={setLineup}
            />
          )}
          {tab === 'roster' && (
            <RosterManager roster={state.roster} onChange={setRoster} />
          )}
        </div>

        {/* Action buttons */}
        <div className="p-4 border-t border-gray-800 space-y-2">
          <div
            className={`text-xs text-center transition-opacity ${
              saved ? 'text-green-400' : 'text-gray-600'
            }`}
          >
            {saved ? '✓ Salvato automaticamente' : 'Salvataggio automatico attivo'}
          </div>

          <button
            onClick={handleDuplicate}
            className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold py-2.5 rounded transition-colors border border-gray-700"
          >
            <Copy size={14} />
            Duplica ultima formazione
          </button>

          <button
            onClick={handleReset}
            className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm font-semibold py-2.5 rounded transition-colors border border-gray-700"
          >
            <RotateCcw size={14} />
            Reset
          </button>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-gray-900 text-sm font-black py-3 rounded transition-colors uppercase tracking-wide"
          >
            <Download size={16} />
            {exporting ? 'Esportazione...' : 'Esporta PNG'}
          </button>
        </div>
      </div>

      {/* RIGHT PANEL - Preview */}
      <div className="flex-1 overflow-auto bg-gray-950 flex flex-col">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <span className="text-xs text-gray-500 font-semibold uppercase tracking-widest">
            Anteprima — 1080×1350
          </span>
          <span className="text-xs text-gray-600">
            La grafica è in scala ridotta. L&apos;export sarà a risoluzione piena.
          </span>
        </div>

        <div className="flex-1 overflow-auto p-6 flex items-start justify-center">
          <div
            style={{
              transformOrigin: 'top center',
              transform: 'scale(0.55)',
              marginBottom: '-612px',
            }}
          >
            <FormationPoster
              ref={previewRef}
              roster={state.roster}
              matchConfig={state.matchConfig}
              lineup={state.lineup}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
