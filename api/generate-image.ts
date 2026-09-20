import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import type { Canvas, CanvasRenderingContext2D, Image } from '@napi-rs/canvas';
import fs from 'fs';
import path from 'path';
import type { Player, MatchConfig, Lineup, PlayerRole } from '../src/domain/types.js';
import { formationLayouts } from '../src/domain/formations.js';
import { computeSlotPositions } from '../src/domain/formationEngine.js';

// ── Constants ─────────────────────────────────────────────────────────────────

const RED    = '#C8102E';
const YELLOW = '#F5C500';
const DARK   = '#1A1A1A';
const WHITE  = '#FFFFFF';

const POSTER_W = 1080;
const POSTER_H = 1350;

const SHIRT_W = 97;
const SHIRT_H = 106;

const ASSETS_DIR = path.join(process.cwd(), 'public');

function assetPath(p: string): string {
  return path.join(ASSETS_DIR, p);
}

function loadAsset(p: string): Promise<Image> {
  const buf = fs.readFileSync(assetPath(p));
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

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
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

  // ── Row 1: MATCHDAY + number (y≈72) ──────────────────────────────────────
  const R1_Y = 72;
  const MATCHDAY_TEXT = 'MATCHDAY';
  const matchdayNum = String(config.matchday || '1');

  ctx.font = '800 48px Impact, "DejaVu Sans", Arial, sans-serif';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  const mW = ctx.measureText(MATCHDAY_TEXT).width;
  ctx.font = '900 48px Impact, "DejaVu Sans", Arial, sans-serif';
  const nW = ctx.measureText(matchdayNum).width;

  const gap14 = 14;
  const row1W = mW + gap14 + nW;
  const row1X = (POSTER_W - row1W) / 2;

  ctx.font = '800 48px Impact, "DejaVu Sans", Arial, sans-serif';
  ctx.fillStyle = RED;
  ctx.fillText(MATCHDAY_TEXT, row1X, R1_Y);

  ctx.font = '900 48px Impact, "DejaVu Sans", Arial, sans-serif';
  ctx.fillStyle = DARK;
  ctx.fillText(matchdayNum, row1X + mW + gap14, R1_Y);

  // ── Row 2: Competition (y≈130) ────────────────────────────────────────────
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.fillStyle = '#2A2A2A';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText((config.competition || 'CAMPIONATO DI PROMOZIONE').toUpperCase(), POSTER_W / 2, 130);

  // ── Separator line (y≈152) ────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(26,26,26,0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, 152);
  ctx.lineTo(POSTER_W - 80, 152);
  ctx.stroke();

  // ── Row 3: Teams row (center y≈180) ──────────────────────────────────────
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

  // Home team
  ctx.font = '900 52px Impact, "DejaVu Sans", Arial, sans-serif';
  ctx.fillStyle = DARK;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(homeTeam, cx, TEAMS_MID_Y);
  cx += homeW + VS_GAP;

  // Sinagra logo
  ctx.drawImage(sinagraLogo, cx, TEAMS_MID_Y - LOGO_SIZE / 2, LOGO_SIZE, LOGO_SIZE);
  cx += LOGO_SIZE + VS_GAP;

  // VS
  ctx.font = '900 28px Impact, "DejaVu Sans", Arial, sans-serif';
  ctx.fillStyle = RED;
  ctx.textBaseline = 'middle';
  ctx.fillText('VS', cx, TEAMS_MID_Y);
  cx += vsW + VS_GAP;

  // Opponent logo or shield placeholder
  if (opponentLogo) {
    ctx.drawImage(opponentLogo, cx, TEAMS_MID_Y - LOGO_SIZE / 2, LOGO_SIZE, LOGO_SIZE);
  } else {
    drawShieldPlaceholder(ctx, cx, TEAMS_MID_Y - LOGO_SIZE / 2, LOGO_SIZE,
      (opponentName[0] || '?').toUpperCase());
  }
  cx += LOGO_SIZE + VS_GAP;

  // Away team
  ctx.font = '900 52px Impact, "DejaVu Sans", Arial, sans-serif';
  ctx.fillStyle = DARK;
  ctx.textBaseline = 'middle';
  ctx.fillText(awayTeam, cx, TEAMS_MID_Y);

  // ── Row 4: Date + Stadium (y≈225) ─────────────────────────────────────────
  const parts: string[] = [];
  if (dateStr) parts.push(dateStr + (timeStr ? ` · ${timeStr}` : ''));
  if (config.stadium) parts.push(config.stadium);
  const infoText = parts.join('  |  ');

  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.fillStyle = '#333333';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(infoText, POSTER_W / 2, 225);
}

