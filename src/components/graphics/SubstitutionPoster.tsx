/**
 * SubstitutionPoster
 * ─────────────────────────────────────────────────────────────────────────────
 * Canvas fisso 1080 × 1350 px — stesso formato di FormationPoster e ResultPoster.
 *
 * Layer:
 *   0a. CssBackground     — fallback CSS (giallo + pennellate rosse)
 *   0b. result-background.png — stesso sfondo stadio di ResultPoster
 *    1. SubstitutionHeader — competizione + squadre + data/stadio (y:0-245)
 *    2. TitleSection       — "SOSTITUZIONI" nero+rosso (y:258)
 *    3. Scoreboard         — tabellone LED con minuto, numeri, nomi, sponsor (y:395)
 *    4. SocialFooter       — strip social in basso
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { forwardRef, useState } from 'react';
import type { SubstitutionConfig } from '../../domain/types';
import { POSTER_W, POSTER_H, LOGOS_BASE, POSTER_ASSETS } from '../../poster-config';
import { SinagraLogo } from './SinagraLogo';

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function logoSrc(url?: string): string | undefined {
  if (!url) return undefined;
  return url.startsWith('http') ? url : `${LOGOS_BASE}/${url}`;
}

// ── CSS fallback (identico a ResultPoster) ────────────────────────────────────

function CssBrushStrokes() {
  return (
    <svg width={POSTER_W} height={POSTER_H} viewBox={`0 0 ${POSTER_W} ${POSTER_H}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <path d="M -8 0 C 55 40,70 110,52 195 C 35 280,75 360,48 450 C 22 540,68 620,42 720 C 16 820,62 900,38 1000 C 14 1100,58 1200,30 1350 L -8 1350 Z" fill="#C8102E" opacity="0.92"/>
      <path d="M 55 0 C 90 60,75 130,58 200 C 42 270,68 340,55 430 L 42 430 L 42 0 Z" fill="#C8102E" opacity="0.65"/>
      <path d="M 1088 0 C 1025 50,1010 130,1030 220 C 1050 310,1008 390,1035 490 C 1062 590,1012 680,1042 780 C 1072 880,1018 960,1048 1060 C 1078 1160,1020 1260,1052 1350 L 1088 1350 Z" fill="#C8102E" opacity="0.92"/>
      <path d="M 1028 0 C 995 70,1008 160,1022 240 C 1036 320,1012 400,1025 490 L 1038 490 L 1038 0 Z" fill="#C8102E" opacity="0.55"/>
    </svg>
  );
}

function CssBackground({ bgLoaded }: { bgLoaded: boolean }) {
  if (bgLoaded) return null;
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: '#F5C500' }} />
      <CssBrushStrokes />
    </>
  );
}

// ── Icone SVG ─────────────────────────────────────────────────────────────────

function CalendarIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg width="16" height="17" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  );
}

function ShieldPlaceholder({ initial }: { initial: string }) {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path d="M32 3 L58 12 L58 34 C58 49 32 61 32 61 C32 61 6 49 6 34 L6 12 Z"
        fill="rgba(0,0,0,0.08)" stroke="rgba(0,0,0,0.18)" strokeWidth="1.5"/>
      <text x="32" y="38" textAnchor="middle" fontSize="22" fontWeight="900"
        fill="rgba(0,0,0,0.30)" fontFamily="Arial, sans-serif">{initial}</text>
    </svg>
  );
}

// ── Layer 1 — Header (identico a MatchHeader di FormationPoster) ─────────────

function SubstitutionHeader({ config }: { config: SubstitutionConfig }) {
  const dateStr = formatDate(config.date);
  const timeStr = formatTime(config.date);
  const opponentInitial = (config.awayTeam || '?')[0].toUpperCase();

  return (
    <div style={{
      position: 'absolute',
      left: 0, top: 0, width: POSTER_W, height: 245,
      display: 'flex', alignItems: 'center',
      padding: '0 28px', boxSizing: 'border-box',
    }}>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>

        {/* MATCHDAY label + giornata */}
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

        {/* Teams row: homeTeam [logo] VS [logo] awayTeam */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{
            color: '#1A1A1A', fontSize: 52, fontWeight: 900,
            fontFamily: 'Impact, "Arial Narrow", sans-serif', letterSpacing: '0.02em',
          }}>{config.homeTeam.toUpperCase()}</span>
          {config.homeLogo
            ? <img src={logoSrc(config.homeLogo)} alt={config.homeTeam} crossOrigin="anonymous"
                style={{ width: 64, height: 64, objectFit: 'contain', flexShrink: 0 }} />
            : <SinagraLogo size={64} />
          }
          <span style={{ color: '#C8102E', fontSize: 28, fontWeight: 900, letterSpacing: '0.14em' }}>VS</span>
          {config.awayLogo
            ? <img src={logoSrc(config.awayLogo)} alt={config.awayTeam} crossOrigin="anonymous"
                style={{ width: 64, height: 64, objectFit: 'contain', flexShrink: 0 }} />
            : <ShieldPlaceholder initial={opponentInitial} />
          }
          <span style={{
            color: '#1A1A1A', fontSize: 52, fontWeight: 900,
            fontFamily: 'Impact, "Arial Narrow", sans-serif', letterSpacing: '0.02em',
          }}>{config.awayTeam.toUpperCase()}</span>
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
              {config.stadium || 'CAMPO SPORTIVO SINAGRA'}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Layer 2 — Titolo "SOSTITUZIONI" ──────────────────────────────────────────

