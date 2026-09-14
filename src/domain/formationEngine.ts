/**
 * formationEngine
 * ─────────────────────────────────────────────────────────────────────────────
 * Calcola automaticamente le coordinate canvas assolute di ogni slot a partire
 * dal modulo tattico (es. "4-2-3-1") e dalla geometria prospettica del campo.
 *
 * Il modulo viene interpretato come array di conteggi per riga:
 *   "4-3-3"   → [4, 3, 3]   (portiere separato)
 *   "4-2-3-1" → [4, 2, 3, 1]
 *   "3-5-2"   → [3, 5, 2]
 *
 * Gli slot di formations.ts sono in ordine GK → dif (L→R) → mid (L→R) → fwd (L→R).
 * L'engine assegna i conteggi di riga in sequenza, quindi:
 *   rows[0] slot → riga difensori
 *   rows[1..n-2] → righe centrocampo
 *   rows[n-1] → riga attaccanti
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { FormationLayout, FormationSlot } from './types';
import {
  PITCH_VERTICES,
  PITCH_REGION,
  PITCH_IMG_OFFSET_Y,
  PITCH_IMG_H,
  PLAYABLE_TOP,
  PLAYABLE_BOTTOM,
  slotToAbsPx,
} from '../poster-config';

// Margine laterale interno al campo (evita bordi)
const INNER_MARGIN = 38;

// Bounding box del PlayerMarker per collision detection
const BLOCK_W = 104;  // shirt(97) + margine
const BLOCK_H = 130;  // shirt(106) + gap(2) + label(18) + margine(4)

/** Converte canvas Y → bordi sinistro/destro del campo (prospettiva trapezoidale) */
function getPitchEdgesAtY(canvasY: number): { left: number; right: number } {
  const { TL, TR, BL, BR } = PITCH_VERTICES;
  const scale = PITCH_IMG_H / 685;
  const pitchImgY = (canvasY - PITCH_REGION.y - PITCH_IMG_OFFSET_Y) / scale;
  const t = Math.max(0, Math.min(1, (pitchImgY - TL.y) / (BL.y - TL.y)));
  return {
    left:  TL.x + (BL.x - TL.x) * t,
    right: TR.x + (BR.x - TR.x) * t,
  };
}

/** Distribuisce N posizioni tra usableLeft e usableRight */
function distributeX(count: number, usableLeft: number, usableRight: number): number[] {
  if (count === 1) return [Math.round((usableLeft + usableRight) / 2)];
  if (count === 2) {
    // Posizionamento centrale simmetrico — NON space-between ai bordi.
    // I due giocatori occupano le posizioni al 38% e 62% della larghezza
    // giocabile, apparendo come una coppia interna (es. doppio mediano).
    const span = usableRight - usableLeft;
    return [
      Math.round(usableLeft + 0.38 * span),
      Math.round(usableLeft + 0.62 * span),
    ];
  }
  return Array.from({ length: count }, (_, i) =>
    Math.round(usableLeft + (i / (count - 1)) * (usableRight - usableLeft))
  );
}

/**
 * Se i giocatori in una riga si sovrappongono orizzontalmente, riduce
 * progressivamente il margine interno fino a risolvere le collisioni.
 */
function fixRowCollisions(xs: number[], canvasY: number): number[] {
  if (xs.length <= 1) return xs;
  const { left, right } = getPitchEdgesAtY(canvasY);
  let margin = INNER_MARGIN;

  for (let attempt = 0; attempt < 6; attempt++) {
    const proposed = distributeX(xs.length, left + margin, right - margin);
    const hasOverlap = proposed.some((x, i) => i > 0 && x - proposed[i - 1] < BLOCK_W);
    if (!hasOverlap) return proposed;
    margin = Math.max(4, margin - 6);
  }
  return distributeX(xs.length, left + 4, right - 4);
}

