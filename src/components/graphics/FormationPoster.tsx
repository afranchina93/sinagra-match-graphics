/**
 * FormationPoster
 * ─────────────────────────────────────────────────────────────────────────────
 * Canvas fisso 1080 × 1350 px — tutti i layer sono position:absolute.
 *
 * Layer (dal basso verso l'alto):
 *   0a. CssBackground    — fallback CSS (attivo finché background.webp non carica)
 *   0b. PosterBackground — asset background.webp
 *    1. MatchHeader       — header editoriale NUOVO (logo + club info + match info)
 *    2. TitleSection      — "LINE UP" (LINE nero, UP rosso) + pennellata rossa
 *    3. FormationPitch    — campo (pitch.png) + PlayerMarker[] auto-posizionati
 *    4. BenchPanel        — footer-panel.png + PANCHINA + ALLENATORE + social
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { forwardRef, useState } from 'react';
import type { Player, MatchConfig, Lineup } from '../../domain/types';
import { formationLayouts } from '../../domain/formations';
import {
  POSTER_W, POSTER_H, REGIONS,
  POSTER_ASSETS, LOGOS_BASE,
} from '../../poster-config';
import { SinagraLogo } from './SinagraLogo';
import { FormationPitch } from './FormationPitch';

interface FormationPosterProps {
  roster: Player[];
  matchConfig: MatchConfig;
  lineup: Lineup;
  numberOverrides?: Record<string, number>;
}

// ── Helpers ────────────────────────────────────────────────────────────────

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

// ── CSS fallback background ─────────────────────────────────────────────────

function CssBrushStrokes() {
  return (
    <svg width={POSTER_W} height={POSTER_H} viewBox={`0 0 ${POSTER_W} ${POSTER_H}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <path d="M -8 0 C 55 40,70 110,52 195 C 35 280,75 360,48 450 C 22 540,68 620,42 720 C 16 820,62 900,38 1000 C 14 1100,58 1200,30 1350 L -8 1350 Z" fill="#C8102E" opacity="0.92"/>
      <path d="M 55 0 C 90 60,75 130,58 200 C 42 270,68 340,55 430 L 42 430 L 42 0 Z" fill="#C8102E" opacity="0.65"/>
      <path d="M 1088 0 C 1025 50,1010 130,1030 220 C 1050 310,1008 390,1035 490 C 1062 590,1012 680,1042 780 C 1072 880,1018 960,1048 1060 C 1078 1160,1020 1260,1052 1350 L 1088 1350 Z" fill="#C8102E" opacity="0.92"/>
      <path d="M 1028 0 C 995 70,1008 160,1022 240 C 1036 320,1012 400,1025 490 L 1038 490 L 1038 0 Z" fill="#C8102E" opacity="0.55"/>
      <path d="M 0 0 L 200 0 C 180 15,140 30,80 25 C 40 22,10 30,0 40 Z" fill="#C8102E" opacity="0.6"/>
      <path d="M 1080 0 L 880 0 C 900 18,940 32,1000 28 C 1040 25,1068 33,1080 45 Z" fill="#C8102E" opacity="0.6"/>
    </svg>
  );
}

function GrungeTexture() {
  return (
    <svg width={POSTER_W} height={POSTER_H} viewBox={`0 0 ${POSTER_W} ${POSTER_H}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'multiply' }}>
      <defs>
        <filter id="fpGrain">
          <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch" result="noise"/>
          <feColorMatrix type="saturate" values="0" in="noise" result="gray"/>
          <feComponentTransfer in="gray" result="faded">
            <feFuncA type="linear" slope="0.10"/>
          </feComponentTransfer>
          <feBlend in="SourceGraphic" in2="faded" mode="multiply"/>
        </filter>
      </defs>
      <rect width={POSTER_W} height={POSTER_H} fill="rgba(120,80,0,0.05)" filter="url(#fpGrain)"/>
    </svg>
  );
}

function TitleBrushstroke() {
  return (
    <svg viewBox="0 0 1040 22" xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', width: '100%', height: 22 }}>
      <path d="M 10 11 C 200 4,420 17,640 9 C 800 3,940 15,1030 11 L 1030 20 C 940 24,800 12,640 18 C 420 26,200 14,10 20 Z" fill="#C8102E"/>
    </svg>
  );
}

function CssBackground({ bgLoaded }: { bgLoaded: boolean }) {
  if (bgLoaded) return null;
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: '#F5C500' }} />
      <img
        src="/castello.png"
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute', right: -20, top: '16%',
          height: '46%', width: 'auto', objectFit: 'contain',
          filter: 'grayscale(1) contrast(1.4) brightness(0.3)',
          mixBlendMode: 'multiply', opacity: 0.14,
          pointerEvents: 'none',
        }}
      />
      <GrungeTexture />
      <CssBrushStrokes />
    </>
  );
}

function PosterBackground({ onLoad }: { onLoad: () => void }) {
  return (
    <img
      src={POSTER_ASSETS.background}
      alt=""
      crossOrigin="anonymous"
      style={{
        position: 'absolute', inset: 0,
        width: POSTER_W, height: POSTER_H,
        objectFit: 'cover',
        display: 'block',
      }}
      onLoad={onLoad}
      onError={() => { /* silently ignore — CSS fallback rimane */ }}
    />
  );
}

