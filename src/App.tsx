import type { ReactNode } from 'react';
import { useRef, useState, useEffect, useCallback } from 'react';
import { Download, Users, Settings, List, CalendarDays, Trophy, ArrowRightLeft, Eye, X, FileText } from 'lucide-react';
import { AppIcon } from './components/ui/AppIcon';
import { LoginScreen } from './components/auth/LoginScreen';
import { FormationPoster } from './components/graphics/FormationPoster';
import { ResultPoster } from './components/graphics/ResultPoster';
import { SubstitutionPoster } from './components/graphics/SubstitutionPoster';
import { MatchForm } from './components/match/MatchForm';
import { LineupSelector } from './components/match/LineupSelector';
import { RosterManager } from './components/match/RosterManager';
import { MatchList } from './components/match/MatchList';
import { ResultForm } from './components/match/ResultForm';
import { SubstitutionForm } from './components/match/SubstitutionForm';
import { DistintaForm } from './components/match/DistintaForm';
import { DistintaSheet } from './components/distinta/DistintaSheet';
import { PlayerPage } from './components/match/PlayerPage';
import type {
  Player, Team, Competition, Match, MatchView,
  MatchConfig, Lineup, ResultConfig, ResultPhase, SubstitutionConfig,
  MatchGoal, MatchSubstitution, StaffPerson,
} from './domain/types';
import type { ClubConfig } from './domain/distinta';
import { DEFAULT_CLUB_CONFIG } from './domain/distinta';
import {
  getCurrentMatchId, setCurrentMatchId, clearCurrentMatchId,
} from './storage/localStorage';
import { formationLayouts } from './domain/formations';
import {
  loadPlayers, upsertPlayer, deletePlayer,
  loadTeams, upsertTeam, uploadTeamLogo,
  loadCompetitions, upsertCompetition,
  loadMatches, createMatch, updateMatch, deleteMatch, loadMatchView,
  saveMatchLineup, saveMatchGoals, saveMatchSubstitutions,
  loadClubConfig, saveClubConfig,
  loadStaff, upsertStaff, deleteStaff,
} from './storage/db';
import { exportAsPng, exportAsBase64, exportAsDistintaPdf, type FormationExportData } from './export/exportImage';
import { supabase } from './storage/supabaseClient';

type Tab = 'matches' | 'match' | 'lineup' | 'roster' | 'result' | 'substitution' | 'distinta';
type MainTab = 'matches' | 'roster' | 'match';
type SubTab = 'match' | 'lineup' | 'distinta' | 'result' | 'substitution';

export default function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (authed === null) return (
    <div className="min-h-screen bg-app-canvas flex items-center justify-center">
      <AppIcon name="spinner" size={24} className="animate-spin text-app-signal" />
    </div>
  );
  if (!authed) return <LoginScreen />;

  return <AppInner />;
}