function drawShieldPlaceholder(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number, initial: string,
) {
  const scale = size / 64;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.beginPath();
  ctx.moveTo(32, 3);
  ctx.lineTo(58, 12);
  ctx.lineTo(58, 34);
  ctx.bezierCurveTo(58, 49, 32, 61, 32, 61);
  ctx.bezierCurveTo(32, 61, 6, 49, 6, 34);
  ctx.lineTo(6, 12);
  ctx.closePath();

  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = '900 22px Arial, sans-serif';
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initial, 32, 38);

  ctx.restore();
}

// ── Layer 2: Title "LINE UP" ──────────────────────────────────────────────────

function drawTitle(ctx: CanvasRenderingContext2D) {
  const LEFT_OFFSET = 75;
  const TITLE_TOP = 245;

  // "LINE " + "UP"
  ctx.font = '900 88px Impact, "DejaVu Sans", Arial, sans-serif';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  ctx.fillStyle = DARK;
  const lineText = 'LINE ';
  const lineW = ctx.measureText(lineText).width;
  ctx.fillText(lineText, LEFT_OFFSET, TITLE_TOP);

  ctx.fillStyle = RED;
  ctx.fillText('UP', LEFT_OFFSET + lineW, TITLE_TOP);

  // Brushstroke below text (y ≈ TITLE_TOP + 88*0.92 + 8 = 334)
  // SVG viewBox "0 0 1040 22" scaled to (POSTER_W - LEFT_OFFSET) × 22
  const BRUSH_Y = TITLE_TOP + 86 + 8;
  const BRUSH_LEFT = LEFT_OFFSET;
  const BRUSH_W = POSTER_W - LEFT_OFFSET;
  const scaleX = BRUSH_W / 1040;

  const tx = (x: number) => BRUSH_LEFT + x * scaleX;
  const ty = (y: number) => BRUSH_Y + y;

  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.moveTo(tx(10), ty(11));
  ctx.bezierCurveTo(tx(200), ty(4), tx(420), ty(17), tx(640), ty(9));
  ctx.bezierCurveTo(tx(800), ty(3), tx(940), ty(15), tx(1030), ty(11));
  ctx.lineTo(tx(1030), ty(20));
  ctx.bezierCurveTo(tx(940), ty(24), tx(800), ty(12), tx(640), ty(18));
  ctx.bezierCurveTo(tx(420), ty(26), tx(200), ty(14), tx(10), ty(20));
  ctx.closePath();
  ctx.fill();
}

// ── Layer 3: Player markers ───────────────────────────────────────────────────