// ── SVG icone header ────────────────────────────────────────────────────────

function CalendarIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg width="16" height="17" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  );
}

/** Scudo placeholder quando il logo avversario non è ancora disponibile */
function ShieldPlaceholder({ initial }: { initial: string }) {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path d="M32 3 L58 12 L58 34 C58 49 32 61 32 61 C32 61 6 49 6 34 L6 12 Z" fill="rgba(0,0,0,0.08)" stroke="rgba(0,0,0,0.18)" strokeWidth="1.5"/>
      <text x="32" y="38" textAnchor="middle" fontSize="22" fontWeight="900" fill="rgba(0,0,0,0.30)" fontFamily="Arial, sans-serif">{initial}</text>
    </svg>
  );
}

// ── Layer 1 — Header NUOVO ──────────────────────────────────────────────────

function teamFontSize(a: string, b: string): number {
  const n = Math.max(a.length, b.length);
  if (n <= 9) return 52;
  if (n <= 12) return 44;
  if (n <= 16) return 36;
  if (n <= 20) return 30;
  return 24;
}

function MatchHeader({ config, homeTeam, awayTeam, dateStr, timeStr }: {
  config: MatchConfig;
  homeTeam: string;
  awayTeam: string;
  dateStr: string;
  timeStr: string;
}) {
  const r = REGIONS.header;
  const opponentInitial = (config.opponent || '?')[0].toUpperCase();
  const nameFontSize = teamFontSize(homeTeam, awayTeam);

  return (
    <div style={{
      position: 'absolute',
      left: r.x, top: r.y, width: r.width, height: r.height,
      display: 'flex', alignItems: 'center',
      padding: '0 28px', boxSizing: 'border-box',
    }}>

      {/* ── CENTRO: blocco editoriale match info ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>

          {/* MATCHDAY label + GIORNATA n */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <span style={{
              color: '#C8102E', fontSize: 48, fontWeight: 800,
              letterSpacing: '0.18em', fontFamily: 'Impact, sans-serif',
            }}>MATCHDAY</span>
            <span style={{
              color: '#1A1A1A', fontSize: 48, fontWeight: 900,
              fontFamily: 'Impact, "Arial Narrow", sans-serif',
              letterSpacing: '0.01em', lineHeight: 1,
            }}>{config.matchday || 'GIORNATA 1'}</span>
          </div>

          {/* Competizione */}
          <span style={{
            color: '#2A2A2A', fontSize: 14, fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase', lineHeight: 1,
          }}>
            {config.competition || 'CAMPIONATO DI PROMOZIONE'}
          </span>

          {/* Linea orizzontale */}
          <div style={{ height: 1, background: 'rgba(26,26,26,0.22)', margin: '2px 0' }} />

          {/* Teams row: SINAGRA [logo] VS [opponent logo] AVVERSARIO */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
            <span style={{
              flex: 1, textAlign: 'right',
              color: '#1A1A1A', fontSize: nameFontSize, fontWeight: 900,
              fontFamily: 'Impact, "Arial Narrow", sans-serif', letterSpacing: '0.02em',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{homeTeam}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <SinagraLogo size={64} />
              <span style={{ color: '#C8102E', fontSize: 28, fontWeight: 900, letterSpacing: '0.14em' }}>VS</span>
              {config.opponentLogo ? (
                <img
                  src={config.opponentLogo?.startsWith('http') ? config.opponentLogo : `${LOGOS_BASE}/${config.opponentLogo}`}
                  alt={config.opponent}
                  crossOrigin="anonymous"
                  style={{ width: 64, height: 64, objectFit: 'contain' }}
                />
              ) : (
                <ShieldPlaceholder initial={opponentInitial} />
              )}
            </div>
            <span style={{
              flex: 1, textAlign: 'left',
              color: '#1A1A1A', fontSize: nameFontSize, fontWeight: 900,
              fontFamily: 'Impact, "Arial Narrow", sans-serif', letterSpacing: '0.02em',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{awayTeam}</span>
          </div>

          {/* Data + stadio */}
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <CalendarIcon />
              <span style={{ color: '#333', fontSize: 14, fontWeight: 700, letterSpacing: '0.05em' }}>
                {dateStr || 'DATA DA DEFINIRE'}{timeStr ? ` · ${timeStr}` : ''}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <LocationIcon />
              <span style={{ color: '#333', fontSize: 14, fontWeight: 700, letterSpacing: '0.05em' }}>
                {config.stadium || 'STADIO COMUNALE DI SINAGRA'}
              </span>
            </div>
          </div>

        </div>
    </div>
  );
}

// ── Layer 2 — Titolo "LINE UP" ──────────────────────────────────────────────

function TitleSection() {
  const r = REGIONS.title;
  const LEFT_OFFSET = 75;
  // Posizionato appena sopra la superficie verde (PLAYABLE_TOP ≈ 453).
  // zIndex: 2 lo mantiene sopra all'immagine del campo (pitch è Layer 3 ma
  // senza z-index esplicito, quindi cede al nostro z-index positivo).
  // top = 453 - 111 (content height: text 81 + gap 8 + brushstroke 22) - 7 = 335
  return (
    <div style={{
      position: 'absolute',
      left: r.x, top: 245, width: r.width, height: 118,
      display: 'flex', flexDirection: 'column',
      alignItems: 'flex-start', justifyContent: 'flex-start',
      zIndex: 2,
    }}>
      {/* "LINE UP" — LINE nero, UP rosso Sinagra — allineato a sinistra */}
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 0,
        fontFamily: 'Impact, "Arial Narrow", Arial Black, sans-serif',
        lineHeight: 0.92,
        marginBottom: 8,
        marginLeft: LEFT_OFFSET,
      }}>
        <span style={{ fontSize: 88, fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.01em' }}>LINE&nbsp;</span>
        <span style={{ fontSize: 88, fontWeight: 900, color: '#C8102E', letterSpacing: '-0.01em' }}>UP</span>
      </div>
      {/* Pennellata rossa — parte dallo stesso asse sinistro */}
      <div style={{ width: `calc(100% - ${LEFT_OFFSET}px)`, marginLeft: LEFT_OFFSET }}>
        <TitleBrushstroke />
      </div>
    </div>
  );
}

// ── Layer 4 — Footer: footer-panel.png + PANCHINA + ALLENATORE + social ─────
//
// footer-panel-cropped.png (1965×797 RGBA):
//   Area opaca: Y_SRC 258–732 (474px)
//   Superiore e inferiore TRASPARENTI
//
// FP_W=1040 px (quasi larghezza canvas, ~20px margine per lato)
//   FP_SCALE = 1040/1965
//   FP_H = 421, DARK_Y0=137, DARK_Y1=388, DARK_H=251
//   DARK_TOP=1082, IMG_TOP=945
//   footerSafeArea = { left:65, right:55, top:35, bottom:30 }
//   CT=1117, CH=186, CL=85, CW=920

function CoachIcon() {
  return (
    <svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <circle cx="13" cy="5" r="4" fill="none" stroke="#F5C500" strokeWidth="1.8"/>
      <line x1="13" y1="9"  x2="13" y2="21" stroke="#F5C500" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="5"  y1="14" x2="21" y2="14" stroke="#F5C500" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="13" y1="21" x2="6"  y2="31" stroke="#F5C500" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="13" y1="21" x2="20" y2="31" stroke="#F5C500" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function BenchPanel({ bench, roster, coach, duplicateLastNames, numberOverrides }: { bench: string[]; roster: Player[]; coach: string; duplicateLastNames: Set<string>; numberOverrides?: Record<string, number> }) {
  const playerMap = Object.fromEntries(roster.map((p) => [p.id, p]));
  const benchPlayers = bench.map((id) => playerMap[id]).filter(Boolean) as Player[];

  const perCol = Math.ceil(benchPlayers.length / 3);
  const col1 = benchPlayers.slice(0, perCol);
  const col2 = benchPlayers.slice(perCol, perCol * 2);
  const col3 = benchPlayers.slice(perCol * 2);

  // Dimensioni footer panel (quasi larghezza canvas)
  const FP_W    = 1040;
  const FP_SCALE = FP_W / 1965;
  const FP_H    = Math.round(797 * FP_SCALE);         // 421
  const DARK_Y0 = Math.round(258 * FP_SCALE);         // 137
  const DARK_Y1 = Math.round(732 * FP_SCALE);         // 388
  const DARK_H  = DARK_Y1 - DARK_Y0;                  // 251
  const FP_LEFT = Math.round((POSTER_W - FP_W) / 2);  // 20

  // Posizionamento: dark panel top a y=1082
  const DARK_TOP   = 1082;
  const IMG_TOP    = DARK_TOP - DARK_Y0;              // 945
  const IMG_BOT    = IMG_TOP + FP_H;                  // 1366 (overflow:hidden clippa i px trasparenti)
  const SOCIAL_TOP = IMG_BOT - (FP_H - DARK_Y1) + 10; // sotto dark_bot + 10px

  // Safe content area — evita le pennellate sui bordi del pannello
  const SAFE_TOP    = 35;
  const SAFE_BOTTOM = 30;
  const SAFE_LEFT   = 65;
  const SAFE_RIGHT  = 55;
  const CT = DARK_TOP + SAFE_TOP;                     // 1117
  const CH = DARK_H - SAFE_TOP - SAFE_BOTTOM;         // 186
  const CL = FP_LEFT + SAFE_LEFT;                     // 85
  const CW = FP_W - SAFE_LEFT - SAFE_RIGHT;           // 920

  return (
    <>
      {/* ── footer-panel.png: oggetto grafico (NO sfondo CSS, NO clip) ── */}
      <img
        src={POSTER_ASSETS.footerPanel}
        alt=""
        crossOrigin="anonymous"
        style={{
          position: 'absolute',
          left: FP_LEFT,
          top: IMG_TOP,
          width: FP_W,
          height: FP_H,
          display: 'block',
          pointerEvents: 'none',
        }}
      />

      {/* ── Contenuto nell'area sicura: PANCHINA + ALLENATORE ── */}
      <div style={{
        position: 'absolute',
        left: CL, top: CT, width: CW, height: CH,
        display: 'flex', alignItems: 'stretch', gap: 0,
      }}>

        {/* ── PANCHINA (flex:1, ~70%) ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
            <div style={{ width: 3, height: 21, background: '#F5C500', borderRadius: 1, flexShrink: 0 }} />
            <span style={{
              color: '#F5C500', fontSize: 21, fontWeight: 900,
              letterSpacing: '0.18em', fontFamily: 'Impact, Arial Black, sans-serif', lineHeight: 1,
            }}>PANCHINA</span>
          </div>

          <div style={{ display: 'flex', flex: 1, alignItems: 'flex-start', gap: 0 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {col1.map((p) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ color: '#F5C500', fontSize: 19, fontWeight: 900, minWidth: 26, fontFamily: 'Impact, Arial Black, sans-serif', flexShrink: 0 }}>
                    {numberOverrides?.[p.id] ?? p.number}
                  </span>
                  <span style={{ color: '#FFFFFF', fontSize: 19, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
                    {p.posterName
                      ? p.posterName
                      : duplicateLastNames.has(p.lastName) && p.firstName
                        ? `${p.firstName[0].toUpperCase()}. ${p.lastName}`
                        : p.lastName}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(245,197,0,0.40)', flexShrink: 0, margin: '0 14px' }} />

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {col2.map((p) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ color: '#F5C500', fontSize: 19, fontWeight: 900, minWidth: 26, fontFamily: 'Impact, Arial Black, sans-serif', flexShrink: 0 }}>
                    {numberOverrides?.[p.id] ?? p.number}
                  </span>
                  <span style={{ color: '#FFFFFF', fontSize: 19, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
                    {p.posterName
                      ? p.posterName
                      : duplicateLastNames.has(p.lastName) && p.firstName
                        ? `${p.firstName[0].toUpperCase()}. ${p.lastName}`
                        : p.lastName}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(245,197,0,0.40)', flexShrink: 0, margin: '0 14px' }} />

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {col3.map((p) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ color: '#F5C500', fontSize: 19, fontWeight: 900, minWidth: 26, fontFamily: 'Impact, Arial Black, sans-serif', flexShrink: 0 }}>
                    {numberOverrides?.[p.id] ?? p.number}
                  </span>
                  <span style={{ color: '#FFFFFF', fontSize: 19, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
                    {p.posterName
                      ? p.posterName
                      : duplicateLastNames.has(p.lastName) && p.firstName
                        ? `${p.firstName[0].toUpperCase()}. ${p.lastName}`
                        : p.lastName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Separatore verticale PANCHINA / ALLENATORE */}
        <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(245,197,0,0.40)', flexShrink: 0, margin: '0 18px' }} />

        {/* ── ALLENATORE (width:240 ≈28%, allineato in alto) ── */}
        <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 3, height: 21, background: '#C8102E', borderRadius: 1, flexShrink: 0 }} />
            <span style={{
              color: '#F5C500', fontSize: 21, fontWeight: 900,
              letterSpacing: '0.10em', fontFamily: 'Impact, Arial Black, sans-serif', lineHeight: 1,
            }}>ALLENATORE</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CoachIcon />
            <span style={{
              color: '#FFFFFF', fontSize: 19, fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.3,
            }}>
              {coach || 'ALLENATORE'}
            </span>
          </div>
        </div>

      </div>

      {/* ── Strip social — SOTTO il pannello, sul background giallo ── */}
      <div style={{
        position: 'absolute',
        left: FP_LEFT + 4,
        top: Math.min(SOCIAL_TOP, POSTER_H - 36),
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#1A1A1A">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
        </svg>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#1A1A1A">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
        <span style={{
          color: '#1A1A1A', fontSize: 13, fontWeight: 700,
          letterSpacing: '0.10em', textTransform: 'lowercase',
        }}>sinagra calcio</span>
      </div>
    </>
  );
}

// ── FormationPoster ─────────────────────────────────────────────────────────

export const FormationPoster = forwardRef<HTMLDivElement, FormationPosterProps>(
  ({ roster, matchConfig, lineup, numberOverrides }, ref) => {
    const [bgLoaded, setBgLoaded] = useState(false);
    const layout = formationLayouts[matchConfig.formation] ?? formationLayouts['4-3-3'];

    const opponentName = matchConfig.opponent || 'AVVERSARIO';
    const homeTeam = matchConfig.isHome ? 'SINAGRA' : opponentName.toUpperCase();
    const awayTeam = matchConfig.isHome ? opponentName.toUpperCase() : 'SINAGRA';

    // Calcola cognomi duplicati tra tutti i giocatori in lineup (titolari + panchina)
    const allLineupIds = [
      ...Object.values(lineup.starters),
      ...lineup.bench,
    ].filter(Boolean);
    const playerMap = Object.fromEntries(roster.map((p) => [p.id, p]));
    const lastNameCount: Record<string, number> = {};
    for (const id of allLineupIds) {
      const p = playerMap[id];
      if (p) lastNameCount[p.lastName] = (lastNameCount[p.lastName] ?? 0) + 1;
    }
    const duplicateLastNames = new Set(
      Object.entries(lastNameCount).filter(([, n]) => n > 1).map(([ln]) => ln)
    );

    return (
      <div
        ref={ref}
        style={{
          width: POSTER_W,
          height: POSTER_H,
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'Arial, sans-serif',
          flexShrink: 0,
        }}
      >
        {/* Layer 0a: CSS fallback */}
        <CssBackground bgLoaded={bgLoaded} />

        {/* Layer 0b: Background asset */}
        <PosterBackground onLoad={() => setBgLoaded(true)} />

        {/* Layer 1: Header editoriale NUOVO */}
        <MatchHeader
          config={matchConfig}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          dateStr={formatDate(matchConfig.date)}
          timeStr={formatTime(matchConfig.date)}
        />

        {/* Layer 2: "LINE UP" + pennellata */}
        <TitleSection />

        {/* Layer 3: Pitch + Player markers (auto-layout via formationEngine) */}
        <FormationPitch
          layout={layout}
          starters={lineup.starters}
          roster={roster}
          duplicateLastNames={duplicateLastNames}
          numberOverrides={numberOverrides}
        />

        {/* Layer 4: BenchPanel */}
        <BenchPanel bench={lineup.bench} roster={roster} coach={lineup.coach} duplicateLastNames={duplicateLastNames} numberOverrides={numberOverrides} />
      </div>
    );
  }
);

FormationPoster.displayName = 'FormationPoster';