/**
 * Calcola le posizioni canvas assolute per tutti gli slot di una formazione.
 *
 * @param formationStr  Stringa modulo, es. "4-2-3-1"
 * @param layout        FormationLayout da formations.ts
 * @returns             Record<slotId, {x, y}> in px assoluti canvas 1080×1350
 */
export function computeSlotPositions(
  formationStr: string,
  layout: FormationLayout,
): Record<string, { x: number; y: number }> {

  const rows = formationStr.split('-').map(Number);
  const totalOutfield = rows.reduce((a, b) => a + b, 0);

  const gkSlot   = layout.slots.find(s => s.role === 'goalkeeper');
  const outfield  = layout.slots.filter(s => s.role !== 'goalkeeper');

  // Fallback legacy se il layout non corrisponde alla formation string
  if (!gkSlot || outfield.length !== totalOutfield) {
    return Object.fromEntries(
      layout.slots.map(slot => [slot.id, slotToAbsPx(slot.x, slot.y)])
    );
  }

  // Suddivide outfield in righe tattiche per conteggio
  const rowSlots: FormationSlot[][] = [];
  let idx = 0;
  for (const count of rows) {
    rowSlots.push(outfield.slice(idx, idx + count));
    idx += count;
  }

  const numPositions = rows.length + 1; // GK (index 0, bottom) + righe outfield
  const positions: Record<string, { x: number; y: number }> = {};

  // ── Portiere (alzato di 50px rispetto al fondo campo) ──
  const GK_Y = PLAYABLE_BOTTOM - 50;
  const gkEdges = getPitchEdgesAtY(GK_Y);
  positions[gkSlot.id] = {
    x: Math.round((gkEdges.left + gkEdges.right) / 2),
    y: GK_Y,
  };

  // ── Righe outfield (index 0 = difensori prossimi al GK, ultimo = attaccanti) ──
  rowSlots.forEach((slots, rowIdx) => {
    const t = (rowIdx + 1) / (numPositions - 1); // 0→1 da fondo a top
    const canvasY = Math.round(PLAYABLE_BOTTOM - t * (PLAYABLE_BOTTOM - PLAYABLE_TOP));

    const { left, right } = getPitchEdgesAtY(canvasY);
    let xs = distributeX(slots.length, left + INNER_MARGIN, right - INNER_MARGIN);
    xs = fixRowCollisions(xs, canvasY);

    slots.forEach((slot, i) => {
      positions[slot.id] = { x: xs[i], y: canvasY };
    });
  });

  // ── Verifica collisioni tra righe adiacenti ──
  const rowYs = rowSlots.map((_, rowIdx) => {
    const t = (rowIdx + 1) / (numPositions - 1);
    return Math.round(PLAYABLE_BOTTOM - t * (PLAYABLE_BOTTOM - PLAYABLE_TOP));
  });

  // Controlla se righe adiacenti sono troppo vicine
  const tooClose = rowYs.some((y, i) => i > 0 && rowYs[i - 1] - y < BLOCK_H);

  if (tooClose) {
    const playableHeight = PLAYABLE_BOTTOM - PLAYABLE_TOP;
    const minSpacing = BLOCK_H + 2;
    const requiredHeight = minSpacing * (numPositions - 1);

    if (requiredHeight <= playableHeight) {
      // Ricalcola con spacing garantito
      rowSlots.forEach((slots, rowIdx) => {
        const t = (rowIdx + 1) / (numPositions - 1);
        const newY = Math.round(PLAYABLE_BOTTOM - t * (PLAYABLE_BOTTOM - PLAYABLE_TOP));
        const { left, right } = getPitchEdgesAtY(newY);
        let xs = distributeX(slots.length, left + INNER_MARGIN, right - INNER_MARGIN);
        xs = fixRowCollisions(xs, newY);
        slots.forEach((slot, i) => {
          positions[slot.id] = { x: xs[i], y: newY };
        });
      });
    }
    // se requiredHeight > playableHeight: impossibile risolvere, lascia invariato
  }

  return positions;
}
