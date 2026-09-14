export type PlayerRole = 'goalkeeper' | 'defender' | 'midfielder' | 'forward';

export interface Player {
  id: string;
  number: number;
  firstName: string;
  lastName: string;
  role: PlayerRole;
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
}

export interface MatchView {
  match: Match;
  opponent: Team | null;
  starters: Record<string, string>; // slotId -> playerId
  bench: string[];
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

// ── Formazioni disponibili ───────────────────────────────────

export const FORMATIONS = [
  '4-3-3', '4-2-3-1', '4-4-2', '3-5-2', '3-4-3',
  '4-3-1-2', '4-3-2-1', '3-4-2-1', '3-5-1-1', '5-3-2', '5-4-1',
] as const;
export type Formation = (typeof FORMATIONS)[number];
