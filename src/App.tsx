import type { ReactNode } from 'react';
import { useRef, useState, useEffect, useCallback } from 'react';
import { Download, Users, Settings, List, CalendarDays, Trophy, ArrowRightLeft } from 'lucide-react';
import { FormationPoster } from './components/graphics/FormationPoster';
import { ResultPoster } from './components/graphics/ResultPoster';
import { SubstitutionPoster } from './components/graphics/SubstitutionPoster';
import { MatchForm } from './components/match/MatchForm';
import { LineupSelector } from './components/match/LineupSelector';
import { RosterManager } from './components/match/RosterManager';
import { MatchList } from './components/match/MatchList';
import { ResultForm } from './components/match/ResultForm';
import { SubstitutionForm } from './components/match/SubstitutionForm';
import type {
  Player, Team, Competition, Match, MatchView,
  MatchConfig, Lineup, ResultConfig, ResultPhase, SubstitutionConfig,
} from './domain/types';
import {
  getCurrentMatchId, setCurrentMatchId, clearCurrentMatchId,
} from './storage/localStorage';
import { formationLayouts } from './domain/formations';
import {
  loadPlayers, upsertPlayer, deletePlayer, deactivatePlayer,
  loadTeams, upsertTeam, uploadTeamLogo,
  loadCompetitions, upsertCompetition,
  loadMatches, createMatch, updateMatch, deleteMatch, loadMatchView,
  saveMatchLineup,
} from './storage/db';
import { exportAsPng, exportAsBase64 } from './export/exportImage';

type Tab = 'matches' | 'match' | 'lineup' | 'roster' | 'result' | 'substitution';