function drawPlayerMarker(
  ctx: CanvasRenderingContext2D,
  player: Player | null,
  x: number, y: number,
  role: PlayerRole,
  shirtImg: Image,
  showInitial: boolean,
) {
  // The CSS transform: translate(-50%, -55%) on a flex column of shirt+gap+label
  // TOTAL_H ≈ SHIRT_H(106) + gap(2) + label(22) = 130
  const TOTAL_H = SHIRT_H + 2 + 22;
  const shirtLeft = Math.round(x - SHIRT_W / 2);
  const shirtTop = Math.round(y - TOTAL_H * 0.55);

  if (player) {
    // Draw shirt
    ctx.drawImage(shirtImg, shirtLeft, shirtTop, SHIRT_W, SHIRT_H);

    // Draw number overlay centered on shirt (paddingTop: 12 pushes center down by 6)
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
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Name label below shirt
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
    const labelX = x - labelW / 2;

    ctx.fillStyle = 'rgba(20,20,20,0.88)';
    roundedRect(ctx, labelX, labelTop, labelW, labelH, 3);
    ctx.fill();

    ctx.fillStyle = WHITE;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(nameStr, x, labelTop + labelH / 2);
  } else {
    // Empty slot — dashed border
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(shirtLeft, shirtTop, SHIRT_W, SHIRT_H);
    ctx.setLineDash([]);

    // "—" label
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
  ctx.strokeStyle = YELLOW;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';

  // Head
  ctx.beginPath();
  ctx.arc(x + 13, y + 5, 4, 0, Math.PI * 2);
  ctx.stroke();

  // Body
  ctx.beginPath();
  ctx.moveTo(x + 13, y + 9);
  ctx.lineTo(x + 13, y + 21);
  ctx.stroke();

  // Arms
  ctx.beginPath();
  ctx.moveTo(x + 5, y + 14);
  ctx.lineTo(x + 21, y + 14);
  ctx.stroke();

  // Legs
  ctx.beginPath();
  ctx.moveTo(x + 13, y + 21);
  ctx.lineTo(x + 6, y + 31);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + 13, y + 21);
  ctx.lineTo(x + 20, y + 31);
  ctx.stroke();

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

  // Footer panel geometry (matches BenchPanel component constants)
  const FP_W    = 1040;
  const FP_SCALE = FP_W / 1965;
  const FP_H    = Math.round(797 * FP_SCALE);          // 421
  const DARK_Y0 = Math.round(258 * FP_SCALE);           // 137
  const DARK_Y1 = Math.round(732 * FP_SCALE);           // 388
  const DARK_H  = DARK_Y1 - DARK_Y0;                    // 251
  const FP_LEFT = Math.round((POSTER_W - FP_W) / 2);    // 20

  const DARK_TOP = 1082;
  const IMG_TOP  = DARK_TOP - DARK_Y0;                  // 945

  // Draw footer panel image
  ctx.drawImage(footerPanelImg, FP_LEFT, IMG_TOP, FP_W, FP_H);

  // Content area
  const SAFE_TOP    = 35;
  const SAFE_BOTTOM = 30;
  const SAFE_LEFT   = 65;
  const SAFE_RIGHT  = 55;
  const CT  = DARK_TOP + SAFE_TOP;                      // 1117
  const CH  = DARK_H - SAFE_TOP - SAFE_BOTTOM;          // 186
  const CL  = FP_LEFT + SAFE_LEFT;                      // 85
  const CW  = FP_W - SAFE_LEFT - SAFE_RIGHT;            // 920

  const ALLENATORE_W = 240;
  const SEP_MARGIN   = 18;

  // ── PANCHINA header ────────────────────────────────────────────────────────
  const HEADER_Y = CT + 6;

  // Yellow accent bar
  ctx.fillStyle = YELLOW;
  ctx.fillRect(CL, HEADER_Y, 3, 21);

  // "PANCHINA" text
  ctx.font = '900 21px Impact, "DejaVu Sans", Arial, sans-serif';
  ctx.fillStyle = YELLOW;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('PANCHINA', CL + 10, HEADER_Y);

  // ── Bench players in 3 columns ─────────────────────────────────────────────
  const perCol   = Math.ceil(benchPlayers.length / 3);
  const panchW   = CW - ALLENATORE_W - SEP_MARGIN * 2 - 1;
  const colW     = Math.floor((panchW - 2 * (14 + 1 + 14)) / 3);
  const ROW_H    = 23;
  const PLAYERS_Y = CT + 36; // below header

  for (let c = 0; c < 3; c++) {
    const colStart = c * perCol;
    const colPlayers = benchPlayers.slice(colStart, colStart + perCol);
    const colX = CL + c * (colW + 29); // 29 = 14 + 1 + 14

    // Column separator (before columns 1 and 2)
    if (c > 0) {
      const sepX = CL + c * (colW + 29) - 15;
      ctx.strokeStyle = 'rgba(245,197,0,0.40)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sepX, CT);
      ctx.lineTo(sepX, CT + CH);
      ctx.stroke();
    }

    colPlayers.forEach((p, i) => {
      const rowY = PLAYERS_Y + i * ROW_H;

      // Number
      ctx.font = '900 19px Impact, "DejaVu Sans", Arial, sans-serif';
      ctx.fillStyle = YELLOW;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(String(p.number), colX, rowY + 18);

      // Name
      const displayName = duplicateLastNames.has(p.lastName) && p.firstName
        ? `${p.firstName[0].toUpperCase()}. ${p.lastName}`
        : p.lastName;
      ctx.font = 'bold 19px Arial, sans-serif';
      ctx.fillStyle = WHITE;
      ctx.fillText(displayName.toUpperCase(), colX + 30, rowY + 18);
    });
  }

  // ── Vertical separator before ALLENATORE ──────────────────────────────────
  const SEP_X = CL + CW - ALLENATORE_W - SEP_MARGIN;
  ctx.strokeStyle = 'rgba(245,197,0,0.40)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(SEP_X, CT);
  ctx.lineTo(SEP_X, CT + CH);
  ctx.stroke();

  // ── ALLENATORE section ─────────────────────────────────────────────────────
  const ALLEN_X = SEP_X + SEP_MARGIN;

  // Red accent bar
  ctx.fillStyle = RED;
  ctx.fillRect(ALLEN_X, HEADER_Y, 3, 21);

  // "ALLENATORE" text
  ctx.font = '900 21px Impact, "DejaVu Sans", Arial, sans-serif';
  ctx.fillStyle = YELLOW;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('ALLENATORE', ALLEN_X + 10, HEADER_Y);

  // Coach icon + name
  const COACH_Y = CT + 56;
  drawCoachIcon(ctx, ALLEN_X, COACH_Y);

  ctx.font = '800 19px Arial, sans-serif';
  ctx.fillStyle = WHITE;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText((coach || 'ALLENATORE').toUpperCase(), ALLEN_X + 38, COACH_Y + 17);

  // ── Social strip (below panel) ─────────────────────────────────────────────
  const socialY = Math.min(IMG_TOP + FP_H - (FP_H - DARK_Y1) + 10, POSTER_H - 30);
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.fillStyle = DARK;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
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

  // Load assets
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

  // Load opponent logo (optional)
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

  // Create canvas
  const canvas: Canvas = createCanvas(POSTER_W, POSTER_H);
  const ctx = canvas.getContext('2d');

  // Layer 0: Background
  ctx.drawImage(bgImage, 0, 0, POSTER_W, POSTER_H);

  // Layer 1: Header
  drawHeader(ctx, matchConfig, sinagraLogoImage, opponentLogoImage);

  // Layer 2: Title "LINE UP"
  drawTitle(ctx);

  // Layer 3: Pitch + player markers
  // pitch.png at (0, 305 + 55) = (0, 360), size 1080 × 740
  ctx.drawImage(pitchImage, 0, 360, 1080, 740);

  const layout = formationLayouts[matchConfig.formation] ?? formationLayouts['4-3-3'];
  const slotPositions = computeSlotPositions(matchConfig.formation, layout);
  const playerMap = Object.fromEntries(roster.map(p => [p.id, p]));

  // Duplicate last-name detection (same logic as FormationPoster)
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
    const showInitial = player ? duplicateLastNames.has(player.lastName) : false;
    drawPlayerMarker(ctx, player, abs.x, abs.y, slot.role, shirtImg, showInitial);
  }

  // Layer 4: Bench panel
  drawBenchPanel(ctx, lineup.bench, roster, lineup.coach, footerPanelImage, duplicateLastNames);

  // Encode as JPEG and return
  const buffer = await canvas.encode('jpeg', 92);
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Content-Disposition', 'attachment; filename="formazione.jpg"');
  res.send(buffer);
}
