/**
 * POSTER COORDINATE SYSTEM
 * ─────────────────────────────────────────────────────────────────────────────
 * Canvas fisso: 1080 × 1350 px (Instagram 4:5)
 *
 * Tutte le coordinate degli elementi dinamici sono definite rispetto a questa
 * dimensione fissa. La preview UI può essere scalata (transform: scale), ma
 * internamente le coordinate rimangono sempre 1080 × 1350.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const POSTER_W = 1080;
export const POSTER_H = 1350;

/**
 * Regioni assolute del poster (px).
 *
 *  0 ┌──────────────────────────────────┐
 *    │  HEADER (logo + matchday)        │ h: 185
 *    ├──────────────────────────────────┤
 *    │  TITLE ("LINE UP")               │ h: 120
 *    ├──────────────────────────────────┤
 *    │                                  │
 *    │  PITCH  1080 × 820               │ h: 820
 *    │  (pitch.png posizionato qui)     │
 *    │                                  │
 *    ├──────────────────────────────────┤
 *    │  BENCH + COACH + SOCIAL          │ h: 225
 * 1350 └──────────────────────────────────┘
 *
 * 185 + 120 + 820 + 225 = 1350 ✓
 */
export const REGIONS = {
  header: { x: 0, y: 0,   width: POSTER_W, height: 245 },
  title:  { x: 0, y: 245, width: POSTER_W, height: 60 },
  pitch:  { x: 0, y: 305, width: POSTER_W, height: 820 },
  bench:  { x: 0, y: 1125, width: POSTER_W, height: 225 },
} as const;

// 245 + 60 + 820 + 225 = 1350 ✓

export const PITCH_REGION = REGIONS.pitch;

/**
 * Pitch image display parameters.
 *
 * Il PNG pitch.png ha dimensioni originali 1080 × 685.
 * Viene visualizzato a larghezza piena e altezza aumentata (+8% ca.)
 * per dare più spazio verticale alle linee tattiche.
 */
export const PITCH_SCALE        = 1.0;    // larghezza piena
export const PITCH_SCALE_Y      = 740 / 685; // ~1.080 — campo più alto
export const PITCH_IMG_W        = 1080;
export const PITCH_IMG_H        = 740;    // altezza aumentata
export const PITCH_IMG_OFFSET_X = 0;
export const PITCH_IMG_OFFSET_Y = 55;    // respiro tra titolo e campo

/**
 * Geometria prospettica della superficie di gioco dentro pitch.png (1080×685).
 * Vertici della superficie (coordinate file pitch.png):
 *   top-left:     (252, 68)
 *   top-right:    (820, 68)
 *   bottom-left:  ( 30, 636)
 *   bottom-right: (1041, 636)
 */
export const PITCH_VERTICES = {
  TL: { x: 252, y: 52  },
  TR: { x: 820, y: 52  },
  BL: { x: 30,  y: 515 },
  BR: { x: 1041, y: 515 },
} as const;

/**
 * Playable area — coordinate canvas assolute della superficie di gioco.
 * Utilizzate dal formationEngine per distribuire le righe tattiche.
 *
 * Il padding di 22px evita che i marker tocchino i bordi del campo prospettico.
 */
const _pitchImgScale = PITCH_IMG_H / 685;
const _pitchSurfaceTop    = PITCH_REGION.y + PITCH_IMG_OFFSET_Y + PITCH_VERTICES.TL.y * _pitchImgScale;
const _pitchSurfaceBottom = PITCH_REGION.y + PITCH_IMG_OFFSET_Y + PITCH_VERTICES.BL.y * _pitchImgScale;

export const PLAYABLE_TOP    = Math.round(_pitchSurfaceTop    + 22); // zona attaccanti
export const PLAYABLE_BOTTOM = Math.round(_pitchSurfaceBottom - 22); // zona portiere

/**
 * Converte coordinate relative di uno slot (rx, ry) ∈ [0,1]²
 * in pixel assoluti nel canvas 1080 × 1350.
 *
 * LEGACY — usato solo da codice non ancora migrato a formationEngine.
 * Il formationEngine usa getPitchEdgesAtY() internamente.
 */
export function slotToAbsPx(rx: number, ry: number): { x: number; y: number } {
  const { TL, TR, BL, BR } = PITCH_VERTICES;
  const leftX  = TL.x + (BL.x - TL.x) * ry;
  const rightX = TR.x + (BR.x - TR.x) * ry;
  const pitchY = TL.y + (BL.y - TL.y) * ry;
  const pitchX = leftX + rx * (rightX - leftX);
  return {
    x: Math.round(pitchX * PITCH_SCALE   + PITCH_IMG_OFFSET_X),
    y: Math.round(PITCH_REGION.y + pitchY * PITCH_SCALE_Y + PITCH_IMG_OFFSET_Y),
  };
}

/**
 * Percorsi degli asset statici in public/assets/poster/
 */
export const POSTER_ASSETS = {
  /** Sfondo completo 1080 × 1350 — WebP, opaco */
  background:      '/assets/poster/background.webp',
  /** Campo prospettico 1080 × 685 — PNG, RGBA trasparente */
  pitch:           '/assets/poster/pitch.png',
  /** Maglia giocatore 144 × 156 — PNG, RGBA trasparente */
  playerShirt:     '/assets/poster/player-shirt.png',
  /** Maglia portiere 144 × 156 — PNG, RGBA trasparente */
  goalkeeperShirt: '/assets/poster/goalkeeper-shirt.png',
  /** Stemma scontornato — PNG, RGBA trasparente */
  logo:            '/assets/poster/sinagra-logo.png',
  /** Pannello footer pennellato — PNG, RGBA trasparente (1942×809) */
  footerPanel:     '/assets/poster/footer-panel.png',
} as const;

/**
 * Cartella loghi avversari (in public/assets/logos/)
 * Uso: `${LOGOS_BASE}/{opponentLogo}` dove opponentLogo = "real-palermo.png"
 */
export const LOGOS_BASE = '/assets/logos';
