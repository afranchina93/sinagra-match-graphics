import type { ReactNode } from 'react';
import { useRef, useState, useEffect, useCallback } from 'react';
import { Download, Users, Settings, List, CalendarDays } from 'lucide-react';
import { FormationPoster } from './components/graphics/FormationPoster';
import { MatchForm } from './components/match/MatchForm';
import { LineupSelector } from './components/match/LineupSelector';
import { RosterManager } from './components/match/RosterManager';
import { MatchList } from './components/match/MatchList';
import type {
  Player, Team, Competition, Match, MatchView,
  MatchConfig, Lineup,
} from './domain/types';
import {
  getCurrentMatchId, setCurrentMatchId, clearCurrentMatchId,
} from './storage/localStorage';
import { formationLayouts } from './domain/formations';
import {
  loadPlayers, upsertPlayer, deletePlayer,
  loadTeams, upsertTeam, uploadTeamLogo,
  loadCompetitions, upsertCompetition,
  loadMatches, createMatch, updateMatch, deleteMatch, loadMatchView,
  saveMatchLineup,
} from './storage/db';
import { exportAsPng } from './export/exportImage';

type Tab = 'matches' | 'match' | 'lineup' | 'roster';

export default function App() {
  const previewRef = useRef<HTMLDivElement>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentMatchId, setCurrentMatchIdState] = useState<string | null>(getCurrentMatchId());
  const [currentView, setCurrentView] = useState<MatchView | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('matches');
  const [exporting, setExporting] = useState(false);
  const [saved, setSaved] = useState(false);
  const isInitialLoad = useRef(true);

  // Mount: carica tutto
  useEffect(() => {
    Promise.all([loadPlayers(), loadTeams(), loadCompetitions(), loadMatches()])
      .then(([p, t, c, m]) => {
        setPlayers(p);
        setTeams(t);
        setCompetitions(c);
        setMatches(m);
        setLoading(false);
      });
  }, []);

  // Quando currentMatchId cambia, carica la view
  useEffect(() => {
    if (!currentMatchId) return;
    isInitialLoad.current = true;
    loadMatchView(currentMatchId).then((view) => {
      if (view) {
        setCurrentView(view);
        // Dopo il caricamento iniziale, reset flag
        setTimeout(() => { isInitialLoad.current = false; }, 0);
      }
    });
  }, [currentMatchId]);

  // Autosave debounced 1.5s su match + lineup
  useEffect(() => {
    if (!currentView || isInitialLoad.current) return;
    setSaved(false);
    const t1 = setTimeout(() => {
      Promise.all([
        updateMatch(currentView.match),
        saveMatchLineup(currentView.match.id, currentView.starters, currentView.bench),
      ]).then(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 1200);
      });
    }, 1500);
    return () => clearTimeout(t1);
  }, [currentView]);

  // ── Creazione nuova partita ───────────────────────────────────────────────

  async function handleCreateMatch() {
    const defaultComp = competitions[0] ?? null;
    const newMatch = await createMatch({
      opponentId: null,
      isHome: true,
      matchDate: null,
      competitionId: defaultComp?.id ?? null,
      matchday: '',
      formation: '4-3-3',
      stadium: 'Campo Sportivo Sinagra',
      coach: 'Andrea Ioppolo',
    });
    setMatches((prev) => [newMatch, ...prev]);
    setCurrentMatchIdState(newMatch.id);
    setCurrentMatchId(newMatch.id);
    setCurrentView({ match: newMatch, opponent: null, starters: {}, bench: [] });
    isInitialLoad.current = false;
    setTab('match');
  }

  // ── Selezione partita ─────────────────────────────────────────────────────

  function handleSelectMatch(id: string) {
    setCurrentMatchIdState(id);
    setCurrentMatchId(id);
    setTab('match');
  }

  // ── Eliminazione partita ──────────────────────────────────────────────────

  async function handleDeleteMatch(id: string) {
    if (!confirm('Eliminare questa partita?')) return;
    await deleteMatch(id);
    setMatches((prev) => prev.filter((m) => m.id !== id));
    if (currentMatchId === id) {
      setCurrentMatchIdState(null);
      setCurrentView(null);
      clearCurrentMatchId();
      setTab('matches');
    }
  }

  // ── Aggiornamento match config ────────────────────────────────────────────

  const setMatch = useCallback((match: Match) => {
    setCurrentView((v) => {
      if (!v) return v;
      if (v.match.formation !== match.formation) {
        const layout = formationLayouts[match.formation];
        if (layout) {
          const validSlots = new Set(layout.slots.map((s) => s.id));
          const filteredStarters = Object.fromEntries(
            Object.entries(v.starters).filter(([slotId]) => validSlots.has(slotId))
          );
          return { ...v, match, starters: filteredStarters };
        }
      }
      return { ...v, match };
    });
    setMatches((prev) => prev.map((m) => (m.id === match.id ? match : m)));
  }, []);

  // ── Aggiornamento lineup ──────────────────────────────────────────────────

  const setLineup = useCallback((lineup: Lineup) => {
    setCurrentView((v) =>
      v
        ? {
            ...v,
            starters: lineup.starters,
            bench: lineup.bench,
            match: { ...v.match, coach: lineup.coach },
          }
        : v
    );
  }, []);

  // ── Team callbacks ────────────────────────────────────────────────────────

  const handleAddTeam = useCallback(async (name: string): Promise<Team> => {
    const team = await upsertTeam({ name, logoUrl: null });
    setTeams((prev) => [...prev, team].sort((a, b) => a.name.localeCompare(b.name)));
    return team;
  }, []);

  const handleUploadLogo = useCallback(
    async (teamId: string, file: File): Promise<void> => {
      const url = await uploadTeamLogo(teamId, file);
      const updatedTeam = await upsertTeam({ id: teamId, name: teams.find(t => t.id === teamId)!.name, logoUrl: url });
      setTeams((prev) => prev.map((t) => (t.id === teamId ? updatedTeam : t)));
      // Aggiorna anche opponent nella currentView
      setCurrentView((v) =>
        v && v.match.opponentId === teamId
          ? { ...v, opponent: updatedTeam }
          : v
      );
    },
    [teams]
  );

  // ── Competition callbacks ─────────────────────────────────────────────────

  const handleAddCompetition = useCallback(
    async (name: string): Promise<Competition> => {
      const comp = await upsertCompetition(name, '2024/25');
      setCompetitions((prev) => [...prev, comp].sort((a, b) => a.name.localeCompare(b.name)));
      return comp;
    },
    []
  );

  // ── Player callbacks ──────────────────────────────────────────────────────

  const handleUpsertPlayer = useCallback(async (player: Omit<Player, 'id'> & { id?: string }) => {
    const saved = await upsertPlayer(player);
    setPlayers((prev) =>
      player.id
        ? prev.map((p) => (p.id === player.id ? saved : p))
        : [...prev, saved]
    );
  }, []);

  const handleDeletePlayer = useCallback(async (id: string) => {
    await deletePlayer(id);
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // ── Export ────────────────────────────────────────────────────────────────

  async function handleExport() {
    if (!previewRef.current) return;
    setExporting(true);
    try {
      const opponent = currentView?.opponent?.name || 'avversario';
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

  // ── Adapter: MatchView → FormationPoster props ────────────────────────────

  const activeRoster = players.filter((p) => p.active);

  const posterMatchConfig: MatchConfig = currentView
    ? {
        opponent: currentView.opponent?.name ?? '',
        isHome: currentView.match.isHome,
        date: currentView.match.matchDate ?? '',
        competition:
          competitions.find((c) => c.id === currentView.match.competitionId)?.name ?? '',
        matchday: currentView.match.matchday,
        formation: currentView.match.formation,
        stadium: currentView.match.stadium,
        opponentLogo: currentView.opponent?.logoUrl ?? undefined,
      }
    : {
        opponent: '', isHome: true, date: '', competition: '',
        matchday: '', formation: '4-3-3', stadium: '', opponentLogo: undefined,
      };

  const posterLineup: Lineup = currentView
    ? { starters: currentView.starters, bench: currentView.bench, coach: currentView.match.coach }
    : { starters: {}, bench: [], coach: '' };

  // ── Tabs ──────────────────────────────────────────────────────────────────

  const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'matches',  label: 'Partite',    icon: <CalendarDays size={14} /> },
    { id: 'match',    label: 'Partita',    icon: <Settings size={14} /> },
    { id: 'lineup',   label: 'Formazione', icon: <List size={14} /> },
    { id: 'roster',   label: 'Rosa',       icon: <Users size={14} /> },
  ];

  const hasMatch = !!currentView;

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* LEFT PANEL */}
      <div className="w-80 flex flex-col bg-gray-900 border-r border-gray-800 shrink-0">
        {/* Header */}
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
              onClick={() => {
                if (t.id !== 'matches' && !hasMatch) return;
                setTab(t.id);
              }}
              className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                tab === t.id
                  ? 'text-yellow-400 border-b-2 border-yellow-400 bg-gray-800'
                  : t.id !== 'matches' && !hasMatch
                  ? 'text-gray-700 cursor-not-allowed'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4">
          {loading && (
            <p className="text-xs text-gray-500 text-center py-8">Caricamento...</p>
          )}

          {!loading && tab === 'matches' && (
            <MatchList
              matches={matches}
              teams={teams}
              competitions={competitions}
              currentMatchId={currentMatchId}
              onSelect={handleSelectMatch}
              onCreate={handleCreateMatch}
              onDelete={handleDeleteMatch}
            />
          )}

          {!loading && tab === 'match' && currentView && (
            <MatchForm
              match={currentView.match}
              opponent={currentView.opponent}
              teams={teams}
              competitions={competitions}
              onChange={setMatch}
              onAddTeam={handleAddTeam}
              onAddCompetition={handleAddCompetition}
              onUploadLogo={handleUploadLogo}
            />
          )}

          {!loading && tab === 'lineup' && currentView && (
            <LineupSelector
              roster={activeRoster}
              formation={currentView.match.formation}
              lineup={posterLineup}
              onChange={setLineup}
            />
          )}

          {!loading && tab === 'roster' && (
            <RosterManager
              players={players}
              onUpsert={handleUpsertPlayer}
              onDelete={handleDeletePlayer}
            />
          )}

          {!loading && tab !== 'matches' && !currentView && (
            <div className="text-center py-8">
              <p className="text-xs text-gray-500 mb-3">Nessuna partita selezionata</p>
              <button
                onClick={() => setTab('matches')}
                className="text-xs text-yellow-400 hover:text-yellow-300 font-semibold"
              >
                Vai alle partite →
              </button>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="p-4 border-t border-gray-800 space-y-2">
          <div
            className={`text-xs text-center transition-opacity ${
              saved ? 'text-green-400' : 'text-gray-600'
            }`}
          >
            {saved ? '✓ Salvato' : 'Salvataggio automatico attivo'}
          </div>

          <button
            onClick={handleExport}
            disabled={exporting || !hasMatch}
            className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-gray-900 text-sm font-black py-3 rounded transition-colors uppercase tracking-wide"
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
              roster={activeRoster}
              matchConfig={posterMatchConfig}
              lineup={posterLineup}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