function AppInner() {
  const previewRef = useRef<HTMLDivElement>(null);
  const resultPreviewRef = useRef<HTMLDivElement>(null);
  const substitutionPreviewRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const modalPreviewContainerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(0.55);
  const [modalPreviewScale, setModalPreviewScale] = useState(0.3);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentMatchId, setCurrentMatchIdState] = useState<string | null>(getCurrentMatchId());
  const [currentView, setCurrentView] = useState<MatchView | null>(null);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<MainTab>('matches');
  const [subTab, setSubTab] = useState<SubTab>('match');
  const tab: Tab = mainTab === 'match' ? subTab : mainTab === 'roster' ? 'roster' : 'matches';
  const [exporting, setExporting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishingIG, setPublishingIG] = useState(false);
  const [fbCaption, setFbCaption] = useState('');
  const [saved, setSaved] = useState(false);
  const [resultPhase, setResultPhase] = useState<ResultPhase>('FULL TIME');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showFbModal, setShowFbModal] = useState(false);
  const [clubConfig, setClubConfig] = useState<ClubConfig>(DEFAULT_CLUB_CONFIG);
  const [staff, setStaff] = useState<StaffPerson[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const isInitialLoad = useRef(true);

  // Mount: carica tutto
  useEffect(() => {
    Promise.all([
      loadPlayers(), loadTeams(), loadCompetitions(), loadMatches(), loadClubConfig(), loadStaff(),
    ]).then(([p, t, c, m, cc, s]) => {
      setPlayers(p);
      setTeams(t);
      setCompetitions(c);
      setMatches(m);
      setClubConfig(cc);
      setStaff(s);
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

  // Scale preview dinamico — desktop
  useEffect(() => {
    const el = previewContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const available = el.clientWidth - 48;
      setPreviewScale(Math.min(0.55, available / 1080));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Scale preview dinamico — modal mobile
  useEffect(() => {
    const el = modalPreviewContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth - 32;
      const h = el.clientHeight - 32;
      setModalPreviewScale(Math.min(w / 1080, h / 1350));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [showPreviewModal]);

  // Autosave debounced 1.5s
  useEffect(() => {
    if (!currentView || isInitialLoad.current) return;
    setSaved(false);
    const t1 = setTimeout(() => {
      Promise.all([
        updateMatch(currentView.match),
        saveMatchLineup(currentView.match.id, currentView.starters, currentView.bench),
        saveMatchGoals(currentView.match.id, currentView.goals),
        saveMatchSubstitutions(currentView.match.id, currentView.substitutions),
      ]).then(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 1200);
      });
    }, 1500);
    return () => clearTimeout(t1);
  }, [currentView]);

  // Autosave club config (debounced)
  useEffect(() => {
    const t1 = setTimeout(() => { saveClubConfig(clubConfig); }, 1500);
    return () => clearTimeout(t1);
  }, [clubConfig]);

  // Reset selected player when leaving roster tab
  useEffect(() => {
    if (mainTab !== 'roster') setSelectedPlayer(null);
  }, [mainTab]);

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
      kickoffTime: '',
      distintaMarkers: {},
    });
    setMatches((prev) => [newMatch, ...prev]);
    setCurrentMatchIdState(newMatch.id);
    setCurrentMatchId(newMatch.id);
    setCurrentView({ match: newMatch, opponent: null, starters: {}, bench: [], goals: [], substitutions: [] });
    isInitialLoad.current = false;
    setMainTab('match'); setSubTab('match');
  }

  // ── Selezione partita ─────────────────────────────────────────────────────

  function handleSelectMatch(id: string) {
    setCurrentMatchIdState(id);
    setCurrentMatchId(id);
    setMainTab('match'); setSubTab('match');
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
      setMainTab('matches');
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
      v ? {
        ...v,
        starters: lineup.starters,
        bench: lineup.bench,
        match: { ...v.match, coach: lineup.coach },
      } : v
    );
  }, []);

  // ── Goals callbacks ───────────────────────────────────────────────────────

  const handleGoalsChange = useCallback((goals: MatchGoal[]) => {
    setCurrentView((v) => v ? { ...v, goals } : v);
  }, []);

  // ── Substitution callbacks ────────────────────────────────────────────────

  const handleSubAdd = useCallback((entry: {
    minute: string;
    playerOutId?: string;
    playerOutNumber: number;
    playerOutName: string;
    playerInId?: string;
    playerInNumber: number;
    playerInName: string;
  }) => {
    setCurrentView((v) => {
      if (!v) return v;
      const newSub: MatchSubstitution = {
        id: crypto.randomUUID(),
        matchId: v.match.id,
        playerOutId: entry.playerOutId,
        playerOutNumber: entry.playerOutNumber,
        playerOutName: entry.playerOutName,
        playerInId: entry.playerInId,
        playerInNumber: entry.playerInNumber,
        playerInName: entry.playerInName,
        minute: entry.minute,
        sortOrder: v.substitutions.length,
      };
      return { ...v, substitutions: [...v.substitutions, newSub] };
    });
  }, []);

  const handleSubDelete = useCallback((index: number) => {
    setCurrentView((v) => {
      if (!v) return v;
      const substitutions = v.substitutions.filter((_, i) => i !== index);
      return { ...v, substitutions };
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
        v && v.match.opponentId === teamId ? { ...v, opponent: updatedTeam } : v
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
    const savedPlayer = await upsertPlayer(player);
    setPlayers((prev) =>
      player.id
        ? prev.map((p) => (p.id === player.id ? savedPlayer : p))
        : [...prev, savedPlayer]
    );
  }, []);

  const handleDeletePlayer = useCallback(async (id: string) => {
    await deletePlayer(id);
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleUpsertStaff = useCallback(async (person: Omit<StaffPerson, 'id'> & { id?: string }) => {
    const saved = await upsertStaff(person);
    setStaff((prev) =>
      person.id
        ? prev.map((s) => (s.id === person.id ? saved : s))
        : [...prev, saved]
    );
    return saved;
  }, []);

  const handleDeleteStaff = useCallback(async (id: string) => {
    await deleteStaff(id);
    setStaff((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // ── Export ────────────────────────────────────────────────────────────────

  function formationServerData(): FormationExportData {
    return { roster: activeRoster, matchConfig: posterMatchConfig, lineup: posterLineup };
  }

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
        tab === 'result'       ? `sinagra-risultato-vs-${slug}.jpg` :
        tab === 'substitution' ? `sinagra-sostituzione-vs-${slug}.jpg` :
        `sinagra-vs-${slug}.jpg`;
      const isFormation = tab !== 'result' && tab !== 'substitution';
      await exportAsPng(ref.current, suffix, isFormation ? formationServerData() : undefined);
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
      const isFormation = tab !== 'result' && tab !== 'substitution';
      const base64 = await exportAsBase64(ref.current, isFormation ? formationServerData() : undefined);
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
        const allGoals = [...currentView.goals].sort((a, b) => b.minute - a.minute);
        const last = allGoals[0];
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
      const sub = currentView.substitutions.at(-1);
      const out = sub?.playerOutName || 'N/A';
      const inn = sub?.playerInName || 'N/A';
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
      const isFormationFb = tab !== 'result' && tab !== 'substitution';
      const base64 = await exportAsBase64(ref.current, isFormationFb ? formationServerData() : undefined);
      const res = await fetch('/api/publish-facebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, caption: fbCaption }),
      });
      const data = await res.json() as { success?: boolean; error?: string; detail?: string };
      if (data.success) {
        alert('✅ Pubblicato su Facebook!');
        setShowFbModal(false);
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
        competition: competitions.find((c) => c.id === currentView.match.competitionId)?.name ?? '',
        matchday: currentView.match.matchday,
        formation: currentView.match.formation,
        stadium: currentView.match.stadium,
        opponentLogo: currentView.opponent?.logoUrl ?? undefined,
      }
    : { opponent: '', isHome: true, date: '', competition: '', matchday: '', formation: '4-3-3', stadium: '', opponentLogo: undefined };

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
        homeScorers: currentView.goals.filter(g => g.side === 'home').map(g => ({
          minute: g.minute, playerName: g.playerName, ...(g.note ? { note: g.note } : {}),
        })),
        awayScorers: currentView.goals.filter(g => g.side === 'away').map(g => ({
          minute: g.minute, playerName: g.playerName, ...(g.note ? { note: g.note } : {}),
        })),
      }
    : {
        phase: 'FULL TIME', matchday: '', competition: '', date: '', stadium: '',
        homeTeam: 'SINAGRA', awayTeam: 'AVVERSARIO',
        homeGoals: 0, awayGoals: 0, homeScorers: [], awayScorers: [],
      };

  // ── Adapter: MatchView → SubstitutionPoster props ────────────────────────

  const lastSub = currentView?.substitutions.at(-1);
  const posterSubstitutionConfig: SubstitutionConfig = currentView
    ? {
        minute: lastSub?.minute ?? '',
        playerOut: lastSub ? { number: lastSub.playerOutNumber, name: lastSub.playerOutName } : { number: 0, name: '' },
        playerIn:  lastSub ? { number: lastSub.playerInNumber,  name: lastSub.playerInName  } : { number: 0, name: '' },
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

  const MAIN_TABS: { id: MainTab; label: string; icon: ReactNode }[] = [
    { id: 'matches', label: 'Partite',  icon: <CalendarDays size={14} /> },
    { id: 'roster',  label: 'Rosa',     icon: <Users size={14} /> },
    { id: 'match',   label: 'Partita',  icon: <Settings size={14} /> },
  ];

  const SUB_TABS: { id: SubTab; label: string; icon: ReactNode }[] = [
    { id: 'match',        label: 'Info',         icon: <Settings size={12} /> },
    { id: 'lineup',       label: 'Formazione',   icon: <List size={12} /> },
    { id: 'distinta',     label: 'Distinta',     icon: <FileText size={12} /> },
    { id: 'result',       label: 'Risultato',    icon: <Trophy size={12} /> },
    { id: 'substitution', label: 'Sostituzioni', icon: <ArrowRightLeft size={12} /> },
  ];

  const hasMatch = !!currentView;
  const showPreview = mainTab === 'match' && (subTab === 'lineup' || subTab === 'result' || subTab === 'substitution') && hasMatch;

  // SVG icons
  const FacebookSVG = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );

  const InstagramSVG = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  );

  return (
    <div className="flex flex-col h-screen bg-app-canvas overflow-hidden">

      {/* ── MOBILE BRAND HEADER ───────────────────────────────────────────── */}
      <header className="md:hidden shrink-0 flex items-center justify-between border-b border-white/[0.08] bg-app-surface px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded border border-app-signal/50 text-app-signal font-condensed font-bold text-sm">S</div>
          <div>
            <div className="font-condensed text-[14px] font-bold uppercase tracking-[0.08em] leading-none text-app-text">Sinagra Match</div>
            <div className="text-[8px] uppercase tracking-[0.13em] text-app-dim mt-0.5">official workspace</div>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 text-[10px] font-semibold transition-colors ${saved ? 'text-app-signal' : 'text-app-dim'}`}>
          {saved && <span className="h-1.5 w-1.5 rounded-full bg-app-signal animate-pulse" />}
          {saved ? 'Salvato' : ''}
        </div>
      </header>

      {/* ── DESKTOP HEADER ──────────────────────────────────────────────────── */}
      <div className="hidden md:flex items-center justify-between bg-app-surface border-b border-white/[0.08] px-5 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded border border-app-signal/50 text-app-signal font-condensed font-bold text-sm">S</div>
          <div>
            <div className="font-condensed text-[15px] font-bold uppercase tracking-[0.08em] text-app-text">Sinagra Match</div>
            <div className="text-[8px] uppercase tracking-[0.12em] text-app-dim">Graphics Generator</div>
          </div>
        </div>
        <span className={`text-[11px] font-semibold transition-colors ${saved ? 'text-app-signal' : 'text-app-dim'}`}>
          {saved ? '✓ Salvato' : 'Salvataggio automatico attivo'}
        </span>
      </div>

      {/* ── DESKTOP MAIN TABS ── */}
      <div className="hidden md:flex bg-app-surface border-b border-white/[0.08] shrink-0">
        {MAIN_TABS.map((t) => {
          const isDisabled = t.id !== 'matches' && !hasMatch;
          return (
            <button
              key={t.id}
              onClick={() => { if (isDisabled) return; setMainTab(t.id); }}
              className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors border-b-2 ${
                mainTab === t.id
                  ? 'text-app-signal border-app-signal bg-app-raised'
                  : isDisabled
                  ? 'text-app-dim cursor-not-allowed border-transparent'
                  : 'text-app-muted hover:text-app-text border-transparent'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── DESKTOP SUB TABS ── */}
      {mainTab === 'match' && hasMatch && (
        <div className="hidden md:flex bg-app-surface border-b border-white/[0.08] shrink-0 pl-2">
          {SUB_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`flex items-center gap-1 px-4 py-2 text-[10px] font-bold uppercase tracking-wide transition-colors border-b-2 ${
                subTab === t.id
                  ? 'text-app-signal border-app-signal'
                  : 'text-app-muted hover:text-app-text border-transparent'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* ── MOBILE MATCH SUB TABS (scrollable) ── */}
      {mainTab === 'match' && hasMatch && (
        <nav className="md:hidden flex gap-5 overflow-x-auto no-scrollbar border-b border-white/[0.08] bg-app-nav px-4 pt-1 shrink-0">
          {SUB_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`relative shrink-0 py-3 text-[11px] uppercase tracking-[0.1em] transition-colors ${
                subTab === t.id ? 'font-bold text-app-signal' : 'text-app-muted'
              }`}
            >
              {t.label}
              {subTab === t.id && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-app-signal" />}
            </button>
          ))}
        </nav>
      )}

      {/* ── CONTENT ROW ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT PANEL ──────────────────────────────────────────────────────── */}
        <div className={`flex w-full flex-col bg-app-surface ${showPreview ? 'md:w-80 md:shrink-0 border-r border-white/[0.08]' : ''}`}>
          <div className={`flex-1 overflow-y-auto no-scrollbar pb-[80px] md:pb-4`}>
            <div className={`p-4 ${!showPreview ? 'md:max-w-4xl md:mx-auto' : ''}`}>
              {loading && <p className="text-xs text-app-muted text-center py-8">Caricamento...</p>}

              {!loading && tab === 'matches' && (
                <MatchList
                  matches={matches} teams={teams} competitions={competitions}
                  currentMatchId={currentMatchId}
                  onSelect={handleSelectMatch} onCreate={handleCreateMatch} onDelete={handleDeleteMatch}
                />
              )}

              {!loading && tab === 'match' && currentView && (
                <MatchForm
                  match={currentView.match} opponent={currentView.opponent}
                  teams={teams} competitions={competitions}
                  onChange={setMatch} onAddTeam={handleAddTeam}
                  onAddCompetition={handleAddCompetition} onUploadLogo={handleUploadLogo}
                />
              )}

              {!loading && tab === 'lineup' && currentView && (
                <LineupSelector
                  roster={activeRoster} formation={currentView.match.formation}
                  lineup={posterLineup} onChange={setLineup}
                  onFormationChange={(f) => setMatch({ ...currentView.match, formation: f })}
                  match={currentView.match}
                  onMatchChange={setMatch}
                />
              )}

              {!loading && tab === 'result' && currentView && (
                <ResultForm
                  match={currentView.match} goals={currentView.goals}
                  phase={resultPhase} onPhaseChange={setResultPhase}
                  onChange={setMatch} onGoalsChange={handleGoalsChange}
                  players={activeRoster}
                />
              )}

              {!loading && tab === 'substitution' && currentView && (
                <SubstitutionForm
                  matchId={currentView.match.id}
                  substitutions={currentView.substitutions}
                  onAdd={handleSubAdd} onDelete={handleSubDelete}
                  players={activeRoster}
                />
              )}

              {!loading && tab === 'roster' && (
                selectedPlayer ? (
                  <PlayerPage player={selectedPlayer} onBack={() => setSelectedPlayer(null)} />
                ) : (
                  <RosterManager
                    players={players} staff={staff}
                    onUpsertPlayer={handleUpsertPlayer} onDeletePlayer={handleDeletePlayer}
                    onUpsertStaff={handleUpsertStaff} onDeleteStaff={handleDeleteStaff}
                    onSelectPlayer={setSelectedPlayer}
                  />
                )
              )}

              {!loading && tab === 'distinta' && currentView && (
                <DistintaForm
                  match={currentView.match}
                  view={currentView}
                  players={activeRoster}
                  staff={staff}
                  clubConfig={clubConfig}
                  onChange={setMatch}
                  onClubConfigChange={setClubConfig}
                  onPrint={async () => {
                    const el = document.querySelector('.distinta-sheet') as HTMLElement | null;
                    if (!el) return;
                    const slug = currentView?.opponent?.name?.toLowerCase().replace(/\s+/g, '-') ?? 'distinta';
                    await exportAsDistintaPdf(el, `distinta-vs-${slug}.pdf`);
                  }}
                />
              )}

              {!loading && tab !== 'matches' && !currentView && (
                <div className="text-center py-8">
                  <p className="text-xs text-app-muted mb-3">Nessuna partita selezionata</p>
                  <button onClick={() => setMainTab('matches')} className="text-xs text-app-signal hover:opacity-80 font-semibold">
                    Vai alle partite →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL - Preview desktop ── */}
        {showPreview && (
          <div className="hidden md:flex flex-1 overflow-hidden bg-app-canvas flex-col">
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between shrink-0">
              <span className="text-xs text-app-muted font-semibold uppercase tracking-widest">
                {tab === 'result' ? 'Anteprima Risultato — 1080×1350'
                : tab === 'substitution' ? 'Anteprima Sostituzione — 1080×1350'
                : 'Anteprima Formazione — 1080×1350'}
              </span>
              <span className="text-xs text-app-dim">Scala ridotta · export a risoluzione piena</span>
            </div>

            <div ref={previewContainerRef} className="flex-1 overflow-auto p-6 flex items-start justify-center min-h-0">
              <div style={{ width: Math.round(1080 * previewScale), height: Math.round(1350 * previewScale), flexShrink: 0, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, transformOrigin: 'top left', transform: `scale(${previewScale})` }}>
                  {tab === 'result' ? (
                    <ResultPoster ref={resultPreviewRef} config={posterResultConfig} />
                  ) : tab === 'substitution' ? (
                    <SubstitutionPoster ref={substitutionPreviewRef} config={posterSubstitutionConfig} />
                  ) : (
                    <FormationPoster ref={previewRef} roster={activeRoster} matchConfig={posterMatchConfig} lineup={posterLineup} />
                  )}
                </div>
              </div>
            </div>

            <div className="shrink-0 p-4 border-t border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-app-muted font-semibold uppercase tracking-widest">Pubblica</span>
                <span className={`text-[11px] font-semibold transition-colors ${saved ? 'text-app-signal' : 'text-app-dim'}`}>
                  {saved ? '✓ Salvato' : 'Auto-save attivo'}
                </span>
              </div>
              <button onClick={handleExport} disabled={exporting}
                className="w-full flex items-center justify-center gap-2 bg-app-signal hover:opacity-90 disabled:opacity-40 text-[#111710] text-sm font-black py-2.5 rounded transition-opacity uppercase tracking-wide">
                <Download size={16} />{exporting ? 'Esportazione...' : 'Esporta JPG'}
              </button>
              <textarea value={fbCaption} onChange={(e) => setFbCaption(e.target.value)}
                placeholder="Testo del post Facebook..." rows={2}
                className="w-full bg-app-raised text-app-text text-xs rounded p-2 resize-none border border-white/10 focus:border-blue-500 focus:outline-none placeholder-app-dim" />
              <div className="grid grid-cols-2 gap-2">
                <button onClick={handlePublishFacebook} disabled={publishing}
                  className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-black py-2.5 rounded transition-colors uppercase tracking-wide">
                  {FacebookSVG}{publishing ? 'Pubbl...' : 'Facebook'}
                </button>
                <button onClick={handlePublishInstagram} disabled={publishingIG}
                  className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 disabled:opacity-40 text-white text-xs font-black py-2.5 rounded transition-colors uppercase tracking-wide">
                  {InstagramSVG}{publishingIG ? 'Pubbl...' : 'Instagram'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>{/* /content row */}

      {/* ── MOBILE: Preview FAB ── */}
      {showPreview && (
        <button
          onClick={() => setShowPreviewModal(true)}
          className="md:hidden fixed bottom-[88px] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-app-signal text-[#111710] shadow-lg shadow-black/40 active:scale-95 transition-transform"
        >
          <Eye size={22} />
        </button>
      )}

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="md:hidden fixed inset-x-0 bottom-0 z-40 grid h-[72px] grid-cols-3 border-t border-white/[0.08] bg-app-nav/95 px-3 pb-2 pt-2 backdrop-blur-sm">
        {MAIN_TABS.map((t) => {
          const isDisabled = t.id !== 'matches' && !hasMatch;
          const isActive = mainTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => { if (!isDisabled) setMainTab(t.id as MainTab); }}
              disabled={isDisabled}
              className={`relative flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive ? 'text-app-signal' : isDisabled ? 'text-app-dim' : 'text-app-muted'
              }`}
            >
              {t.id === 'matches' ? <CalendarDays size={18} /> : t.id === 'roster' ? <Users size={18} /> : <Settings size={18} />}
              <span className="text-[9px] font-semibold uppercase tracking-wide">{t.label}</span>
              {isActive && <span className="absolute bottom-0 h-1 w-1 rounded-full bg-app-signal" />}
            </button>
          );
        })}
      </nav>

      {/* ── PREVIEW MODAL (mobile) ── */}
      {showPreviewModal && (
        <div className="md:hidden fixed inset-0 z-50 bg-app-canvas flex flex-col">
          <header className="flex items-center justify-between px-4 border-b border-white/[0.08] bg-app-surface h-[52px] shrink-0">
            <button onClick={() => setShowPreviewModal(false)}
              className="flex items-center gap-2 text-app-signal font-bold text-sm uppercase tracking-wide">
              <AppIcon name="close" size={16} /> Chiudi
            </button>
            <span className="text-[10px] text-app-muted font-semibold uppercase tracking-widest">
              {tab === 'result' ? 'Risultato' : tab === 'substitution' ? 'Sostituzione' : 'Formazione'}
            </span>
          </header>

          <div ref={modalPreviewContainerRef} className="flex-1 overflow-auto flex items-start justify-center p-4">
            <div style={{ width: Math.round(1080 * modalPreviewScale), height: Math.round(1350 * modalPreviewScale), flexShrink: 0, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, transformOrigin: 'top left', transform: `scale(${modalPreviewScale})` }}>
                {tab === 'result' ? (
                  <ResultPoster ref={resultPreviewRef} config={posterResultConfig} />
                ) : tab === 'substitution' ? (
                  <SubstitutionPoster ref={substitutionPreviewRef} config={posterSubstitutionConfig} />
                ) : (
                  <FormationPoster ref={previewRef} roster={activeRoster} matchConfig={posterMatchConfig} lineup={posterLineup} />
                )}
              </div>
            </div>
          </div>

          <footer className="flex gap-2 p-4 border-t border-white/[0.08] bg-app-surface shrink-0">
            <button onClick={handleExport} disabled={exporting}
              className="flex-1 flex items-center justify-center gap-2 bg-app-signal disabled:opacity-40 text-[#111710] text-sm font-black py-3 rounded transition-opacity uppercase">
              <Download size={16} />{exporting ? 'Esport...' : 'Esporta JPG'}
            </button>
            <button onClick={() => { setShowPreviewModal(false); setShowFbModal(true); }} disabled={publishing}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-black px-4 py-3 rounded transition-colors">
              {FacebookSVG}
            </button>
            <button onClick={handlePublishInstagram} disabled={publishingIG}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 disabled:opacity-40 text-white text-sm font-black px-4 py-3 rounded transition-colors">
              {InstagramSVG}
            </button>
          </footer>
        </div>
      )}

      {/* ── FB CAPTION MODAL ── */}
      {showFbModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end">
          <div className="bg-app-surface w-full rounded-t-2xl p-4 space-y-3 border-t border-white/[0.08]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-app-text uppercase tracking-wide">Testo post Facebook</h3>
              <button onClick={() => setShowFbModal(false)} className="text-app-muted hover:text-app-text p-1">
                <X size={18} />
              </button>
            </div>
            <textarea value={fbCaption} onChange={(e) => setFbCaption(e.target.value)}
              placeholder="Testo del post..." rows={4}
              className="w-full bg-app-raised text-app-text text-sm rounded p-3 resize-none border border-white/10 focus:border-blue-500 focus:outline-none placeholder-app-dim" />
            <div className="flex gap-2">
              <button onClick={handlePublishFacebook} disabled={publishing}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-black py-3 rounded transition-colors uppercase">
                {FacebookSVG}{publishing ? 'Pubblicazione...' : 'Pubblica'}
              </button>
              <button onClick={() => setShowFbModal(false)}
                className="px-5 py-3 bg-app-raised hover:bg-app-raised/80 text-app-text text-sm font-bold rounded border border-white/10 transition-colors">
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Distinta Sheet (nascosta) ── */}
      {currentView && (
        <div aria-hidden="true" style={{ position: 'fixed', left: '-9999px', top: 0, visibility: 'hidden', pointerEvents: 'none' }}>
          <DistintaSheet
            match={currentView.match} view={currentView} players={activeRoster}
            competition={competition} opponentName={currentView.opponent?.name ?? ''} clubConfig={clubConfig}
          />
        </div>
      )}

    </div>
  );
}
