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
  posterName?: string;
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
  numberOverrides?: Record<string, number>;
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

// ── Result + Substitution types ───────────────────────────────────────────────

interface ScorerEntry {
  minute: number;
  playerName: string;
  note?: 'R' | 'AG';
}

interface ResultConfig {
  phase: 'FULL TIME' | 'HALF TIME' | 'LIVE';
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
  homeScorers: ScorerEntry[];
  awayScorers: ScorerEntry[];
}

interface SubstitutionPlayerT {
  number: number;
  name: string;
}

interface SubstitutionConfig {
  minute: string;
  playerOut: SubstitutionPlayerT;
  playerIn: SubstitutionPlayerT;
  matchday: string;
  competition: string;
  date: string;
  stadium: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string;
  awayLogo?: string;
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
  '4-1-4-1': { name: '4-1-4-1', slots: [gk(0.5,0.92),def('def1',0.10,0.75,'LB'),def('def2',0.35,0.75,'CB'),def('def3',0.65,0.75,'CB'),def('def4',0.90,0.75,'RB'),mid('mid1',0.50,0.60,'DM'),mid('mid2',0.10,0.42,'LM'),mid('mid3',0.37,0.42,'LCM'),mid('mid4',0.63,0.42,'RCM'),mid('mid5',0.90,0.42,'RM'),fwd('fwd1',0.50,0.18,'ST')] },
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

// ── Header icon helpers ───────────────────────────────────────────────────────
// Replicano CalendarIcon e LocationIcon di FormationPoster.tsx (SVG 24×24 → size px)

function drawCalendarIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 24;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = '#444444';
  ctx.lineWidth   = 2;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
  ctx.fillStyle   = 'none';
  // Rounded rect body
  roundedRect(ctx, 3, 4, 18, 18, 2);
  ctx.stroke();
  // Tick marks on top
  ctx.beginPath();
  ctx.moveTo(16, 2); ctx.lineTo(16, 6);
  ctx.moveTo(8,  2); ctx.lineTo(8,  6);
  // Horizontal rule
  ctx.moveTo(3, 10); ctx.lineTo(21, 10);
  ctx.stroke();
  ctx.restore();
}

function drawLocationIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 24;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = '#444444';
  ctx.lineWidth   = 2;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
  // Teardrop pin: semi-circle top + two bezier sides to bottom point
  ctx.beginPath();
  ctx.arc(12, 10, 9, Math.PI, 0); // upper half
  ctx.bezierCurveTo(21, 14, 14, 22, 12, 23); // right side to tip
  ctx.bezierCurveTo(10, 22,  3, 14,  3, 10); // left side back
  ctx.closePath();
  ctx.stroke();
  // Inner circle
  ctx.beginPath();
  ctx.arc(12, 10, 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// ── Layer 1: Header ───────────────────────────────────────────────────────────
// Replica esatta di MatchHeader in FormationPoster.tsx:
// tutto centrato, flex column, gap: 8.
// Layout: MATCHDAY + num | competition | separator | [home VS away + loghi] | data + stadio

function teamFontSize(a: string, b: string): number {
  const n = Math.max(a.length, b.length);
  if (n <= 9)  return 52;
  if (n <= 12) return 44;
  if (n <= 16) return 36;
  if (n <= 20) return 30;
  return 24;
}

// Shared header logic used by all three poster types
function drawGenericHeader(
  ctx: CanvasRenderingContext2D,
  data: { homeTeam: string; awayTeam: string; date: string; matchday: string; competition: string; stadium: string },
  leftLogoImg: Image | null,
  rightLogoImg: Image | null,
) {
  const dateStr = formatDate(data.date);
  const timeStr = formatTime(data.date);
  const CX = POSTER_W / 2;
  const PAD_H = 28;
  const MD_Y     = 25;
  const COMP_Y   = 91;
  const SEP_Y    = 118;
  const LOGO_SIZE = 64;
  const TEAMS_CY  = SEP_Y + 1 + 10 + LOGO_SIZE / 2;
  const DATE_Y    = Math.round(SEP_Y + 1 + 10 + LOGO_SIZE + 8);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ctx as any).letterSpacing = '0px';

  // Row 1: MATCHDAY (red) + matchday number (dark)
  ctx.font = '900 48px Impact, "DejaVu Sans", Arial, sans-serif';
  ctx.textBaseline = 'top';
  ctx.textAlign   = 'left';
  const mdW   = ctx.measureText('MATCHDAY').width;
  const numStr = String(data.matchday || '');
  const numW   = numStr ? ctx.measureText(numStr).width : 0;
  const GAP_MD = 14;
  const row1W  = mdW + (numStr ? GAP_MD + numW : 0);
  const row1X  = CX - row1W / 2;

  ctx.fillStyle = RED;
  ctx.fillText('MATCHDAY', row1X, MD_Y);
  if (numStr) {
    ctx.fillStyle = DARK;
    ctx.fillText(numStr, row1X + mdW + GAP_MD, MD_Y);
  }

  // Row 2: Competition
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.fillStyle = '#2A2A2A';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText((data.competition || 'CAMPIONATO DI PROMOZIONE').toUpperCase(), CX, COMP_Y);

  // Separator
  ctx.strokeStyle = 'rgba(26,26,26,0.22)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(PAD_H, SEP_Y);
  ctx.lineTo(POSTER_W - PAD_H, SEP_Y);
  ctx.stroke();

  // Row 3: center block logos + VS + team names
  ctx.font = '900 28px Impact, "DejaVu Sans", Arial, sans-serif';
  const vsW = ctx.measureText('VS').width;
  const INNER_GAP    = 10;
  const centerBlockW = LOGO_SIZE + INNER_GAP + vsW + INNER_GAP + LOGO_SIZE;
  const cbLeft       = CX - centerBlockW / 2;

  if (leftLogoImg) {
    ctx.drawImage(leftLogoImg, cbLeft, TEAMS_CY - LOGO_SIZE / 2, LOGO_SIZE, LOGO_SIZE);
  } else {
    drawShieldPlaceholder(ctx, cbLeft, TEAMS_CY - LOGO_SIZE / 2, LOGO_SIZE, (data.homeTeam[0] || '?').toUpperCase());
  }

  ctx.font = '900 28px Impact, "DejaVu Sans", Arial, sans-serif';
  ctx.fillStyle = RED;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('VS', CX, TEAMS_CY);

  const oppLogoX = cbLeft + LOGO_SIZE + INNER_GAP + vsW + INNER_GAP;
  if (rightLogoImg) {
    ctx.drawImage(rightLogoImg, oppLogoX, TEAMS_CY - LOGO_SIZE / 2, LOGO_SIZE, LOGO_SIZE);
  } else {
    drawShieldPlaceholder(ctx, oppLogoX, TEAMS_CY - LOGO_SIZE / 2, LOGO_SIZE, (data.awayTeam[0] || '?').toUpperCase());
  }

  const namePx = teamFontSize(data.homeTeam, data.awayTeam);
  ctx.font = `900 ${namePx}px Impact, "DejaVu Sans", Arial, sans-serif`;
  ctx.fillStyle = DARK;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  ctx.fillText(data.homeTeam.toUpperCase(), cbLeft - 10, TEAMS_CY);
  ctx.textAlign = 'left';
  ctx.fillText(data.awayTeam.toUpperCase(), cbLeft + centerBlockW + 10, TEAMS_CY);

  // Row 4: date + stadium with icons
  const ICON_SIZE = 17;
  const ICON_GAP  = 7;
  const ITEM_GAP  = 24;

  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  const dateText    = (dateStr || 'DATA DA DEFINIRE') + (timeStr ? ` · ${timeStr}` : '');
  const stadiumText = data.stadium || 'STADIO COMUNALE DI SINAGRA';
  const dateTextW    = ctx.measureText(dateText).width;
  const stadiumTextW = ctx.measureText(stadiumText).width;

  const totalW = ICON_SIZE + ICON_GAP + dateTextW + ITEM_GAP + ICON_SIZE + ICON_GAP + stadiumTextW;
  let ix = CX - totalW / 2;
  const textMidY = DATE_Y + ICON_SIZE / 2;

  drawCalendarIcon(ctx, ix, DATE_Y, ICON_SIZE);
  ix += ICON_SIZE + ICON_GAP;
  ctx.fillStyle = '#333333';
  ctx.fillText(dateText, ix, textMidY);
  ix += dateTextW + ITEM_GAP;
  drawLocationIcon(ctx, ix, DATE_Y, ICON_SIZE);
  ix += ICON_SIZE + ICON_GAP;
  ctx.fillStyle = '#333333';
  ctx.fillText(stadiumText, ix, textMidY);
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  config: MatchConfig,
  sinagraLogo: Image,
  opponentLogo: Image | null,
) {
  const opponentName = (config.opponent || 'AVVERSARIO').toUpperCase();
  const homeTeam = config.isHome ? 'SINAGRA' : opponentName;
  const awayTeam = config.isHome ? opponentName : 'SINAGRA';
  // Home team logo on left, away team logo on right
  const leftLogo  = config.isHome ? sinagraLogo : opponentLogo;
  const rightLogo = config.isHome ? opponentLogo : sinagraLogo;
  drawGenericHeader(ctx, {
    homeTeam, awayTeam,
    date: config.date,
    matchday: config.matchday,
    competition: config.competition,
    stadium: config.stadium,
  }, leftLogo, rightLogo);
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
  numberOverride?: number,
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
    ctx.fillText(String(numberOverride ?? player.number), shirtLeft + SHIRT_W / 2, shirtTop + SHIRT_H / 2 + 6);
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

    const name = player.posterName
      ? player.posterName
      : showInitial && player.firstName
        ? `${player.firstName[0].toUpperCase()}. ${player.lastName}`
        : player.lastName;
    const nameStr = name.toUpperCase();
    const labelTop = shirtTop + SHIRT_H + 2;

    ctx.font = 'bold 17px Arial, sans-serif';
    const nameW = ctx.measureText(nameStr).width;
    const padX = 6, padY = 2;
    const labelW = nameW + padX * 2;
    const labelH = 17 + padY * 2;

    ctx.fillStyle = '#1A1A1A';
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
  numberOverrides?: Record<string, number>,
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
      ctx.fillText(String(numberOverrides?.[p.id] ?? p.number), colX, rowY + 18);
      const displayName = p.posterName
        ? p.posterName
        : duplicateLastNames.has(p.lastName) && p.firstName
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

// ── Result poster drawing functions ──────────────────────────────────────────

function drawPhaseSection(ctx: CanvasRenderingContext2D, phase: string) {
  const y = 258;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ctx as any).letterSpacing = '0px';
  ctx.font = '900 80px Impact, "DejaVu Sans", Arial, sans-serif';
  ctx.textBaseline = 'top';

  if (phase === 'LIVE') {
    ctx.fillStyle = RED;
    ctx.textAlign = 'center';
    ctx.fillText('● LIVE', POSTER_W / 2, y);
  } else {
    const parts = phase.split(' ');
    const word1 = parts[0] + ' ';
    const word2 = parts[1] || '';
    const w1 = ctx.measureText(word1).width;
    const w2 = ctx.measureText(word2).width;
    const startX = Math.round((POSTER_W - w1 - w2) / 2);
    ctx.textAlign = 'left';
    ctx.fillStyle = DARK;
    ctx.fillText(word1, startX, y);
    ctx.fillStyle = RED;
    ctx.fillText(word2, startX + w1, y);
  }
}