export default function App() {
  const previewRef = useRef<HTMLDivElement>(null);
  const resultPreviewRef = useRef<HTMLDivElement>(null);
  const substitutionPreviewRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(0.55);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentMatchId, setCurrentMatchIdState] = useState<string | null>(getCurrentMatchId());
  const [currentView, setCurrentView] = useState<MatchView | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('matches');
  const [exporting, setExporting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishingIG, setPublishingIG] = useState(false);
  const [fbCaption, setFbCaption] = useState('');
  const [saved, setSaved] = useState(false);
  const [resultPhase, setResultPhase] = useState<ResultPhase>('FULL TIME');
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
        setTimeout(() => { isInitialLoad.current = false; }, 0);
      }
    });
  }, [currentMatchId]);

  // Scale preview dinamico — si adatta alla larghezza del container
  useEffect(() => {
    const el = previewContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const available = el.clientWidth - 48; // p-6 = 24px per lato
      setPreviewScale(Math.min(0.55, available / 1080));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
      homeGoals: 0,
      awayGoals: 0,
      homeScorers: [],
      awayScorers: [],
      substitutions: [],
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

  // ── Substitution callbacks ────────────────────────────────────────────────

  const handleSubAdd = useCallback((entry: import('./domain/types').SubstitutionEntry) => {
    setCurrentView((v) => {
      if (!v) return v;
      return { ...v, match: { ...v.match, substitutions: [...v.match.substitutions, entry] } };
    });
  }, []);

  const handleSubDelete = useCallback((index: number) => {
    setCurrentView((v) => {
      if (!v) return v;
      const subs = v.match.substitutions.filter((_, i) => i !== index);
      return { ...v, match: { ...v.match, substitutions: subs } };
    });
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
    try {
      await deletePlayer(id);
      setPlayers((prev) => prev.filter((p) => p.id !== id));
    } catch {
      // Il giocatore è presente in una o più formazioni salvate (vincolo DB):
      // non può essere eliminato, lo disattiviamo così sparisce dalle rose future
      // senza rompere le formazioni passate.
      await deactivatePlayer(id);
      setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, active: false } : p)));
      alert(
        'Questo giocatore è presente in una formazione salvata e non può essere eliminato: è stato disattivato invece (non comparirà più tra i convocabili).'
      );
    }
    // Rimuove eventuali riferimenti "fantasma" al giocatore dalla partita aperta
    setCurrentView((v) => {
      if (!v) return v;
      const starters = Object.fromEntries(
        Object.entries(v.starters).filter(([, pid]) => pid !== id)
      );
      const bench = v.bench.filter((pid) => pid !== id);
      return { ...v, starters, bench };
    });
  }, []);

  // ── Export ────────────────────────────────────────────────────────────────

  async function handleExport() {
    const ref =
      tab === 'result'       ? resultPreviewRef :
      tab === 'substitution' ? substitutionPreviewRef :
      previewRef;
    if (!ref.current) return;
    setExporting(true);
    try {
      const opponent = currentView?.opponent?.name || 'avversario';
      const slug = opponent.toLowerCase().replace(/\s+/g, '-');
      const suffix =
        tab === 'result'       ? `sinagra-risultato-vs-${slug}.png` :
        tab === 'substitution' ? `sinagra-sostituzione-vs-${slug}.png` :
        `sinagra-vs-${slug}.png`;
      await exportAsPng(ref.current, suffix);
    } catch (err) {
      console.error('Export failed:', err);
      alert("Errore durante l'esportazione. Riprova.");
    } finally {
      setExporting(false);
    }
  }

  // ── Pubblica su Instagram Stories ────────────────────────────────────────

  async function handlePublishInstagram() {
    if (!confirm('Sei sicuro di voler pubblicare la Storia su Instagram di Sinagra Calcio?')) return;
    const ref =
      tab === 'result'       ? resultPreviewRef :
      tab === 'substitution' ? substitutionPreviewRef :
      previewRef;
    if (!ref.current) return;
    setPublishingIG(true);
    try {
      const base64 = await exportAsBase64(ref.current);
      const res = await fetch('/api/publish-instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 }),
      });
      const data = await res.json() as { success?: boolean; error?: string; detail?: string };
      if (data.success) {
        alert('✅ Storia pubblicata su Instagram!');
      } else {
        alert(`❌ Errore: ${data.error ?? 'Sconosciuto'}${data.detail ? `\n${data.detail}` : ''}`);
      }
    } catch (err) {
      alert('❌ Errore di rete. Riprova.');
      console.error(err);
    } finally {
      setPublishingIG(false);
    }
  }

  // ── Didascalia Facebook default ───────────────────────────────────────────

  useEffect(() => {
    if (!currentView) return;
    const home = currentView.match.isHome ? 'Sinagra' : (currentView.opponent?.name ?? 'Avversario');
    const away = currentView.match.isHome ? (currentView.opponent?.name ?? 'Avversario') : 'Sinagra';

    let caption = '';
    if (tab === 'lineup' || tab === 'match') {
      caption = `𝗜 𝗻𝗼𝘀𝘁𝗿𝗶 𝟭𝟭 ⚔️\nScendiamo in campo così 💛❤️`;
    } else if (tab === 'result') {
      const hg = currentView.match.homeGoals;
      const ag = currentView.match.awayGoals;
      const score = `${home} ${hg} - ${ag} ${away}`;
      const sinagra = currentView.match.isHome ? 'home' : 'away';

      if (resultPhase === 'LIVE') {
        // Trova l'ultimo marcatore
        const allScorers = [
          ...currentView.match.homeScorers.map(s => ({ ...s, side: 'home' as const })),
          ...currentView.match.awayScorers.map(s => ({ ...s, side: 'away' as const })),
        ].sort((a, b) => b.minute - a.minute);
        const last = allScorers[0];
        const weScored = last?.side === sinagra;
        const goalText = weScored ? '⚽ G O A L L L L L' : '⚽ GOAL';
        const scorerLine = last ? `${last.minute}' ${last.playerName.toUpperCase()}` : '';
        caption = `🔴 𝗟𝗜𝗩𝗘\n\n${goalText}${scorerLine ? `\n\n${scorerLine}` : ''}\n\n${score}`;
      } else if (resultPhase === 'HALF TIME') {
        caption = `${hg}-${ag} 𝗮𝗹𝗹'𝗶𝗻𝘁𝗲𝗿𝘃𝗮𝗹𝗹𝗼 ⚔️\n💛❤️`;
      } else {
        caption = `𝗙𝗨𝗟𝗟 𝗧𝗜𝗠𝗘 💛❤️`;
      }
    } else if (tab === 'substitution') {
      const sub = currentView.match.substitutions.at(-1);
      const out = sub?.playerOut.name || 'N/A';
      const inn = sub?.playerIn.name || 'N/A';
      const min = sub?.minute ? `${sub.minute}' | ` : '';
      caption = `🔄 ${min}Entra ${inn.toUpperCase()}, esce ${out.toUpperCase()}\n💛❤️`;
    }
    setFbCaption(caption);
  }, [tab, currentView, resultPhase]);

  // ── Pubblica su Facebook ──────────────────────────────────────────────────

  async function handlePublishFacebook() {
    if (!confirm('Sei sicuro di voler pubblicare sulla pagina Facebook di Sinagra Calcio?')) return;
    const ref =
      tab === 'result'       ? resultPreviewRef :
      tab === 'substitution' ? substitutionPreviewRef :
      previewRef;
    if (!ref.current) return;
    setPublishing(true);
    try {
      const base64 = await exportAsBase64(ref.current);
      const res = await fetch('/api/publish-facebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, caption: fbCaption }),
      });
      const data = await res.json() as { success?: boolean; error?: string; detail?: string };
      if (data.success) {
        alert('✅ Pubblicato su Facebook!');
      } else {
        alert(`❌ Errore: ${data.error ?? 'Sconosciuto'}${data.detail ? `\n${data.detail}` : ''}`);
      }
    } catch (err) {
      alert('❌ Errore di rete. Riprova.');
      console.error(err);
    } finally {
      setPublishing(false);
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

  // ── Adapter: MatchView → ResultPoster props ───────────────────────────────

  const competition = currentView
    ? competitions.find((c) => c.id === currentView.match.competitionId)?.name ?? ''
    : '';

  const posterResultConfig: ResultConfig = currentView
    ? {
        phase: resultPhase,
        matchday: currentView.match.matchday,
        competition,
        date: currentView.match.matchDate ?? '',
        stadium: currentView.match.stadium,
        homeTeam: currentView.match.isHome ? 'SINAGRA' : (currentView.opponent?.name ?? 'OSPITI'),
        awayTeam: currentView.match.isHome ? (currentView.opponent?.name ?? 'OSPITI') : 'SINAGRA',
        homeLogo: currentView.match.isHome ? undefined : (currentView.opponent?.logoUrl ?? undefined),
        awayLogo: currentView.match.isHome ? (currentView.opponent?.logoUrl ?? undefined) : undefined,
        homeGoals: currentView.match.homeGoals,
        awayGoals: currentView.match.awayGoals,
        homeScorers: currentView.match.homeScorers,
        awayScorers: currentView.match.awayScorers,
      }
    : {
        phase: 'FULL TIME',
        matchday: '', competition: '', date: '', stadium: '',
        homeTeam: 'SINAGRA', awayTeam: 'AVVERSARIO',
        homeGoals: 0, awayGoals: 0, homeScorers: [], awayScorers: [],
      };

  // ── Adapter: MatchView → SubstitutionPoster props ────────────────────────

  const lastSub = currentView?.match.substitutions.at(-1);
  const posterSubstitutionConfig: SubstitutionConfig = currentView
    ? {
        minute: lastSub?.minute ?? '',
        playerOut: lastSub?.playerOut ?? { number: 0, name: '' },
        playerIn:  lastSub?.playerIn  ?? { number: 0, name: '' },
        matchday: currentView.match.matchday,
        competition,
        date: currentView.match.matchDate ?? '',
        stadium: currentView.match.stadium,
        homeTeam: currentView.match.isHome ? 'SINAGRA' : (currentView.opponent?.name ?? 'OSPITI'),
        awayTeam: currentView.match.isHome ? (currentView.opponent?.name ?? 'OSPITI') : 'SINAGRA',
        homeLogo: currentView.match.isHome ? undefined : (currentView.opponent?.logoUrl ?? undefined),
        awayLogo: currentView.match.isHome ? (currentView.opponent?.logoUrl ?? undefined) : undefined,
      }
    : {
        minute: '', playerOut: { number: 0, name: '' }, playerIn: { number: 0, name: '' },
        matchday: '', competition: '', date: '', stadium: '',
        homeTeam: 'SINAGRA', awayTeam: 'AVVERSARIO',
      };

  // ── Tabs ──────────────────────────────────────────────────────────────────

  const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'matches',      label: 'Partite',       icon: <CalendarDays size={14} /> },
    { id: 'match',        label: 'Partita',       icon: <Settings size={14} /> },
    { id: 'lineup',       label: 'Formazione',    icon: <List size={14} /> },
    { id: 'result',       label: 'Risultato',     icon: <Trophy size={14} /> },
    { id: 'substitution', label: 'Sostituzione',  icon: <ArrowRightLeft size={14} /> },
    { id: 'roster',       label: 'Rosa',          icon: <Users size={14} /> },
  ];

  const hasMatch = !!currentView;
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* LEFT PANEL */}
      <div className={`${showMobilePreview ? 'hidden' : 'flex'} md:flex w-full md:w-80 flex-col bg-gray-900 border-r border-gray-800 md:shrink-0`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-sm font-black text-white uppercase tracking-widest leading-tight">
            Sinagra Match
          </h1>
          <p className="text-xs text-yellow-400 font-semibold mt-0.5">Graphics Generator</p>
        </div>

        {/* Tabs — griglia 3×2 per 6 voci */}
        <div className="grid grid-cols-3 border-b border-gray-800">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                if (t.id !== 'matches' && !hasMatch) return;
                setTab(t.id);
              }}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-bold uppercase tracking-wide transition-colors border-b-2 ${
                tab === t.id
                  ? 'text-yellow-400 border-yellow-400 bg-gray-800'
                  : t.id !== 'matches' && !hasMatch
                  ? 'text-gray-700 cursor-not-allowed border-transparent'
                  : 'text-gray-500 hover:text-gray-300 border-transparent'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
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

          {!loading && tab === 'result' && currentView && (
            <ResultForm
              match={currentView.match}
              phase={resultPhase}
              onPhaseChange={setResultPhase}
              onChange={setMatch}
              players={activeRoster}
            />
          )}

          {!loading && tab === 'substitution' && currentView && (
            <SubstitutionForm
              substitutions={currentView.match.substitutions}
              onAdd={handleSubAdd}
              onDelete={handleSubDelete}
              players={activeRoster}
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
            onClick={() => setShowMobilePreview(true)}
            disabled={!hasMatch}
            className="md:hidden w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white text-sm font-black py-3 rounded transition-colors uppercase tracking-wide"
          >
            Anteprima
          </button>

          <button
            onClick={handleExport}
            disabled={exporting || !hasMatch}
            className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-gray-900 text-sm font-black py-3 rounded transition-colors uppercase tracking-wide"
          >
            <Download size={16} />
            {exporting ? 'Esportazione...' : 'Esporta PNG'}
          </button>

          <textarea
            value={fbCaption}
            onChange={(e) => setFbCaption(e.target.value)}
            placeholder="Testo del post Facebook..."
            rows={3}
            className="w-full bg-gray-800 text-white text-xs rounded p-2 resize-none border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-500"
          />

          <button
            onClick={handlePublishFacebook}
            disabled={publishing || !hasMatch}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-black py-3 rounded transition-colors uppercase tracking-wide"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            {publishing ? 'Pubblicazione...' : 'Pubblica su Facebook'}
          </button>

          <button
            onClick={handlePublishInstagram}
            disabled={publishingIG || !hasMatch}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 disabled:opacity-40 text-white text-sm font-black py-3 rounded transition-colors uppercase tracking-wide"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
            </svg>
            {publishingIG ? 'Pubblicazione...' : 'Pubblica Storia Instagram'}
          </button>
        </div>
      </div>

      {/* RIGHT PANEL - Preview */}
      <div className={`${showMobilePreview ? 'flex' : 'hidden'} md:flex flex-1 overflow-auto bg-gray-950 flex-col`}>
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <button
            onClick={() => setShowMobilePreview(false)}
            className="md:hidden text-xs text-yellow-400 font-bold uppercase tracking-wide"
          >
            ← Torna
          </button>
          <span className="hidden md:inline text-xs text-gray-500 font-semibold uppercase tracking-widest">
            {tab === 'result'       ? 'Anteprima Risultato — 1080×1350'
           : tab === 'substitution' ? 'Anteprima Sostituzione — 1080×1350'
           : 'Anteprima Formazione — 1080×1350'}
          </span>
          <span className="text-xs text-gray-600">
            La grafica è in scala ridotta. L&apos;export sarà a risoluzione piena.
          </span>
        </div>

        <div ref={previewContainerRef} className="flex-1 overflow-auto p-6 flex items-start justify-center">
          {/* Wrapper con dimensioni visive reali — evita overflow su mobile */}
          <div style={{
            width: Math.round(1080 * previewScale),
            height: Math.round(1350 * previewScale),
            flexShrink: 0,
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute',
              top: 0, left: 0,
              transformOrigin: 'top left',
              transform: `scale(${previewScale})`,
            }}>
              {tab === 'result' ? (
                <ResultPoster
                  ref={resultPreviewRef}
                  config={posterResultConfig}
                />
              ) : tab === 'substitution' ? (
                <SubstitutionPoster
                  ref={substitutionPreviewRef}
                  config={posterSubstitutionConfig}
                />
              ) : (
                <FormationPoster
                  ref={previewRef}
                  roster={activeRoster}
                  matchConfig={posterMatchConfig}
                  lineup={posterLineup}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
