export type PlayerRole = 'goalkeeper' | 'defender' | 'midfielder' | 'forward';

export interface Player {
  id: string;
  number: number;
  firstName: string;
  lastName: string;
  role: PlayerRole;
}

export interface FormationSlot {
  id: string;
  x: number; // 0-1 relative horizontal position (0=left, 1=right)
  y: number; // 0-1 relative vertical position (0=top/attack, 1=bottom/goal)
  role: PlayerRole;
  label?: string; // e.g. "GK", "LB", "CF"
}

export interface FormationLayout {
  name: string;
  slots: FormationSlot[];
}

export interface MatchConfig {
  opponent: string;
  isHome: boolean;
  date: string;
  competition: string;
  matchday: string;
  formation: string;
  stadium: string;
  opponentLogo?: string; // filename in /assets/logos/ (es. "real-palermo.png")
}

export interface Lineup {
  starters: Record<string, string>; // slotId -> playerId
  bench: string[]; // playerIds
  coach: string;
}

export interface AppState {
  roster: Player[];
  matchConfig: MatchConfig;
  lineup: Lineup;
}

export const FORMATIONS = [
  '4-3-3', '4-2-3-1', '4-4-2', '3-5-2', '3-4-3',
  '4-3-1-2', '4-3-2-1', '3-4-2-1', '3-5-1-1', '5-3-2', '5-4-1',
] as const;
export type Formation = (typeof FORMATIONS)[number];
