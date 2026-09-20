import type { FormationLayout, FormationSlot } from './types';

/**
 * CONVENZIONE ASSI (rx, ry) — IMPORTANTE
 * ──────────────────────────────────────
 * rx : 0 = sinistra poster  →  1 = destra poster   (dal punto di vista dello spettatore)
 * ry : 0 = zona d'attacco   →  1 = porta propria / portiere
 *
 * Quindi:
 *   terzino DESTRO  → rx alto (es. 0.90)   slotId convenzionale: def4 / 'RB'
 *   terzino SINISTRO → rx basso (es. 0.10) slotId convenzionale: def1 / 'LB'
 *   ala DESTRA  → rx alto  (es. 0.82)      slotId: fwd3 / 'RW'
 *   ala SINISTRA → rx basso (es. 0.18)     slotId: fwd1 / 'LW'
 *
 * Non serve inversione manuale: assegnare il giocatore al slot con il label
 * corrispondente (LB, RB, LM, RM, LW, RW…) equivale alla posizione visiva
 * corretta nel poster.
 */

function gk(x: number, y: number): FormationSlot {
  return { id: 'gk', x, y, role: 'goalkeeper', label: 'GK' };
}

function def(id: string, x: number, y: number, label?: string): FormationSlot {
  return { id, x, y, role: 'defender', label };
}

function mid(id: string, x: number, y: number, label?: string): FormationSlot {
  return { id, x, y, role: 'midfielder', label };
}

function fwd(id: string, x: number, y: number, label?: string): FormationSlot {
  return { id, x, y, role: 'forward', label };
}

