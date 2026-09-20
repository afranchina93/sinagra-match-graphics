/**
 * POST /api/generate-image
 * Body: { roster, matchConfig, lineup }
 *
 * Genera il poster formazione con @napi-rs/canvas e restituisce JPEG.
 * Tutto il codice necessario è inlinato qui per evitare problemi di
 * risoluzione moduli ESM su Vercel.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import type { Canvas, CanvasRenderingContext2D, Image } from '@napi-rs/canvas';
import fs from 'fs';
import path from 'path';

// Registra i font bundlati con la funzione (api/fonts/ incluso via includeFiles)
const FONTS_DIR = path.join(process.cwd(), 'api', 'fonts');
GlobalFonts.registerFromPath(path.join(FONTS_DIR, 'Impact.ttf'), 'Impact');
GlobalFonts.registerFromPath(path.join(FONTS_DIR, 'Arial.ttf'), 'Arial');
GlobalFonts.registerFromPath(path.join(FONTS_DIR, 'Arial Bold.ttf'), 'Arial Bold');

// ── Types (erased at runtime) ─────────────────────────────────────────────────

type PlayerRole = 'goalkeeper' | 'defender' | 'midfielder' | 'forward';

interface Player {
  id: string;
  number: number;
  firstName: string;
  lastName: string;
  role: PlayerRole;
  active: boolean;
}

interface MatchConfig {
  opponent: string;
  isHome: boolean;
  date: string;
  competition: string;
  matchday: string;
  formation: string;
  stadium: string;
  opponentLogo?: string;
}

interface Lineup {
  starters: Record<string, string>;
  bench: string[];
  coach: string;
}

interface FormationSlot {
  id: string;
  x: number;
  y: number;
  role: PlayerRole;
  label?: string;
}

interface FormationLayout {
  name: string;
  slots: FormationSlot[];
}

// ── poster-config constants ───────────────────────────────────────────────────

const POSTER_W = 1080;
const POSTER_H = 1350;

const REGIONS = {
  header: { x: 0, y: 0,    width: 1080, height: 245 },
  title:  { x: 0, y: 245,  width: 1080, height: 60  },
  pitch:  { x: 0, y: 305,  width: 1080, height: 820 },
  bench:  { x: 0, y: 1125, width: 1080, height: 225 },
} as const;

const PITCH_REGION    = REGIONS.pitch;
const PITCH_IMG_W     = 1080;
const PITCH_IMG_H     = 740;
const PITCH_IMG_OFFSET_X = 0;
const PITCH_IMG_OFFSET_Y = 55;

const PITCH_VERTICES = {
  TL: { x: 252, y: 52  },
  TR: { x: 820, y: 52  },
  BL: { x: 30,  y: 515 },
  BR: { x: 1041, y: 515 },
} as const;

const _pitchImgScale      = PITCH_IMG_H / 685;
const _pitchSurfaceTop    = PITCH_REGION.y + PITCH_IMG_OFFSET_Y + PITCH_VERTICES.TL.y * _pitchImgScale;
const _pitchSurfaceBottom = PITCH_REGION.y + PITCH_IMG_OFFSET_Y + PITCH_VERTICES.BL.y * _pitchImgScale;
const PLAYABLE_TOP    = Math.round(_pitchSurfaceTop    + 22);
const PLAYABLE_BOTTOM = Math.round(_pitchSurfaceBottom - 22);

function slotToAbsPx(rx: number, ry: number): { x: number; y: number } {
  const { TL, TR, BL, BR } = PITCH_VERTICES;
  const leftX  = TL.x + (BL.x - TL.x) * ry;
  const rightX = TR.x + (BR.x - TR.x) * ry;
  const pitchY = TL.y + (BL.y - TL.y) * ry;
  const pitchX = leftX + rx * (rightX - leftX);
  return {
    x: Math.round(pitchX + PITCH_IMG_OFFSET_X),
    y: Math.round(PITCH_REGION.y + pitchY * (PITCH_IMG_H / 685) + PITCH_IMG_OFFSET_Y),
  };
}

// ── formationEngine ───────────────────────────────────────────────────────────

const INNER_MARGIN = 38;
const BLOCK_W = 104;
const BLOCK_H = 130;

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

function distributeX(count: number, usableLeft: number, usableRight: number): number[] {
  if (count === 1) return [Math.round((usableLeft + usableRight) / 2)];
  if (count === 2) {
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

function computeSlotPositions(
  formationStr: string,
  layout: FormationLayout,
): Record<string, { x: number; y: number }> {
  const rows = formationStr.split('-').map(Number);
  const totalOutfield = rows.reduce((a, b) => a + b, 0);
  const gkSlot   = layout.slots.find(s => s.role === 'goalkeeper');
  const outfield = layout.slots.filter(s => s.role !== 'goalkeeper');

  if (!gkSlot || outfield.length !== totalOutfield) {
    return Object.fromEntries(layout.slots.map(slot => [slot.id, slotToAbsPx(slot.x, slot.y)]));
  }

  const rowSlots: FormationSlot[][] = [];
  let idx = 0;
  for (const count of rows) {
    rowSlots.push(outfield.slice(idx, idx + count));
    idx += count;
  }

  const numPositions = rows.length + 1;
  const positions: Record<string, { x: number; y: number }> = {};

  const GK_Y = PLAYABLE_BOTTOM - 50;
  const gkEdges = getPitchEdgesAtY(GK_Y);
  positions[gkSlot.id] = { x: Math.round((gkEdges.left + gkEdges.right) / 2), y: GK_Y };

  rowSlots.forEach((slots, rowIdx) => {
    const t = (rowIdx + 1) / (numPositions - 1);
    const canvasY = Math.round(PLAYABLE_BOTTOM - t * (PLAYABLE_BOTTOM - PLAYABLE_TOP));
    const { left, right } = getPitchEdgesAtY(canvasY);
    let xs = distributeX(slots.length, left + INNER_MARGIN, right - INNER_MARGIN);
    xs = fixRowCollisions(xs, canvasY);
    slots.forEach((slot, i) => { positions[slot.id] = { x: xs[i], y: canvasY }; });
  });

  const rowYs = rowSlots.map((_, rowIdx) => {
    const t = (rowIdx + 1) / (numPositions - 1);
    return Math.round(PLAYABLE_BOTTOM - t * (PLAYABLE_BOTTOM - PLAYABLE_TOP));
  });
  const tooClose = rowYs.some((y, i) => i > 0 && rowYs[i - 1] - y < BLOCK_H);

  if (tooClose) {
    const playableHeight = PLAYABLE_BOTTOM - PLAYABLE_TOP;
    const minSpacing = BLOCK_H + 2;
    const requiredHeight = minSpacing * (numPositions - 1);
    if (requiredHeight <= playableHeight) {
      rowSlots.forEach((slots, rowIdx) => {
        const t = (rowIdx + 1) / (numPositions - 1);
        const newY = Math.round(PLAYABLE_BOTTOM - t * (PLAYABLE_BOTTOM - PLAYABLE_TOP));
        const { left, right } = getPitchEdgesAtY(newY);
        let xs = distributeX(slots.length, left + INNER_MARGIN, right - INNER_MARGIN);
        xs = fixRowCollisions(xs, newY);
        slots.forEach((slot, i) => { positions[slot.id] = { x: xs[i], y: newY }; });
      });
    }
  }

  return positions;
}

// ── formations data ───────────────────────────────────────────────────────────

function gk(x: number, y: number): FormationSlot { return { id: 'gk', x, y, role: 'goalkeeper', label: 'GK' }; }
function def(id: string, x: number, y: number, label?: string): FormationSlot { return { id, x, y, role: 'defender', label }; }
function mid(id: string, x: number, y: number, label?: string): FormationSlot { return { id, x, y, role: 'midfielder', label }; }
function fwd(id: string, x: number, y: number, label?: string): FormationSlot { return { id, x, y, role: 'forward', label }; }

const formationLayouts: Record<string, FormationLayout> = {
  '4-3-3': { name: '4-3-3', slots: [gk(0.5,0.92),def('def1',0.10,0.72,'LB'),def('def2',0.35,0.72,'CB'),def('def3',0.65,0.72,'CB'),def('def4',0.90,0.72,'RB'),mid('mid1',0.18,0.47,'LM'),mid('mid2',0.50,0.47,'CM'),mid('mid3',0.82,0.47,'RM'),fwd('fwd1',0.18,0.17,'LW'),fwd('fwd2',0.50,0.17,'CF'),fwd('fwd3',0.82,0.17,'RW')] },
  '4-2-3-1': { name: '4-2-3-1', slots: [gk(0.5,0.88),def('def1',0.1,0.72,'LB'),def('def2',0.35,0.72,'CB'),def('def3',0.65,0.72,'CB'),def('def4',0.9,0.72,'RB'),mid('mid1',0.35,0.56,'DM'),mid('mid2',0.65,0.56,'DM'),mid('mid3',0.15,0.38,'LM'),mid('mid4',0.5,0.38,'AM'),mid('mid5',0.85,0.38,'RM'),fwd('fwd1',0.5,0.18,'CF')] },
  '4-4-2': { name: '4-4-2', slots: [gk(0.5,0.88),def('def1',0.1,0.70,'LB'),def('def2',0.35,0.70,'CB'),def('def3',0.65,0.70,'CB'),def('def4',0.9,0.70,'RB'),mid('mid1',0.1,0.50,'LM'),mid('mid2',0.35,0.50,'CM'),mid('mid3',0.65,0.50,'CM'),mid('mid4',0.9,0.50,'RM'),fwd('fwd1',0.35,0.24,'ST'),fwd('fwd2',0.65,0.24,'ST')] },
  '3-5-2': { name: '3-5-2', slots: [gk(0.5,0.88),def('def1',0.2,0.70,'CB'),def('def2',0.5,0.70,'CB'),def('def3',0.8,0.70,'CB'),mid('mid1',0.1,0.50,'LWB'),mid('mid2',0.3,0.50,'CM'),mid('mid3',0.5,0.50,'CM'),mid('mid4',0.7,0.50,'CM'),mid('mid5',0.9,0.50,'RWB'),fwd('fwd1',0.35,0.22,'ST'),fwd('fwd2',0.65,0.22,'ST')] },
  '3-4-3': { name: '3-4-3', slots: [gk(0.5,0.88),def('def1',0.2,0.72,'CB'),def('def2',0.5,0.72,'CB'),def('def3',0.8,0.72,'CB'),mid('mid1',0.15,0.52,'LM'),mid('mid2',0.4,0.52,'CM'),mid('mid3',0.6,0.52,'CM'),mid('mid4',0.85,0.52,'RM'),fwd('fwd1',0.2,0.22,'LW'),fwd('fwd2',0.5,0.22,'CF'),fwd('fwd3',0.8,0.22,'RW')] },
  '4-3-1-2': { name: '4-3-1-2', slots: [gk(0.5,0.88),def('def1',0.1,0.72,'LB'),def('def2',0.35,0.72,'CB'),def('def3',0.65,0.72,'CB'),def('def4',0.9,0.72,'RB'),mid('mid1',0.18,0.54,'LM'),mid('mid2',0.5,0.54,'CM'),mid('mid3',0.82,0.54,'RM'),mid('mid4',0.5,0.37,'TRQ'),fwd('fwd1',0.35,0.18,'LS'),fwd('fwd2',0.65,0.18,'RS')] },
  '4-3-2-1': { name: '4-3-2-1', slots: [gk(0.5,0.88),def('def1',0.1,0.72,'LB'),def('def2',0.35,0.72,'CB'),def('def3',0.65,0.72,'CB'),def('def4',0.9,0.72,'RB'),mid('mid1',0.18,0.54,'LM'),mid('mid2',0.5,0.54,'CM'),mid('mid3',0.82,0.54,'RM'),mid('mid4',0.33,0.35,'LAM'),mid('mid5',0.67,0.35,'RAM'),fwd('fwd1',0.5,0.18,'CF')] },
  '3-4-2-1': { name: '3-4-2-1', slots: [gk(0.5,0.88),def('def1',0.2,0.72,'CB'),def('def2',0.5,0.72,'CB'),def('def3',0.8,0.72,'CB'),mid('mid1',0.1,0.54,'LWB'),mid('mid2',0.37,0.54,'CM'),mid('mid3',0.63,0.54,'CM'),mid('mid4',0.9,0.54,'RWB'),mid('mid5',0.33,0.35,'LAM'),mid('mid6',0.67,0.35,'RAM'),fwd('fwd1',0.5,0.18,'CF')] },
  '3-5-1-1': { name: '3-5-1-1', slots: [gk(0.5,0.88),def('def1',0.2,0.72,'CB'),def('def2',0.5,0.72,'CB'),def('def3',0.8,0.72,'CB'),mid('mid1',0.1,0.54,'LWB'),mid('mid2',0.3,0.54,'LCM'),mid('mid3',0.5,0.54,'CM'),mid('mid4',0.7,0.54,'RCM'),mid('mid5',0.9,0.54,'RWB'),mid('mid6',0.5,0.35,'AM'),fwd('fwd1',0.5,0.18,'CF')] },
  '5-3-2': { name: '5-3-2', slots: [gk(0.5,0.88),def('def1',0.08,0.72,'LWB'),def('def2',0.27,0.72,'LCB'),def('def3',0.5,0.72,'CB'),def('def4',0.73,0.72,'RCB'),def('def5',0.92,0.72,'RWB'),mid('mid1',0.2,0.50,'LM'),mid('mid2',0.5,0.50,'CM'),mid('mid3',0.8,0.50,'RM'),fwd('fwd1',0.33,0.22,'LS'),fwd('fwd2',0.67,0.22,'RS')] },
  '5-4-1': { name: '5-4-1', slots: [gk(0.5,0.88),def('def1',0.08,0.72,'LWB'),def('def2',0.27,0.72,'LCB'),def('def3',0.5,0.72,'CB'),def('def4',0.73,0.72,'RCB'),def('def5',0.92,0.72,'RWB'),mid('mid1',0.1,0.50,'LM'),mid('mid2',0.37,0.50,'LCM'),mid('mid3',0.63,0.50,'RCM'),mid('mid4',0.9,0.50,'RM'),fwd('fwd1',0.5,0.22,'CF')] },
};

// ── Colors ────────────────────────────────────────────────────────────────────

const RED    = '#C8102E';
const YELLOW = '#F5C500';
const DARK   = '#1A1A1A';
const WHITE  = '#FFFFFF';

const SHIRT_W = 97;
const SHIRT_H = 106;

// ── Asset loading ─────────────────────────────────────────────────────────────

const ASSETS_DIR = path.join(process.cwd(), 'public');

function loadAsset(p: string): Promise<Image> {
  const buf = fs.readFileSync(path.join(ASSETS_DIR, p));
  return loadImage(buf);
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr)
      .toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
      .toUpperCase();
  } catch { return dateStr; }
}

function formatTime(dateStr: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

// ── Canvas helpers ────────────────────────────────────────────────────────────

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ── Layer 1: Header ───────────────────────────────────────────────────────────

function drawHeader(
  ctx: CanvasRenderingContext2D,
  config: MatchConfig,
  sinagraLogo: Image,
  opponentLogo: Image | null,
) {
  const opponentName = config.opponent || 'AVVERSARIO';
  const homeTeam = config.isHome ? 'SINAGRA' : opponentName.toUpperCase();
  const awayTeam = config.isHome ? opponentName.toUpperCase() : 'SINAGRA';
  const dateStr = formatDate(config.date);
  const timeStr = formatTime(config.date);

  // Row 1: MATCHDAY + number
  const MATCHDAY_TEXT = 'MATCHDAY';
  const matchdayNum = String(config.matchday || '1');

  ctx.font = '800 48px Impact, "DejaVu Sans", Arial, sans-serif';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  const mW = ctx.measureText(MATCHDAY_TEXT).width;
  ctx.font = '900 48px Impact, "DejaVu Sans", Arial, sans-serif';
  const nW = ctx.measureText(matchdayNum).width;
  const row1W = mW + 14 + nW;
  const row1X = (POSTER_W - row1W) / 2;

  ctx.font = '800 48px Impact, "DejaVu Sans", Arial, sans-serif';
  ctx.fillStyle = RED;
  ctx.fillText(MATCHDAY_TEXT, row1X, 72);

  ctx.font = '900 48px Impact, "DejaVu Sans", Arial, sans-serif';
  ctx.fillStyle = DARK;
  ctx.fillText(matchdayNum, row1X + mW + 14, 72);

  // Row 2: Competition
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.fillStyle = '#2A2A2A';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText((config.competition || 'CAMPIONATO DI PROMOZIONE').toUpperCase(), POSTER_W / 2, 130);

  // Separator line
  ctx.strokeStyle = 'rgba(26,26,26,0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, 152);
  ctx.lineTo(POSTER_W - 80, 152);
  ctx.stroke();

  // Row 3: Teams
  const LOGO_SIZE = 64;
  const VS_GAP = 14;
  const TEAMS_MID_Y = 180;

  ctx.font = '900 52px Impact, "DejaVu Sans", Arial, sans-serif';
  const homeW = ctx.measureText(homeTeam).width;
  const awayW = ctx.measureText(awayTeam).width;
  ctx.font = '900 28px Impact, "DejaVu Sans", Arial, sans-serif';
  const vsW = ctx.measureText('VS').width;

  const totalTeamsW = homeW + VS_GAP + LOGO_SIZE + VS_GAP + vsW + VS_GAP + LOGO_SIZE + VS_GAP + awayW;
  let cx = (POSTER_W - totalTeamsW) / 2;

  ctx.font = '900 52px Impact, "DejaVu Sans", Arial, sans-serif';
  ctx.fillStyle = DARK;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(homeTeam, cx, TEAMS_MID_Y);
  cx += homeW + VS_GAP;

  ctx.drawImage(sinagraLogo, cx, TEAMS_MID_Y - LOGO_SIZE / 2, LOGO_SIZE, LOGO_SIZE);
  cx += LOGO_SIZE + VS_GAP;

  ctx.font = '900 28px Impact, "DejaVu Sans", Arial, sans-serif';
  ctx.fillStyle = RED;
  ctx.textBaseline = 'middle';
  ctx.fillText('VS', cx, TEAMS_MID_Y);
  cx += vsW + VS_GAP;

  if (opponentLogo) {
    ctx.drawImage(opponentLogo, cx, TEAMS_MID_Y - LOGO_SIZE / 2, LOGO_SIZE, LOGO_SIZE);
  } else {
    drawShieldPlaceholder(ctx, cx, TEAMS_MID_Y - LOGO_SIZE / 2, LOGO_SIZE,
      (opponentName[0] || '?').toUpperCase());
  }
  cx += LOGO_SIZE + VS_GAP;

  ctx.font = '900 52px Impact, "DejaVu Sans", Arial, sans-serif';
  ctx.fillStyle = DARK;
  ctx.textBaseline = 'middle';
  ctx.fillText(awayTeam, cx, TEAMS_MID_Y);

  // Row 4: Date + Stadium
  const parts: string[] = [];
  if (dateStr) parts.push(dateStr + (timeStr ? ` · ${timeStr}` : ''));
  if (config.stadium) parts.push(config.stadium);

  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.fillStyle = '#333333';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(parts.join('  |  '), POSTER_W / 2, 225);
}

function drawShieldPlaceholder(
  ctx: CanvasRenderingContext2D, x: number, y: number, size: number, initial: string,
) {
  const scale = size / 64;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.moveTo(32, 3); ctx.lineTo(58, 12); ctx.lineTo(58, 34);
  ctx.bezierCurveTo(58, 49, 32, 61, 32, 61);
  ctx.bezierCurveTo(32, 61, 6, 49, 6, 34);
  ctx.lineTo(6, 12); ctx.closePath();
  ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.font = '900 22px Arial, sans-serif';
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(initial, 32, 38);
  ctx.restore();
}

// ── Layer 2: Title "LINE UP" ──────────────────────────────────────────────────

function drawTitle(ctx: CanvasRenderingContext2D) {
  const LEFT_OFFSET = 75;

  ctx.font = '900 88px Impact, "DejaVu Sans", Arial, sans-serif';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  ctx.fillStyle = DARK;
  const lineText = 'LINE ';
  const lineW = ctx.measureText(lineText).width;
  ctx.fillText(lineText, LEFT_OFFSET, 245);

  ctx.fillStyle = RED;
  ctx.fillText('UP', LEFT_OFFSET + lineW, 245);

  // Brushstroke
  const BRUSH_Y = 245 + 86 + 8;
  const BRUSH_W = POSTER_W - LEFT_OFFSET;
  const scaleX = BRUSH_W / 1040;
  const tx = (x: number) => LEFT_OFFSET + x * scaleX;
  const ty = (y: number) => BRUSH_Y + y;

  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.moveTo(tx(10), ty(11));
  ctx.bezierCurveTo(tx(200), ty(4),  tx(420), ty(17), tx(640), ty(9));
  ctx.bezierCurveTo(tx(800), ty(3),  tx(940), ty(15), tx(1030), ty(11));
  ctx.lineTo(tx(1030), ty(20));
  ctx.bezierCurveTo(tx(940), ty(24), tx(800), ty(12), tx(640), ty(18));
  ctx.bezierCurveTo(tx(420), ty(26), tx(200), ty(14), tx(10),  ty(20));
  ctx.closePath();
  ctx.fill();
}

// ── Layer 3: Player marker ────────────────────────────────────────────────────

function drawPlayerMarker(
  ctx: CanvasRenderingContext2D,
  player: Player | null,
  x: number, y: number,
  role: PlayerRole,
  shirtImg: Image,
  showInitial: boolean,
) {
  const TOTAL_H  = SHIRT_H + 2 + 22;
  const shirtLeft = Math.round(x - SHIRT_W / 2);
  const shirtTop  = Math.round(y - TOTAL_H * 0.55);

  if (player) {
    ctx.drawImage(shirtImg, shirtLeft, shirtTop, SHIRT_W, SHIRT_H);

    const numColor = role === 'goalkeeper' ? YELLOW : WHITE;
    ctx.font = '900 29px Impact, "DejaVu Sans", Arial, sans-serif';
    ctx.fillStyle = numColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillText(String(player.number), shirtLeft + SHIRT_W / 2, shirtTop + SHIRT_H / 2 + 6);
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

    const name = showInitial && player.firstName
      ? `${player.firstName[0].toUpperCase()}. ${player.lastName}`
      : player.lastName;
    const nameStr = name.toUpperCase();
    const labelTop = shirtTop + SHIRT_H + 2;

    ctx.font = 'bold 17px Arial, sans-serif';
    const nameW = ctx.measureText(nameStr).width;
    const padX = 6, padY = 2;
    const labelW = nameW + padX * 2;
    const labelH = 17 + padY * 2;

    ctx.fillStyle = 'rgba(20,20,20,0.88)';
    roundedRect(ctx, x - labelW / 2, labelTop, labelW, labelH, 3);
    ctx.fill();

    ctx.fillStyle = WHITE;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(nameStr, x, labelTop + labelH / 2);
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(shirtLeft, shirtTop, SHIRT_W, SHIRT_H);
    ctx.setLineDash([]);

    const labelTop = shirtTop + SHIRT_H + 2;
    const lW = 30, lH = 22;
    ctx.fillStyle = 'rgba(20,20,20,0.88)';
    roundedRect(ctx, x - lW / 2, labelTop, lW, lH, 3);
    ctx.fill();
    ctx.fillStyle = WHITE;
    ctx.font = 'bold 17px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('—', x, labelTop + lH / 2);
  }
}

// ── Layer 4: Bench panel ──────────────────────────────────────────────────────

function drawCoachIcon(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.strokeStyle = YELLOW; ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x + 13, y + 5, 4, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 13, y + 9);  ctx.lineTo(x + 13, y + 21); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 5,  y + 14); ctx.lineTo(x + 21, y + 14); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 13, y + 21); ctx.lineTo(x + 6,  y + 31); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 13, y + 21); ctx.lineTo(x + 20, y + 31); ctx.stroke();
  ctx.lineCap = 'butt';
}

function drawBenchPanel(
  ctx: CanvasRenderingContext2D,
  bench: string[],
  roster: Player[],
  coach: string,
  footerPanelImg: Image,
  duplicateLastNames: Set<string>,
) {
  const playerMap = Object.fromEntries(roster.map(p => [p.id, p]));
  const benchPlayers = bench.map(id => playerMap[id]).filter(Boolean) as Player[];

  const FP_W    = 1040;
  const FP_SCALE = FP_W / 1965;
  const FP_H    = Math.round(797 * FP_SCALE);
  const DARK_Y0 = Math.round(258 * FP_SCALE);
  const DARK_Y1 = Math.round(732 * FP_SCALE);
  const DARK_H  = DARK_Y1 - DARK_Y0;
  const FP_LEFT = Math.round((POSTER_W - FP_W) / 2);
  const DARK_TOP = 1082;
  const IMG_TOP  = DARK_TOP - DARK_Y0;

  ctx.drawImage(footerPanelImg, FP_LEFT, IMG_TOP, FP_W, FP_H);

  const SAFE_TOP  = 35, SAFE_BOTTOM = 30, SAFE_LEFT = 65, SAFE_RIGHT = 55;
  const CT  = DARK_TOP + SAFE_TOP;
  const CH  = DARK_H - SAFE_TOP - SAFE_BOTTOM;
  const CL  = FP_LEFT + SAFE_LEFT;
  const CW  = FP_W - SAFE_LEFT - SAFE_RIGHT;
  const ALLENATORE_W = 240;
  const SEP_MARGIN   = 18;
  const HEADER_Y = CT + 6;

  // PANCHINA header
  ctx.fillStyle = YELLOW;
  ctx.fillRect(CL, HEADER_Y, 3, 21);
  ctx.font = '900 21px Impact, "DejaVu Sans", Arial, sans-serif';
  ctx.fillStyle = YELLOW;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('PANCHINA', CL + 10, HEADER_Y);

  // 3 columns
  const perCol = Math.ceil(benchPlayers.length / 3);
  const panchW = CW - ALLENATORE_W - SEP_MARGIN * 2 - 1;
  const colW   = Math.floor((panchW - 58) / 3);
  const ROW_H  = 23;
  const PLAYERS_Y = CT + 36;

  for (let c = 0; c < 3; c++) {
    const colPlayers = benchPlayers.slice(c * perCol, (c + 1) * perCol);
    const colX = CL + c * (colW + 29);

    if (c > 0) {
      const sepX = CL + c * (colW + 29) - 15;
      ctx.strokeStyle = 'rgba(245,197,0,0.40)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sepX, CT); ctx.lineTo(sepX, CT + CH);
      ctx.stroke();
    }

    colPlayers.forEach((p, i) => {
      const rowY = PLAYERS_Y + i * ROW_H;
      ctx.font = '900 19px Impact, "DejaVu Sans", Arial, sans-serif';
      ctx.fillStyle = YELLOW; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(String(p.number), colX, rowY + 18);
      const displayName = duplicateLastNames.has(p.lastName) && p.firstName
        ? `${p.firstName[0].toUpperCase()}. ${p.lastName}` : p.lastName;
      ctx.font = 'bold 19px Arial, sans-serif';
      ctx.fillStyle = WHITE;
      ctx.fillText(displayName.toUpperCase(), colX + 30, rowY + 18);
    });
  }

  // Separator before ALLENATORE
  const SEP_X = CL + CW - ALLENATORE_W - SEP_MARGIN;
  ctx.strokeStyle = 'rgba(245,197,0,0.40)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(SEP_X, CT); ctx.lineTo(SEP_X, CT + CH); ctx.stroke();

  // ALLENATORE header
  const ALLEN_X = SEP_X + SEP_MARGIN;
  ctx.fillStyle = RED;
  ctx.fillRect(ALLEN_X, HEADER_Y, 3, 21);
  ctx.font = '900 21px Impact, "DejaVu Sans", Arial, sans-serif';
  ctx.fillStyle = YELLOW; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('ALLENATORE', ALLEN_X + 10, HEADER_Y);

  const COACH_Y = CT + 56;
  drawCoachIcon(ctx, ALLEN_X, COACH_Y);
  ctx.font = '800 19px Arial, sans-serif';
  ctx.fillStyle = WHITE; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText((coach || 'ALLENATORE').toUpperCase(), ALLEN_X + 38, COACH_Y + 17);

  // Social strip
  const socialY = Math.min(IMG_TOP + FP_H - (FP_H - DARK_Y1) + 10, POSTER_H - 30);
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.fillStyle = DARK; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('sinagra calcio', FP_LEFT + 54, socialY + 10);
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { roster, matchConfig, lineup } = req.body as {
    roster: Player[];
    matchConfig: MatchConfig;
    lineup: Lineup;
  };

  if (!roster || !matchConfig || !lineup) {
    return res.status(400).json({ error: 'missing fields' });
  }

  let bgImage: Image, pitchImage: Image, playerShirtImage: Image,
    gkShirtImage: Image, sinagraLogoImage: Image, footerPanelImage: Image;

  try {
    [bgImage, pitchImage, playerShirtImage, gkShirtImage, sinagraLogoImage, footerPanelImage] =
      await Promise.all([
        loadAsset('assets/poster/background.webp'),
        loadAsset('assets/poster/pitch.png'),
        loadAsset('assets/poster/player-shirt.png'),
        loadAsset('assets/poster/goalkeeper-shirt.png'),
        loadAsset('assets/poster/sinagra-logo.png'),
        loadAsset('assets/poster/footer-panel.png'),
      ]);
  } catch (err) {
    console.error('Asset load error:', err);
    return res.status(500).json({ error: 'failed to load assets' });
  }

  let opponentLogoImage: Image | null = null;
  if (matchConfig.opponentLogo) {
    try {
      if (matchConfig.opponentLogo.startsWith('http')) {
        const buf = await fetch(matchConfig.opponentLogo).then(r => r.arrayBuffer());
        opponentLogoImage = await loadImage(Buffer.from(buf));
      } else {
        opponentLogoImage = await loadAsset(`assets/logos/${matchConfig.opponentLogo}`);
      }
    } catch { /* use shield placeholder */ }
  }

  const canvas: Canvas = createCanvas(POSTER_W, POSTER_H);
  const ctx = canvas.getContext('2d');

  // Layer 0: Background
  ctx.drawImage(bgImage, 0, 0, POSTER_W, POSTER_H);

  // Layer 1: Header
  drawHeader(ctx, matchConfig, sinagraLogoImage, opponentLogoImage);

  // Layer 2: Title
  drawTitle(ctx);

  // Layer 3: Pitch + players
  ctx.drawImage(pitchImage, PITCH_IMG_OFFSET_X, PITCH_REGION.y + PITCH_IMG_OFFSET_Y, PITCH_IMG_W, PITCH_IMG_H);

  const layout = formationLayouts[matchConfig.formation] ?? formationLayouts['4-3-3'];
  const slotPositions = computeSlotPositions(matchConfig.formation, layout);
  const playerMap = Object.fromEntries(roster.map(p => [p.id, p]));

  const allIds = [...Object.values(lineup.starters), ...lineup.bench].filter(Boolean);
  const lastNameCount: Record<string, number> = {};
  for (const id of allIds) {
    const p = playerMap[id];
    if (p) lastNameCount[p.lastName] = (lastNameCount[p.lastName] ?? 0) + 1;
  }
  const duplicateLastNames = new Set(
    Object.entries(lastNameCount).filter(([, n]) => n > 1).map(([ln]) => ln),
  );

  for (const slot of layout.slots) {
    const playerId = lineup.starters[slot.id];
    const player = playerId ? playerMap[playerId] : null;
    const abs = slotPositions[slot.id] ?? { x: 540, y: 700 };
    const shirtImg = slot.role === 'goalkeeper' ? gkShirtImage : playerShirtImage;
    drawPlayerMarker(ctx, player, abs.x, abs.y, slot.role, shirtImg,
      player ? duplicateLastNames.has(player.lastName) : false);
  }

  // Layer 4: Bench panel
  drawBenchPanel(ctx, lineup.bench, roster, lineup.coach, footerPanelImage, duplicateLastNames);

  const buffer = await canvas.encode('jpeg', 92);
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Content-Disposition', 'attachment; filename="formazione.jpg"');
  res.send(buffer);
}