function drawScoreSection(ctx: CanvasRenderingContext2D, homeGoals: number, awayGoals: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ctx as any).letterSpacing = '0px';
  const DASH_MARGIN = 16;

  ctx.font = '900 260px Impact, "DejaVu Sans", Arial, sans-serif';
  const homeW = ctx.measureText(String(homeGoals)).width;
  const awayW = ctx.measureText(String(awayGoals)).width;

  ctx.font = '900 130px Impact, "DejaVu Sans", Arial, sans-serif';
  const dashW = ctx.measureText('—').width;

  const totalW = homeW + DASH_MARGIN + dashW + DASH_MARGIN + awayW;
  const startX = Math.round((POSTER_W - totalW) / 2);

  // Numbers at y=375 top-aligned; dash offset to vertically center with 260px nums
  const numY  = 375;
  const dashY = 375 + 65; // (260 - 130) / 2 ≈ 65px vertical offset to center

  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  ctx.font = '900 260px Impact, "DejaVu Sans", Arial, sans-serif';
  ctx.fillStyle = DARK;
  ctx.fillText(String(homeGoals), startX, numY);

  ctx.font = '900 130px Impact, "DejaVu Sans", Arial, sans-serif';
  ctx.fillStyle = RED;
  ctx.fillText('—', startX + homeW + DASH_MARGIN, dashY);

  ctx.font = '900 260px Impact, "DejaVu Sans", Arial, sans-serif';
  ctx.fillStyle = DARK;
  ctx.fillText(String(awayGoals), startX + homeW + DASH_MARGIN + dashW + DASH_MARGIN, numY);
}