export const formationLayouts: Record<string, FormationLayout> = {
  '4-3-3': {
    name: '4-3-3',
    slots: [
      // GK più vicino alla porta propria (ry=0.92 riduce spazio vuoto sotto)
      gk(0.5, 0.92),
      // Difesa leggermente più bassa
      def('def1', 0.10, 0.72, 'LB'),
      def('def2', 0.35, 0.72, 'CB'),
      def('def3', 0.65, 0.72, 'CB'),
      def('def4', 0.90, 0.72, 'RB'),
      // Centrocampo
      mid('mid1', 0.18, 0.47, 'LM'),
      mid('mid2', 0.50, 0.47, 'CM'),
      mid('mid3', 0.82, 0.47, 'RM'),
      // Attacco
      fwd('fwd1', 0.18, 0.17, 'LW'),
      fwd('fwd2', 0.50, 0.17, 'CF'),
      fwd('fwd3', 0.82, 0.17, 'RW'),
    ],
  },
  '4-2-3-1': {
    name: '4-2-3-1',
    slots: [
      gk(0.5, 0.88),
      def('def1', 0.1, 0.72, 'LB'),
      def('def2', 0.35, 0.72, 'CB'),
      def('def3', 0.65, 0.72, 'CB'),
      def('def4', 0.9, 0.72, 'RB'),
      mid('mid1', 0.35, 0.56, 'DM'),
      mid('mid2', 0.65, 0.56, 'DM'),
      mid('mid3', 0.15, 0.38, 'LM'),
      mid('mid4', 0.5, 0.38, 'AM'),
      mid('mid5', 0.85, 0.38, 'RM'),
      fwd('fwd1', 0.5, 0.18, 'CF'),
    ],
  },
  '4-4-2': {
    name: '4-4-2',
    slots: [
      gk(0.5, 0.88),
      def('def1', 0.1, 0.70, 'LB'),
      def('def2', 0.35, 0.70, 'CB'),
      def('def3', 0.65, 0.70, 'CB'),
      def('def4', 0.9, 0.70, 'RB'),
      mid('mid1', 0.1, 0.50, 'LM'),
      mid('mid2', 0.35, 0.50, 'CM'),
      mid('mid3', 0.65, 0.50, 'CM'),
      mid('mid4', 0.9, 0.50, 'RM'),
      fwd('fwd1', 0.35, 0.24, 'ST'),
      fwd('fwd2', 0.65, 0.24, 'ST'),
    ],
  },
  '3-5-2': {
    name: '3-5-2',
    slots: [
      gk(0.5, 0.88),
      def('def1', 0.2, 0.70, 'CB'),
      def('def2', 0.5, 0.70, 'CB'),
      def('def3', 0.8, 0.70, 'CB'),
      mid('mid1', 0.1, 0.50, 'LWB'),
      mid('mid2', 0.3, 0.50, 'CM'),
      mid('mid3', 0.5, 0.50, 'CM'),
      mid('mid4', 0.7, 0.50, 'CM'),
      mid('mid5', 0.9, 0.50, 'RWB'),
      fwd('fwd1', 0.35, 0.22, 'ST'),
      fwd('fwd2', 0.65, 0.22, 'ST'),
    ],
  },
  '3-4-3': {
    name: '3-4-3',
    slots: [
      gk(0.5, 0.88),
      def('def1', 0.2, 0.72, 'CB'),
      def('def2', 0.5, 0.72, 'CB'),
      def('def3', 0.8, 0.72, 'CB'),
      mid('mid1', 0.15, 0.52, 'LM'),
      mid('mid2', 0.4, 0.52, 'CM'),
      mid('mid3', 0.6, 0.52, 'CM'),
      mid('mid4', 0.85, 0.52, 'RM'),
      fwd('fwd1', 0.2, 0.22, 'LW'),
      fwd('fwd2', 0.5, 0.22, 'CF'),
      fwd('fwd3', 0.8, 0.22, 'RW'),
    ],
  },

  // ── Nuove formazioni (coordinate x/y legacy ignorate da formationEngine) ──

  '4-3-1-2': {
    name: '4-3-1-2',
    slots: [
      gk(0.5, 0.88),
      def('def1', 0.1, 0.72, 'LB'),
      def('def2', 0.35, 0.72, 'CB'),
      def('def3', 0.65, 0.72, 'CB'),
      def('def4', 0.9, 0.72, 'RB'),
      mid('mid1', 0.18, 0.54, 'LM'),
      mid('mid2', 0.5, 0.54, 'CM'),
      mid('mid3', 0.82, 0.54, 'RM'),
      mid('mid4', 0.5, 0.37, 'TRQ'),
      fwd('fwd1', 0.35, 0.18, 'LS'),
      fwd('fwd2', 0.65, 0.18, 'RS'),
    ],
  },

  '4-3-2-1': {
    name: '4-3-2-1',
    slots: [
      gk(0.5, 0.88),
      def('def1', 0.1, 0.72, 'LB'),
      def('def2', 0.35, 0.72, 'CB'),
      def('def3', 0.65, 0.72, 'CB'),
      def('def4', 0.9, 0.72, 'RB'),
      mid('mid1', 0.18, 0.54, 'LM'),
      mid('mid2', 0.5, 0.54, 'CM'),
      mid('mid3', 0.82, 0.54, 'RM'),
      mid('mid4', 0.33, 0.35, 'LAM'),
      mid('mid5', 0.67, 0.35, 'RAM'),
      fwd('fwd1', 0.5, 0.18, 'CF'),
    ],
  },

  '3-4-2-1': {
    name: '3-4-2-1',
    slots: [
      gk(0.5, 0.88),
      def('def1', 0.2, 0.72, 'CB'),
      def('def2', 0.5, 0.72, 'CB'),
      def('def3', 0.8, 0.72, 'CB'),
      mid('mid1', 0.1, 0.54, 'LWB'),
      mid('mid2', 0.37, 0.54, 'CM'),
      mid('mid3', 0.63, 0.54, 'CM'),
      mid('mid4', 0.9, 0.54, 'RWB'),
      mid('mid5', 0.33, 0.35, 'LAM'),
      mid('mid6', 0.67, 0.35, 'RAM'),
      fwd('fwd1', 0.5, 0.18, 'CF'),
    ],
  },

  '3-5-1-1': {
    name: '3-5-1-1',
    slots: [
      gk(0.5, 0.88),
      def('def1', 0.2, 0.72, 'CB'),
      def('def2', 0.5, 0.72, 'CB'),
      def('def3', 0.8, 0.72, 'CB'),
      mid('mid1', 0.1, 0.54, 'LWB'),
      mid('mid2', 0.3, 0.54, 'LCM'),
      mid('mid3', 0.5, 0.54, 'CM'),
      mid('mid4', 0.7, 0.54, 'RCM'),
      mid('mid5', 0.9, 0.54, 'RWB'),
      mid('mid6', 0.5, 0.35, 'AM'),
      fwd('fwd1', 0.5, 0.18, 'CF'),
    ],
  },

  '5-3-2': {
    name: '5-3-2',
    slots: [
      gk(0.5, 0.88),
      def('def1', 0.08, 0.72, 'LWB'),
      def('def2', 0.27, 0.72, 'LCB'),
      def('def3', 0.5, 0.72, 'CB'),
      def('def4', 0.73, 0.72, 'RCB'),
      def('def5', 0.92, 0.72, 'RWB'),
      mid('mid1', 0.2, 0.50, 'LM'),
      mid('mid2', 0.5, 0.50, 'CM'),
      mid('mid3', 0.8, 0.50, 'RM'),
      fwd('fwd1', 0.33, 0.22, 'LS'),
      fwd('fwd2', 0.67, 0.22, 'RS'),
    ],
  },

  '5-4-1': {
    name: '5-4-1',
    slots: [
      gk(0.5, 0.88),
      def('def1', 0.08, 0.72, 'LWB'),
      def('def2', 0.27, 0.72, 'LCB'),
      def('def3', 0.5, 0.72, 'CB'),
      def('def4', 0.73, 0.72, 'RCB'),
      def('def5', 0.92, 0.72, 'RWB'),
      mid('mid1', 0.1, 0.50, 'LM'),
      mid('mid2', 0.37, 0.50, 'LCM'),
      mid('mid3', 0.63, 0.50, 'RCM'),
      mid('mid4', 0.9, 0.50, 'RM'),
      fwd('fwd1', 0.5, 0.22, 'CF'),
    ],
  },
  '4-1-4-1': {
    name: '4-1-4-1',
    slots: [
      gk(0.5, 0.92),
      // Difesa
      def('def1', 0.10, 0.75, 'LB'),
      def('def2', 0.35, 0.75, 'CB'),
      def('def3', 0.65, 0.75, 'CB'),
      def('def4', 0.90, 0.75, 'RB'),
      // Mediano davanti alla difesa
      mid('mid1', 0.50, 0.60, 'DM'),
      // Linea di centrocampo a 4
      mid('mid2', 0.10, 0.42, 'LM'),
      mid('mid3', 0.37, 0.42, 'LCM'),
      mid('mid4', 0.63, 0.42, 'RCM'),
      mid('mid5', 0.90, 0.42, 'RM'),
      // Punta
      fwd('fwd1', 0.50, 0.18, 'ST'),
    ],
  },
};