function TitleSection() {
  const FONT: React.CSSProperties = {
    fontFamily: 'Impact, "Arial Narrow", sans-serif',
    fontSize: 116, fontWeight: 900,
    lineHeight: 1, letterSpacing: '-0.01em',
  };

  return (
    <div style={{
      position: 'absolute',
      left: 0, top: 258, width: POSTER_W,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline' }}>
        <span style={{ ...FONT, color: '#1A1A1A' }}>SOSTI</span>
        <span style={{ ...FONT, color: '#C8102E' }}>TUZIONE</span>
      </div>
      {/* Pennellata rossa decorativa sotto il titolo */}
      <div style={{
        marginTop: 6,
        width: 680, height: 6,
        background: '#C8102E',
        borderRadius: 3,
        opacity: 0.85,
      }} />
    </div>
  );
}

// ── Layer 3 — Tabellone (asset statico + overlay dati dinamici) ───────────────
//
// Asset: substitution-board.png — 1774 × 887 px (ratio 2:1)
//
// BOUNDING BOX dei display LED (% relative a BOARD_W × BOARD_H)
// ricavate da pixel analysis (luminosity scan a x=25% e x=75%):
//
//  ┌─────────────────────────────────────────────────┐  y=0%
//  │         STRISCIA MINUTO  (y: 0%→19.7%)          │
//  ├──────────────────┬──────────┬───────────────────┤  y=19.7%
//  │  MATRICE LED OUT │  FRECCE  │  MATRICE LED IN   │
//  │  x:0%→43%        │ 43%→57%  │  x:57%→100%       │
//  │  y:19.7%→55.8%   │ (asset)  │  y:19.7%→55.8%    │
//  ├──────────────────┤          ├───────────────────┤  y=55.8%
//  │  FASCIA NOME OUT │          │  FASCIA NOME IN   │
//  │  y:55.8%→66.3%   │          │  y:55.8%→66.3%    │
//  ├──────────────────┴──────────┴───────────────────┤  y=66.3%
//  │                SPONSOR (asset, no overlay)       │
//  └─────────────────────────────────────────────────┘

function Scoreboard({ config }: { config: SubstitutionConfig }) {
  // ── Dimensioni board (INVARIATE) ──────────────────────────────────────────
  const BOARD_LEFT = 80;
  const BOARD_TOP  = 430;
  const BOARD_W    = POSTER_W - 160;          // 920 px
  const BOARD_H    = Math.round(BOARD_W / 2); // 460 px  (ratio 2:1)

  // ── Bounding box — display MINUTO ────────────────────────────────────────
  // Ricalcolato dopo crop dei bordi neri (image 1774×887 → 1545×825)
  const MIN_BOX  = { l: '0%',    t: '0%',    w: '100%',  h: '22%'   };

  // ── Bounding box — pannello LED USCENTE (rosso, sinistra) ─────────────────
  const OUT_NUM  = { l: '8%',    t: '22%',   w: '33%',   h: '34%'   };
  const OUT_NAME = { l: '8%',    t: '56.5%', w: '33%',   h: '11.5%' };

  // ── Bounding box — pannello LED ENTRANTE (verde, destra) ──────────────────
  const IN_NUM   = { l: '59.5%', t: '22%',   w: '33%',   h: '34%'   };
  const IN_NAME  = { l: '59.5%', t: '56.5%', w: '33%',   h: '11.5%' };


  const numOut  = config.playerOut.number || 0;
  const numIn   = config.playerIn.number  || 0;
  const nameOut = (config.playerOut.name  || '').toUpperCase();
  const nameIn  = (config.playerIn.name   || '').toUpperCase();

  // ── Font sizes proporzionali a BOARD_H ────────────────────────────────────
  const numFs = (n: number) =>
    Math.round(BOARD_H * (String(n).length === 1 ? 0.36 : 0.28));
  const nameFs = (name: string) => {
    if (name.length > 11) return Math.round(BOARD_H * 0.068);
    if (name.length > 8)  return Math.round(BOARD_H * 0.082);
    return Math.round(BOARD_H * 0.094);
  };
  const minuteFs = Math.round(BOARD_H * 0.155);
  // Stesso size per entrambi i cognomi (basato sul nome più lungo)
  const sharedNameFs = Math.min(nameFs(nameOut), nameFs(nameIn));

  // ── Helper: container assoluto + flex centrato ────────────────────────────
  // Ogni container coincide esattamente con la propria zona LED.
  // display:flex + alignItems:center + justifyContent:center
  // → il centro geometrico del testo coincide sempre col centro del container,
  //   indipendentemente dal contenuto (1 cifra, 2 cifre, nome corto/lungo).
  const BB = (b: { l: string; t: string; w: string; h: string }): React.CSSProperties => ({
    position: 'absolute',
    left: b.l, top: b.t, width: b.w, height: b.h,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  });

  return (
    <div style={{
      position: 'absolute',
      left: BOARD_LEFT, top: BOARD_TOP,
      width: BOARD_W, height: BOARD_H,
    }}>

      {/* Asset statico — tabellone completo con cornice, frecce e sponsor */}
      <img
        src={POSTER_ASSETS.substitutionBoard}
        alt=""
        crossOrigin="anonymous"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }}
      />

      {/* ── MINUTO — display superiore ── */}
      <div style={BB(MIN_BOX)}>
        <span style={{
          fontFamily: '"Courier New", "Lucida Console", monospace',
          fontSize: minuteFs, fontWeight: 900,
          color: '#FFB800', lineHeight: 1,
          letterSpacing: '0.08em', whiteSpace: 'nowrap',
          textShadow: '0 0 8px #FFB800, 0 0 22px rgba(255,184,0,0.55)',
        }}>{config.minute || '–'}</span><span style={{
          fontFamily: '"Courier New", "Lucida Console", monospace',
          fontSize: Math.round(minuteFs * 0.65), fontWeight: 900,
          color: '#FFB800', lineHeight: 1,
          letterSpacing: 0, marginLeft: '0.03em',
          verticalAlign: 'top',
          textShadow: '0 0 8px #FFB800, 0 0 22px rgba(255,184,0,0.55)',
        }}>′</span>
      </div>

      {/* ── NUMERO USCENTE — matrice LED rossa, pannello sinistro ── */}
      <div style={BB(OUT_NUM)}>
        <span style={{
          fontFamily: '"Courier New", "Lucida Console", monospace',
          fontSize: numFs(numOut), fontWeight: 900,
          color: '#FF3B30', lineHeight: 1,
          textShadow: '0 0 6px #FF3B30, 0 0 18px rgba(255,59,48,0.35)',
        }}>{numOut}</span>
      </div>

      {/* ── NOME USCENTE — fascia LED nera sotto la matrice sinistra ── */}
      <div style={BB(OUT_NAME)}>
        <span style={{
          fontSize: sharedNameFs, fontWeight: 700,
          color: '#FFFFFF',
          fontFamily: 'Impact, "Arial Narrow", sans-serif',
          letterSpacing: '0.07em',
          textShadow: '0 1px 4px rgba(0,0,0,0.9)',
          whiteSpace: 'nowrap',
        }}>{nameOut}</span>
      </div>

      {/* ── NUMERO ENTRANTE — matrice LED verde, pannello destro ── */}
      <div style={BB(IN_NUM)}>
        <span style={{
          fontFamily: '"Courier New", "Lucida Console", monospace',
          fontSize: numFs(numIn), fontWeight: 900,
          color: '#34C759', lineHeight: 1,
          textShadow: '0 0 6px #34C759, 0 0 18px rgba(52,199,89,0.35)',
        }}>{numIn}</span>
      </div>

      {/* ── NOME ENTRANTE — fascia LED nera sotto la matrice destra ── */}
      <div style={BB(IN_NAME)}>
        <span style={{
          fontSize: sharedNameFs, fontWeight: 700,
          color: '#FFFFFF',
          fontFamily: 'Impact, "Arial Narrow", sans-serif',
          letterSpacing: '0.07em',
          textShadow: '0 1px 4px rgba(0,0,0,0.9)',
          whiteSpace: 'nowrap',
        }}>{nameIn}</span>
      </div>

    </div>
  );
}