function drawScorersSection(
  ctx: CanvasRenderingContext2D,
  homeScorers: ScorerEntry[],
  awayScorers: ScorerEntry[],
) {
  const TOP      = 650;
  const ROW_H    = 34;
  const GAP      = 4;
  const MAX      = 7;
  const HOME_RIGHT = 480;
  const AWAY_LEFT  = 600;
  const ITEM_GAP   = 10;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ctx as any).letterSpacing = '0px';

  // Divider
  ctx.strokeStyle = 'rgba(26,26,26,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(POSTER_W / 2, TOP + 4);
  ctx.lineTo(POSTER_W / 2, TOP + MAX * (ROW_H + GAP) - 4);
  ctx.stroke();

  const sorted = (arr: ScorerEntry[]) => [...arr].sort((a, b) => a.minute - b.minute).slice(0, MAX);

  // Home scorers — right-aligned at HOME_RIGHT (minute closest to center)
  sorted(homeScorers).forEach((s, i) => {
    const centerY = TOP + i * (ROW_H + GAP) + ROW_H / 2;
    const minStr  = `${s.minute}'`;
    const noteStr = s.note ? `(${s.note})` : '';
    const nameStr = s.playerName.toUpperCase();

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';

    ctx.font = '900 26px Impact, "DejaVu Sans", Arial, sans-serif';
    const minW = ctx.measureText(minStr).width;
    ctx.fillStyle = '#FF4444';
    ctx.fillText(minStr, HOME_RIGHT, centerY);

    let rx = HOME_RIGHT - minW - ITEM_GAP;

    if (noteStr) {
      ctx.font = 'bold 18px Arial, sans-serif';
      const noteW = ctx.measureText(noteStr).width;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(noteStr, rx, centerY);
      rx -= noteW + ITEM_GAP;
    }

    ctx.font = 'bold 26px Arial, sans-serif';
    ctx.fillStyle = WHITE;
    ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 1;
    ctx.fillText(nameStr, rx, centerY);
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  });

  // Away scorers — left-aligned at AWAY_LEFT (name closest to center)
  sorted(awayScorers).forEach((s, i) => {
    const centerY = TOP + i * (ROW_H + GAP) + ROW_H / 2;
    const minStr  = `${s.minute}'`;
    const noteStr = s.note ? `(${s.note})` : '';
    const nameStr = s.playerName.toUpperCase();

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    ctx.font = 'bold 26px Arial, sans-serif';
    ctx.fillStyle = WHITE;
    ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 1;
    ctx.fillText(nameStr, AWAY_LEFT, centerY);
    const nameW = ctx.measureText(nameStr).width;
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    let lx = AWAY_LEFT + nameW + ITEM_GAP;

    if (noteStr) {
      ctx.font = 'bold 18px Arial, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(noteStr, lx, centerY);
      lx += ctx.measureText(noteStr).width + ITEM_GAP;
    }

    ctx.font = '900 26px Impact, "DejaVu Sans", Arial, sans-serif';
    ctx.fillStyle = '#FF4444';
    ctx.fillText(minStr, lx, centerY);
  });
}

