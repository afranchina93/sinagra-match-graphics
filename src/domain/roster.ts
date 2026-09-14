import type { Player } from './types';

export const defaultRoster: Player[] = [
  // Portieri
  { id: 'p1', number: 1, firstName: 'Francesco', lastName: 'Di Pane', role: 'goalkeeper' },
  { id: 'p2', number: 12, firstName: 'Giuseppe', lastName: 'Cordima', role: 'goalkeeper' },
  { id: 'p3', number: 17, firstName: 'Stefano', lastName: 'Fogliani', role: 'goalkeeper' },

  // Difensori
  { id: 'd1', number: 18, firstName: 'Domenico', lastName: 'Ratto', role: 'defender' },
  { id: 'd2', number: 23, firstName: 'Salvatore', lastName: 'Russo B.', role: 'defender' },
  { id: 'd3', number: 17, firstName: 'Niko', lastName: 'Fogliani', role: 'defender' },
  { id: 'd4', number: 21, firstName: 'Gabriele', lastName: 'Faranda', role: 'defender' },
  { id: 'd5', number: 6, firstName: 'Federico', lastName: 'Cottone', role: 'defender' },
  { id: 'd6', number: 24, firstName: 'Antonino', lastName: 'Rigoli', role: 'defender' },
  { id: 'd7', number: 24, firstName: 'Matteo', lastName: 'Pintabona', role: 'defender' },
  { id: 'd8', number: 2, firstName: 'Stefano', lastName: 'Calà', role: 'defender' },
  { id: 'd9', number: 10, firstName: 'Giovanni', lastName: 'Gaudio', role: 'defender' },

  // Centrocampisti
  { id: 'm1', number: 8, firstName: 'Tony', lastName: 'Fogliani', role: 'midfielder' },
  { id: 'm2', number: 4, firstName: 'Giovanni', lastName: 'Natalotto', role: 'midfielder' },
  { id: 'm3', number: 24, firstName: 'Jonathan', lastName: 'Fogliani', role: 'midfielder' },
  { id: 'm4', number: 14, firstName: 'Augusto', lastName: 'Monte', role: 'midfielder' },
  { id: 'm5', number: 16, firstName: 'Fabiano', lastName: 'Mancuso', role: 'midfielder' },
  { id: 'm6', number: 19, firstName: 'Nikolas', lastName: 'Colantropo', role: 'midfielder' },
  { id: 'm7', number: 20, firstName: 'Nunzio', lastName: 'Scaffidi', role: 'midfielder' },
  { id: 'm8', number: 22, firstName: 'Luca', lastName: 'Radici', role: 'midfielder' },
  { id: 'm9', number: 9, firstName: 'Nunzio', lastName: 'Tumeo', role: 'midfielder' },

  // Attaccanti
  { id: 'a1', number: 7, firstName: 'Alessandro', lastName: 'Natalotto', role: 'forward' },
  { id: 'a2', number: 13, firstName: 'Giuseppe', lastName: 'Foti', role: 'forward' },
  { id: 'a3', number: 15, firstName: 'Marco', lastName: 'Fogliani', role: 'forward' },
  { id: 'a4', number: 11, firstName: 'Leandro', lastName: 'Paradiso', role: 'forward' },
  { id: 'a5', number: 3, firstName: 'Pietro', lastName: 'Bellomo', role: 'forward' },
];

// Default 4-3-3 lineup
// slotId -> playerId
export const defaultLineupStarters: Record<string, string> = {
  gk: 'p1',    // Di Pane
  def1: 'a5',  // Bellomo (LB)
  def2: 'd9',  // Gaudio (CB)
  def3: 'd5',  // Cottone (CB)
  def4: 'd4',  // Faranda (RB)
  mid1: 'm5',  // Mancuso (LM)
  mid2: 'm4',  // Monte (CM)
  mid3: 'd3',  // Fogliani Niko (RM)
  fwd1: 'a1',  // Natalotto Alessandro (LW)
  fwd2: 'm9',  // Tumeo (CF)
  fwd3: 'a3',  // Fogliani Marco (RW)
};

export const defaultBench: string[] = ['p2', 'd1', 'd2', 'd8', 'm1', 'm2', 'a2', 'a4'];

export const defaultCoach = 'Andrea Ioppolo';
