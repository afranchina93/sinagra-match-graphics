import type { ReactNode } from 'react';
import { useRef, useState, useEffect, useCallback } from 'react';
import { Download, Users, Settings, List, CalendarDays, Trophy, ArrowRightLeft, Eye, X, FileText } from 'lucide-react';
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

type Tab = 'matches' | 'match' | 'lineup' | 'roster' | 'result' | 'substitution' | 'distinta';
type MainTab = 'matches' | 'roster' | 'match';
type SubTab = 'match' | 'lineup' | 'distinta' | 'result' | 'substitution';

export default function App() {
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
    <div className="flex flex-col h-screen bg-gray-950 overflow-hidden">

      {/* ── HEADER — sempre full width ───────────────────────────────────────── */}
      <div className="bg-gray-900 border-b border-gray-800 shrink-0">
        {/* Desktop */}
        <div className="hidden md:flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-sm font-black text-white uppercase tracking-widest leading-tight">Sinagra Match</h1>
            <p className="text-xs text-yellow-400 font-semibold mt-0.5">Graphics Generator</p>
          </div>
          <span className={`text-[11px] font-semibold transition-opacity ${saved ? 'text-green-400' : 'text-gray-600'}`}>
            {saved ? '✓ Salvato' : 'Salvataggio automatico attivo'}
          </span>
        </div>
        {/* Mobile */}
        <div className="md:hidden flex items-center justify-between px-4" style={{ height: 48 }}>
          <h1 className="text-sm font-black text-white uppercase tracking-widest leading-tight">Sinagra Match</h1>
          <span className={`text-[11px] font-semibold transition-opacity ${saved ? 'text-green-400' : 'text-gray-600'}`}>
            {saved ? '✓ Salvato' : ''}
          </span>
        </div>
      </div>

      {/* ── MAIN TABS ── */}
      <div className="hidden md:flex bg-gray-900 border-b border-gray-800 shrink-0">
        {MAIN_TABS.map((t) => {
          const isDisabled = t.id !== 'matches' && !hasMatch;
          return (
            <button
              key={t.id}
              onClick={() => { if (isDisabled) return; setMainTab(t.id); }}
              className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors border-b-2 ${
                mainTab === t.id
                  ? 'text-yellow-400 border-yellow-400 bg-gray-800'
                  : isDisabled
                  ? 'text-gray-700 cursor-not-allowed border-transparent'
                  : 'text-gray-500 hover:text-gray-300 border-transparent'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── SUB TABS (only when mainTab === 'match') ── */}
      {mainTab === 'match' && hasMatch && (
        <div className="hidden md:flex bg-gray-900 border-b border-gray-800 shrink-0 pl-2">
          {SUB_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`flex items-center gap-1 px-4 py-2 text-[10px] font-bold uppercase tracking-wide transition-colors border-b-2 ${
                subTab === t.id
                  ? 'text-yellow-400 border-yellow-400'
                  : 'text-gray-500 hover:text-gray-300 border-transparent'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* ── CONTENT ROW ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

      {/* ── LEFT PANEL ──────────────────────────────────────────────────────── */}
      <div className={`flex w-full flex-col bg-gray-900 ${showPreview ? 'md:w-80 md:shrink-0 border-r border-gray-800' : ''}`}>

        {/* Tab content */}
        <div className={`flex-1 overflow-y-auto no-scrollbar ${showPreview ? 'pb-[108px] md:pb-4' : 'pb-[56px] md:pb-0'}`}>
        <div className={`p-4 ${!showPreview ? 'md:max-w-4xl md:mx-auto' : ''}`}>
          {loading && <p className="text-xs text-gray-500 text-center py-8">Caricamento...</p>}

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
              <p className="text-xs text-gray-500 mb-3">Nessuna partita selezionata</p>
              <button onClick={() => setMainTab('matches')} className="text-xs text-yellow-400 hover:text-yellow-300 font-semibold">
                Vai alle partite →
              </button>
            </div>
          )}
        </div>{/* /inner max-w wrapper */}
        </div>{/* /scroll container */}

        {/* ── Mobile action strip + bottom nav ──────────────────────────────── */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-40">
          {showPreview ? (
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800">
              <span className={`flex-1 text-[10px] font-semibold transition-opacity ${saved ? 'text-green-400' : 'text-gray-600'}`}>
                {saved ? '✓ Salvato' : 'Auto-save attivo'}
              </span>
              <button
                onClick={handleExport} disabled={exporting}
                className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-gray-900 text-xs font-black px-4 py-2.5 rounded transition-colors uppercase"
              >
                <Download size={14} />
                {exporting ? 'Esport...' : 'Esporta JPG'}
              </button>
              <button
                onClick={() => setShowPreviewModal(true)}
                className="bg-gray-700 hover:bg-gray-600 text-white p-2.5 rounded transition-colors"
              >
                <Eye size={18} />
              </button>
              <button
                onClick={() => setShowFbModal(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded transition-colors"
              >
                {FacebookSVG}
              </button>
              <button
                onClick={handlePublishInstagram} disabled={publishingIG}
                className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 disabled:opacity-40 text-white p-2.5 rounded transition-colors"
              >
                {InstagramSVG}
              </button>
            </div>
          ) : null}

          {mainTab === 'match' && hasMatch && (
            <div className="flex border-b border-gray-800">
              {SUB_TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSubTab(t.id)}
                  className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 transition-colors text-[8px] font-bold uppercase tracking-wide ${
                    subTab === t.id ? 'text-yellow-400 bg-gray-800' : 'text-gray-500'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex">
            {MAIN_TABS.map((t) => {
              const isDisabled = t.id !== 'matches' && !hasMatch;
              return (
                <button
                  key={t.id}
                  onClick={() => { if (isDisabled) return; setMainTab(t.id); }}
                  disabled={isDisabled}
                  className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] py-1 transition-colors ${
                    mainTab === t.id ? 'text-yellow-400 bg-gray-800'
                    : isDisabled ? 'text-gray-700 cursor-not-allowed'
                    : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {t.id === 'matches' ? <CalendarDays size={18} /> : t.id === 'roster' ? <Users size={18} /> : <Settings size={18} />}
                  <span className="text-[8px] font-bold uppercase tracking-wide">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>{/* /left panel */}

      {/* ── RIGHT PANEL - Preview + Azioni (desktop only, solo tab con anteprima) ── */}
      {showPreview && (
        <div className="hidden md:flex flex-1 overflow-hidden bg-gray-950 flex-col">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between shrink-0">
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-widest">
              {tab === 'result'       ? 'Anteprima Risultato — 1080×1350'
             : tab === 'substitution' ? 'Anteprima Sostituzione — 1080×1350'
             : 'Anteprima Formazione — 1080×1350'}
            </span>
            <span className="text-xs text-gray-600">
              Scala ridotta · export a risoluzione piena
            </span>
          </div>

          <div ref={previewContainerRef} className="flex-1 overflow-auto p-6 flex items-start justify-center min-h-0">
            <div style={{
              width: Math.round(1080 * previewScale),
              height: Math.round(1350 * previewScale),
              flexShrink: 0, position: 'relative',
            }}>
              <div style={{
                position: 'absolute', top: 0, left: 0,
                transformOrigin: 'top left',
                transform: `scale(${previewScale})`,
              }}>
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

          {/* Azioni: export + social */}
          <div className="shrink-0 p-4 border-t border-gray-800 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500 font-semibold uppercase tracking-widest">Pubblica</span>
              <span className={`text-[11px] font-semibold transition-opacity ${saved ? 'text-green-400' : 'text-gray-600'}`}>
                {saved ? '✓ Salvato' : 'Salvataggio automatico attivo'}
              </span>
            </div>

            <button
              onClick={handleExport} disabled={exporting}
              className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-gray-900 text-sm font-black py-2.5 rounded transition-colors uppercase tracking-wide"
            >
              <Download size={16} />
              {exporting ? 'Esportazione...' : 'Esporta JPG'}
            </button>

            <textarea
              value={fbCaption}
              onChange={(e) => setFbCaption(e.target.value)}
              placeholder="Testo del post Facebook..."
              rows={2}
              className="w-full bg-gray-800 text-white text-xs rounded p-2 resize-none border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-500"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handlePublishFacebook} disabled={publishing}
                className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-black py-2.5 rounded transition-colors uppercase tracking-wide"
              >
                {FacebookSVG}
                {publishing ? 'Pubbl...' : 'Facebook'}
              </button>

              <button
                onClick={handlePublishInstagram} disabled={publishingIG}
                className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 disabled:opacity-40 text-white text-xs font-black py-2.5 rounded transition-colors uppercase tracking-wide"
              >
                {InstagramSVG}
                {publishingIG ? 'Pubbl...' : 'Instagram'}
              </button>
            </div>
          </div>
        </div>
      )}{/* /right panel */}

      </div>{/* /content row */}

      {/* ── Preview modal (mobile only) ──────────────────────────────────────── */}
      {showPreviewModal && (
        <div className="md:hidden fixed inset-0 z-50 bg-gray-950 flex flex-col">
          <header className="flex items-center justify-between px-4 border-b border-gray-800" style={{ height: 52 }}>
            <button
              onClick={() => setShowPreviewModal(false)}
              className="flex items-center gap-2 text-yellow-400 font-bold text-sm uppercase tracking-wide"
            >
              <X size={16} />
              Chiudi
            </button>
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-widest">
              {tab === 'result'       ? 'Risultato 1080×1350'
             : tab === 'substitution' ? 'Sostituzione 1080×1350'
             : 'Formazione 1080×1350'}
            </span>
          </header>

          <div ref={modalPreviewContainerRef} className="flex-1 overflow-auto flex items-start justify-center p-4">
            <div style={{
              width: Math.round(1080 * modalPreviewScale),
              height: Math.round(1350 * modalPreviewScale),
              flexShrink: 0, position: 'relative',
            }}>
              <div style={{
                position: 'absolute', top: 0, left: 0,
                transformOrigin: 'top left',
                transform: `scale(${modalPreviewScale})`,
              }}>
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

          <footer className="flex gap-2 p-4 border-t border-gray-800">
            <button
              onClick={handleExport} disabled={exporting}
              className="flex-1 flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-gray-900 text-sm font-black py-3 rounded transition-colors uppercase"
            >
              <Download size={16} />
              {exporting ? 'Esport...' : 'Esporta JPG'}
            </button>
            <button
              onClick={() => { setShowPreviewModal(false); setShowFbModal(true); }}
              disabled={publishing}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-black px-4 py-3 rounded transition-colors uppercase"
            >
              {FacebookSVG}
              Facebook
            </button>
            <button
              onClick={handlePublishInstagram} disabled={publishingIG}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 disabled:opacity-40 text-white text-sm font-black px-4 py-3 rounded transition-colors uppercase"
            >
              {InstagramSVG}
              Instagram
            </button>
          </footer>
        </div>
      )}

      {/* ── FB caption modal (mobile only) ──────────────────────────────────── */}
      {showFbModal && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/70 flex items-end">
          <div className="bg-gray-900 w-full rounded-t-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-wide">Testo del post Facebook</h3>
              <button onClick={() => setShowFbModal(false)} className="text-gray-400 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>
            <textarea
              value={fbCaption}
              onChange={(e) => setFbCaption(e.target.value)}
              placeholder="Testo del post Facebook..."
              rows={4}
              className="w-full bg-gray-800 text-white text-sm rounded p-3 resize-none border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handlePublishFacebook} disabled={publishing}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-black py-3 rounded transition-colors uppercase"
              >
                {FacebookSVG}
                {publishing ? 'Pubblicazione...' : 'Pubblica su Facebook'}
              </button>
              <button
                onClick={() => setShowFbModal(false)}
                className="px-5 py-3 bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold rounded transition-colors"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Distinta Sheet (fuori schermo, visibile solo in stampa) ────────── */}
      {currentView && (
        <div aria-hidden="true" style={{ position: 'fixed', left: '-9999px', top: 0, visibility: 'hidden', pointerEvents: 'none' }}>
          <DistintaSheet
            match={currentView.match}
            view={currentView}
            players={activeRoster}
            competition={competition}
            opponentName={currentView.opponent?.name ?? ''}
            clubConfig={clubConfig}
          />
        </div>
      )}

    </div>
  );
}