function drawSocialFooter(ctx: CanvasRenderingContext2D) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ctx as any).letterSpacing = '0px';
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.fillStyle = DARK;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('sinagra calcio', 36 + 50, POSTER_H - 56 + 10);
}

// ── Substitution poster drawing functions ─────────────────────────────────────

function drawSubstitutionTitle(ctx: CanvasRenderingContext2D) {
  const y = 258;
  const FONT_SIZE = 116;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ctx as any).letterSpacing = '0px';
  ctx.textBaseline = 'top';
  ctx.font = `900 ${FONT_SIZE}px Impact, "DejaVu Sans", Arial, sans-serif`;

  const sostiW    = ctx.measureText('SOSTI').width;
  const tuzioneW  = ctx.measureText('TUZIONE').width;
  const startX    = Math.round((POSTER_W - sostiW - tuzioneW) / 2);

  ctx.textAlign = 'left';
  ctx.fillStyle = DARK;
  ctx.fillText('SOSTI', startX, y);
  ctx.fillStyle = RED;
  ctx.fillText('TUZIONE', startX + sostiW, y);

  // Red bar below title
  const BAR_W = 680;
  const barY  = y + FONT_SIZE + 6;
  ctx.fillStyle = RED;
  ctx.globalAlpha = 0.85;
  roundedRect(ctx, Math.round((POSTER_W - BAR_W) / 2), barY, BAR_W, 6, 3);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawScoreboard(ctx: CanvasRenderingContext2D, config: SubstitutionConfig, boardImg: Image) {
  const BOARD_LEFT = 80;
  const BOARD_TOP  = 430;
  const BOARD_W    = POSTER_W - 160; // 920
  const BOARD_H    = Math.round(BOARD_W / 2); // 460

  ctx.drawImage(boardImg, BOARD_LEFT, BOARD_TOP, BOARD_W, BOARD_H);

  const numOut  = config.playerOut.number || 0;
  const numIn   = config.playerIn.number  || 0;
  const nameOut = (config.playerOut.name || '').toUpperCase();
  const nameIn  = (config.playerIn.name  || '').toUpperCase();

  const minuteFs = Math.round(BOARD_H * 0.155);
  const numFsOut = Math.round(BOARD_H * (String(numOut).length === 1 ? 0.36 : 0.28));
  const numFsIn  = Math.round(BOARD_H * (String(numIn).length  === 1 ? 0.36 : 0.28));

  const nameFs = (name: string) => {
    if (name.length > 11) return Math.round(BOARD_H * 0.068);
    if (name.length > 8)  return Math.round(BOARD_H * 0.082);
    return Math.round(BOARD_H * 0.094);
  };
  const sharedNameFs = Math.min(nameFs(nameOut), nameFs(nameIn));

  const box = (l: string, t: string, w: string, h: string) => ({
    x: BOARD_LEFT + parseFloat(l) / 100 * BOARD_W,
    y: BOARD_TOP  + parseFloat(t) / 100 * BOARD_H,
    w: parseFloat(w) / 100 * BOARD_W,
    h: parseFloat(h) / 100 * BOARD_H,
  });

  const MIN_BOX  = box('0',    '0',    '100',  '22'   );
  const OUT_NUM  = box('8',    '22',   '33',   '34'   );
  const OUT_NAME = box('8',    '56.5', '33',   '11.5' );
  const IN_NUM   = box('59.5', '22',   '33',   '34'   );
  const IN_NAME  = box('59.5', '56.5', '33',   '11.5' );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ctx as any).letterSpacing = '0px';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  // Minute
  ctx.font = `900 ${minuteFs}px Impact, "DejaVu Sans", Arial, sans-serif`;
  ctx.fillStyle = '#FFB800';
  ctx.shadowColor = '#FFB800'; ctx.shadowBlur = 10;
  ctx.fillText((config.minute || '–') + '\u2032', MIN_BOX.x + MIN_BOX.w / 2, MIN_BOX.y + MIN_BOX.h / 2);
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;

  // Out number
  ctx.font = `900 ${numFsOut}px Impact, "DejaVu Sans", Arial, sans-serif`;
  ctx.fillStyle = '#FF3B30';
  ctx.shadowColor = '#FF3B30'; ctx.shadowBlur = 8;
  ctx.fillText(String(numOut), OUT_NUM.x + OUT_NUM.w / 2, OUT_NUM.y + OUT_NUM.h / 2);
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;

  // Out name
  ctx.font = `900 ${sharedNameFs}px Impact, "DejaVu Sans", Arial, sans-serif`;
  ctx.fillStyle = WHITE;
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 4;
  ctx.fillText(nameOut, OUT_NAME.x + OUT_NAME.w / 2, OUT_NAME.y + OUT_NAME.h / 2);
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;

  // In number
  ctx.font = `900 ${numFsIn}px Impact, "DejaVu Sans", Arial, sans-serif`;
  ctx.fillStyle = '#34C759';
  ctx.shadowColor = '#34C759'; ctx.shadowBlur = 8;
  ctx.fillText(String(numIn), IN_NUM.x + IN_NUM.w / 2, IN_NUM.y + IN_NUM.h / 2);
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;

  // In name
  ctx.font = `900 ${sharedNameFs}px Impact, "DejaVu Sans", Arial, sans-serif`;
  ctx.fillStyle = WHITE;
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 4;
  ctx.fillText(nameIn, IN_NAME.x + IN_NAME.w / 2, IN_NAME.y + IN_NAME.h / 2);
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
}