// ── Layer 4 — Social Footer ───────────────────────────────────────────────────

function SocialFooter() {
  return (
    <div style={{
      position: 'absolute',
      left: 36, top: POSTER_H - 56,
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
  );
}

// ── SubstitutionPoster ────────────────────────────────────────────────────────

export const SubstitutionPoster = forwardRef<HTMLDivElement, { config: SubstitutionConfig }>(
  ({ config }, ref) => {
    const [bgLoaded, setBgLoaded] = useState(false);

    return (
      <div
        ref={ref}
        style={{
          width: POSTER_W, height: POSTER_H,
          position: 'relative', overflow: 'hidden',
          fontFamily: 'Arial, sans-serif',
          flexShrink: 0,
        }}
      >
        {/* Layer 0a: CSS fallback (giallo + pennellate) */}
        <CssBackground bgLoaded={bgLoaded} />

        {/* Layer 0b: Background stadio (stesso di ResultPoster) */}
        <img
          src={POSTER_ASSETS.resultBackground}
          alt=""
          crossOrigin="anonymous"
          style={{
            position: 'absolute', inset: 0,
            width: POSTER_W, height: POSTER_H,
            objectFit: 'cover', display: 'block',
          }}
          onLoad={() => setBgLoaded(true)}
          onError={() => {/* fallback CSS rimane */}}
        />

        {/* Layer 1: Header con squadre */}
        <SubstitutionHeader config={config} />

        {/* Layer 2: Titolo "SOSTITUZIONI" */}
        <TitleSection />

        {/* Layer 3: Tabellone LED */}
        <Scoreboard config={config} />

        {/* Layer 4: Social footer */}
        <SocialFooter />
      </div>
    );
  }
);

SubstitutionPoster.displayName = 'SubstitutionPoster';
