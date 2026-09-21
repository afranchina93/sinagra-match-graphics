export type PlayerRole = 'goalkeeper' | 'defender' | 'midfielder' | 'forward';

export interface PlayerStats {
  appearances: number;
  starterAppearances: number;
  minutesPlayed: number;
  goals: number;
  goalsConceded: number; // GK only
}

export interface Player {
  id: string;
  number: number;
  firstName: string;
  lastName: string;
  role: PlayerRole;
  active: boolean;
  dateOfBirth?: string;   // "DD/MM/YY"
  matricola?: string;     // es. "2392563"
  docIdentity?: string;
}

export type StaffRole = 'allenatore' | 'direttore_gara' | 'dirigente' | 'medico_sociale' | 'collaboratore' | 'forza_pubblica';

export interface StaffPerson {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  dateOfBirth?: string;
  matricola?: string;
  docIdentity?: string;
  tesseraFIGC?: string;
  active: boolean;
}

export interface FormationSlot {
  id: string;
  x: number;
  y: number;
  role: PlayerRole;
  label?: string;
}

export interface FormationLayout {
  name: string;
  slots: FormationSlot[];
}

// ── Tipi risultato partita ───────────────────────────────────

export type ScorerNote = 'R' | 'AG';

/** Usato solo come prop dei poster (ResultPoster) */
export interface Scorer {
  minute: number;
  playerName: string;
  note?: ScorerNote;
}

export type ResultPhase = 'HALF TIME' | 'LIVE' | 'FULL TIME';

export interface ResultConfig {
  phase: ResultPhase;
  matchday: string;
  competition: string;
  date: string;
  stadium: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string;
  awayLogo?: string;
  homeGoals: number;
  awayGoals: number;
  homeScorers: Scorer[];
  awayScorers: Scorer[];
}

// ── Tipi sostituzione ────────────────────────────────────────

/** Usato solo come prop dei poster (SubstitutionPoster) */
export interface SubstitutionPlayer {
  number: number;
  name: string;
}

export interface SubstitutionConfig {
  minute: string;
  playerOut: SubstitutionPlayer;
  playerIn: SubstitutionPlayer;
  matchday: string;
  competition: string;
  date: string;
  stadium: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string;
  awayLogo?: string;
}

// ── Tipi relazionali DB ──────────────────────────────────────

export interface MatchGoal {
  id: string;
  matchId: string;
  playerId?: string;
  playerName: string;
  minute: number;
  side: 'home' | 'away';
  note?: ScorerNote;
  sortOrder: number;
}

export interface MatchSubstitution {
  id: string;
  matchId: string;
  playerOutId?: string;
  playerOutNumber: number;
  playerOutName: string;
  playerInId?: string;
  playerInNumber: number;
  playerInName: string;
  minute: string;
  sortOrder: number;
}

// ── Tipi relazionali (Supabase) ──────────────────────────────

export interface Team {
  id: string;
  name: string;
  logoUrl: string | null;
}

export interface Competition {
  id: string;
  name: string;
  season: string;
}

export interface Match {
  id: string;
  opponentId: string | null;
  isHome: boolean;
  matchDate: string | null;
  competitionId: string | null;
  matchday: string;
  formation: string;
  stadium: string;
  coach: string;
  createdAt: string;
  updatedAt: string;
  homeGoals: number;
  awayGoals: number;
  kickoffTime: string;
  distintaMarkers: Record<string, 'K' | 'VK'>;
  numberOverrides?: Record<string, number>;
}

export interface MatchView {
  match: Match;
  opponent: Team | null;
  starters: Record<string, string>;  // slotId -> playerId
  bench: string[];
  goals: MatchGoal[];
  substitutions: MatchSubstitution[];
}

// ── Tipi usati da FormationPoster (invariati) ────────────────

export interface MatchConfig {
  opponent: string;
  isHome: boolean;
  date: string;
  competition: string;
  matchday: string;
  formation: string;
  stadium: string;
  opponentLogo?: string;
}

export interface Lineup {
  starters: Record<string, string>;
  bench: string[];
  coach: string;
}

// ── Scout partita ────────────────────────────────────────────

export interface PlayerMatchStat {
  playerId: string;
  playerName: string;
  playerNumber: number;
  tracked: boolean;
  tiriF: number;
  tiriP: number;
  crossF: number;
  chiusure: number;
  pallePerse: number;
  palleRecup: number;
  assist: number;
  gol: number;
}

export interface MatchScoutNotes {
  opponentFormation: string;
  sinagraNotes: string;
  opponentNotes: string;
  cornersHome: number;
  cornersAway: number;
}

export type PlayerMatchStatus = 'titolare' | 'subentrato' | 'panchina' | 'non_convocato';

export interface PlayerMatchHistoryRow {
  matchId: string;
  matchDate: string | null;
  opponentName: string | null;
  isHome: boolean;
  formation: string;
  homeGoals: number;
  awayGoals: number;
  status: PlayerMatchStatus;
  minutesPlayed: number;
  slotId: string | null;
  goals: number;
  scoutStats: PlayerMatchStat | null; // null = non analizzato
}

// ── Formazioni disponibili ───────────────────────────────────

export const FORMATIONS = [
  '4-3-3', '4-2-3-1', '4-4-2', '4-1-4-1', '3-5-2', '3-4-3',
  '4-3-1-2', '4-3-2-1', '3-4-2-1', '3-5-1-1', '5-3-2', '5-4-1',
] as const;
export type Formation = (typeof FORMATIONS)[number];