// ── Logo loader helper ────────────────────────────────────────────────────────

async function loadLogoFromUrl(url: string | undefined, fallback: Image): Promise<Image>;
async function loadLogoFromUrl(url: string | undefined, fallback: null): Promise<Image | null>;
async function loadLogoFromUrl(url: string | undefined, fallback: Image | null): Promise<Image | null> {
  if (!url) return fallback;
  try {
    if (url.startsWith('http')) {
      const buf = await fetch(url).then(r => r.arrayBuffer());
      return loadImage(Buffer.from(buf));
    }
    return await loadAsset(`assets/logos/${url}`);
  } catch {
    return fallback;
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = req.body as {
    type?: 'formation' | 'result' | 'substitution';
    // formation
    roster?: Player[];
    matchConfig?: MatchConfig;
    lineup?: Lineup;
    numberOverrides?: Record<string, number>;
    // result
    resultConfig?: ResultConfig;
    // substitution
    substitutionConfig?: SubstitutionConfig;
  };

  // ── Result poster ─────────────────────────────────────────────────────────
  if (body.type === 'result') {
    const cfg = body.resultConfig;
    if (!cfg) return res.status(400).json({ error: 'missing resultConfig' });

    let sinagraLogo: Image;
    let resultBg: Image;
    try {
      [sinagraLogo, resultBg] = await Promise.all([
        loadAsset('assets/poster/sinagra-logo.png'),
        loadAsset('assets/poster/result-background.png'),
      ]);
    } catch (err) {
      console.error('Asset load error:', err);
      return res.status(500).json({ error: 'failed to load assets' });
    }

    const leftLogoImg  = cfg.homeTeam.toUpperCase() === 'SINAGRA'
      ? sinagraLogo : await loadLogoFromUrl(cfg.homeLogo, null);
    const rightLogoImg = cfg.awayTeam.toUpperCase() === 'SINAGRA'
      ? sinagraLogo : await loadLogoFromUrl(cfg.awayLogo, null);

    const canvas: Canvas = createCanvas(POSTER_W, POSTER_H);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(resultBg, 0, 0, POSTER_W, POSTER_H);
    drawGenericHeader(ctx, {
      homeTeam: cfg.homeTeam, awayTeam: cfg.awayTeam,
      date: cfg.date, matchday: cfg.matchday,
      competition: cfg.competition, stadium: cfg.stadium,
    }, leftLogoImg, rightLogoImg);
    drawPhaseSection(ctx, cfg.phase);
    drawScoreSection(ctx, cfg.homeGoals, cfg.awayGoals);
    drawScorersSection(ctx, cfg.homeScorers, cfg.awayScorers);
    drawSocialFooter(ctx);

    const buffer = await canvas.encode('jpeg', 92);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Disposition', 'attachment; filename="risultato.jpg"');
    return res.send(buffer);
  }

  // ── Substitution poster ───────────────────────────────────────────────────
  if (body.type === 'substitution') {
    const cfg = body.substitutionConfig;
    if (!cfg) return res.status(400).json({ error: 'missing substitutionConfig' });

    let sinagraLogo: Image;
    let resultBg: Image;
    let boardImg: Image;
    try {
      [sinagraLogo, resultBg, boardImg] = await Promise.all([
        loadAsset('assets/poster/sinagra-logo.png'),
        loadAsset('assets/poster/result-background.png'),
        loadAsset('assets/poster/substitution-board.png'),
      ]);
    } catch (err) {
      console.error('Asset load error:', err);
      return res.status(500).json({ error: 'failed to load assets' });
    }

    const leftLogoImg  = cfg.homeTeam.toUpperCase() === 'SINAGRA'
      ? sinagraLogo : await loadLogoFromUrl(cfg.homeLogo, null);
    const rightLogoImg = cfg.awayTeam.toUpperCase() === 'SINAGRA'
      ? sinagraLogo : await loadLogoFromUrl(cfg.awayLogo, null);

    const canvas: Canvas = createCanvas(POSTER_W, POSTER_H);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(resultBg, 0, 0, POSTER_W, POSTER_H);
    drawGenericHeader(ctx, {
      homeTeam: cfg.homeTeam, awayTeam: cfg.awayTeam,
      date: cfg.date, matchday: cfg.matchday,
      competition: cfg.competition, stadium: cfg.stadium,
    }, leftLogoImg, rightLogoImg);
    drawSubstitutionTitle(ctx);
    drawScoreboard(ctx, cfg, boardImg);
    drawSocialFooter(ctx);

    const buffer = await canvas.encode('jpeg', 92);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Disposition', 'attachment; filename="sostituzione.jpg"');
    return res.send(buffer);
  }

  // ── Formation poster (default) ────────────────────────────────────────────

  const { roster, matchConfig, lineup, numberOverrides } = body as {
    roster: Player[];
    matchConfig: MatchConfig;
    lineup: Lineup;
    numberOverrides?: Record<string, number>;
  };
  if (numberOverrides) lineup.numberOverrides = numberOverrides;

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
    const numOverride = playerId ? lineup.numberOverrides?.[playerId] : undefined;
    drawPlayerMarker(ctx, player, abs.x, abs.y, slot.role, shirtImg,
      player ? duplicateLastNames.has(player.lastName) : false, numOverride);
  }

  // Layer 4: Bench panel
  drawBenchPanel(ctx, lineup.bench, roster, lineup.coach, footerPanelImage, duplicateLastNames, lineup.numberOverrides);

  const buffer = await canvas.encode('jpeg', 92);
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Content-Disposition', 'attachment; filename="formazione.jpg"');
  res.send(buffer);
}
