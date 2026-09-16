/**
 * ResultPoster
 * ─────────────────────────────────────────────────────────────────────────────
 * Canvas fisso 1080 × 1350 px — stesso formato del FormationPoster.
 *
 * Layer:
 *   0a. CssBackground     — fallback CSS (giallo + pennellate rosse)
 *   0b. ResultBackground  — result-background.png (stadio, fumogeni, sponsor)
 *    1. ResultHeader       — identico al FormationPoster (REGIONS.header, y:0-245)
 *    2. PhaseSection       — FULL TIME / HALF TIME / LIVE  (y:258)
 *    3. ScoreSection       — stemmi + squadre + risultato grande (y:375)
 *    4. ScorersSection     — marcatori casa sx, ospiti dx (y:570)
 *    5. SocialFooter       — strip social in basso
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { forwardRef, useState } from 'react';
import type { ResultConfig } from '../../domain/types';
import { POSTER_W, POSTER_H, REGIONS, LOGOS_BASE, POSTER_ASSETS } from '../../poster-config';
import { SinagraLogo } from './SinagraLogo';

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// ── CSS fallback ──────────────────────────────────────────────────────────────

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

// ── SVG icone ─────────────────────────────────────────────────────────────────

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

function ShieldPlaceholder({ initial }: { initial: string }) {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path d="M40 4 L72 16 L72 42 C72 61 40 76 40 76 C40 76 8 61 8 42 L8 16 Z" fill="rgba(0,0,0,0.10)" stroke="rgba(0,0,0,0.20)" strokeWidth="1.5"/>
      <text x="40" y="47" textAnchor="middle" fontSize="28" fontWeight="900" fill="rgba(0,0,0,0.28)" fontFamily="Impact, Arial, sans-serif">{initial}</text>
    </svg>
  );
}

// ── Layer 1 — Header (identico a MatchHeader di FormationPoster) ─────────────

function ResultHeader({ config }: { config: ResultConfig }) {
  const r = REGIONS.header; // { x:0, y:0, width:1080, height:245 }
  const dateStr = formatDate(config.date);
  const timeStr = formatTime(config.date);

  return (
    <div style={{
      position: 'absolute',
      left: r.x, top: r.y, width: r.width, height: r.height,
      display: 'flex', alignItems: 'center',
      padding: '0 28px', boxSizing: 'border-box',
    }}>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>

        {/* MATCHDAY + n */}
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
        }}>{config.competition || 'CAMPIONATO DI PROMOZIONE'}</span>

        {/* Separatore */}
        <div style={{ height: 1, background: 'rgba(26,26,26,0.22)', margin: '2px 0', alignSelf: 'stretch' }} />

        {/* Teams row: HOME [logo] VS [logo] AWAY */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{
            color: '#1A1A1A', fontSize: 52, fontWeight: 900,
            fontFamily: 'Impact, "Arial Narrow", sans-serif', letterSpacing: '0.02em',
          }}>{config.homeTeam.toUpperCase()}</span>
          {config.homeLogo
            ? <img src={logoSrc(config.homeLogo)} alt={config.homeTeam} crossOrigin="anonymous" style={{ width: 64, height: 64, objectFit: 'contain', flexShrink: 0 }} />
            : <SinagraLogo size={64} />
          }
          <span style={{ color: '#C8102E', fontSize: 28, fontWeight: 900, letterSpacing: '0.14em' }}>VS</span>
          {config.awayLogo
            ? <img src={logoSrc(config.awayLogo)} alt={config.awayTeam} crossOrigin="anonymous" style={{ width: 64, height: 64, objectFit: 'contain', flexShrink: 0 }} />
            : <ShieldPlaceholder initial={(config.awayTeam || '?')[0].toUpperCase()} />
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

// ── Layer 2 — FULL TIME / HALF TIME / LIVE ────────────────────────────────────

function PhaseSection({ phase }: { phase: ResultConfig['phase'] }) {
  const font: React.CSSProperties = {
    fontFamily: 'Impact, "Arial Narrow", sans-serif',
    fontSize: 80, fontWeight: 900, lineHeight: 0.9,
    letterSpacing: '-0.01em',
  };

  let content: React.ReactNode;
  if (phase === 'LIVE') {
    content = (
      <>
        <span style={{ ...font, color: '#C8102E' }}>● LIVE</span>
      </>
    );
  } else {
    const [word1, word2] = phase.split(' ') as [string, string];
    content = (
      <>
        <span style={{ ...font, color: '#1A1A1A' }}>{word1}&nbsp;</span>
        <span style={{ ...font, color: '#C8102E' }}>{word2}</span>
      </>
    );
  }

  return (
    <div style={{
      position: 'absolute',
      left: 0, top: 258, width: POSTER_W,
      display: 'flex', justifyContent: 'center', alignItems: 'baseline',
    }}>
      {content}
    </div>
  );
}

// ── Layer 3+4 — Score + Marcatori in layout orizzontale ───────────────────────

const SCORER_ROW_H = 28;
const MAX_SCORERS  = 7;

function ScorersList({ scorers, side }: { scorers: ResultConfig['homeScorers']; side: 'home' | 'away' }) {
  const sorted = [...scorers].sort((a, b) => a.minute - b.minute).slice(0, MAX_SCORERS);
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 6,
      alignItems: side === 'home' ? 'flex-end' : 'flex-start',
    }}>
      {sorted.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexShrink: 0 }}>
          <span style={{
            color: '#1A1A1A', fontSize: 22, fontWeight: 700,
            letterSpacing: '0.04em', lineHeight: 1,
            textShadow: '0 1px 5px rgba(255,255,255,0.85)',
            whiteSpace: 'nowrap',
          }}>{s.playerName.toUpperCase()}</span>
          <span style={{
            color: '#C8102E', fontSize: 22, fontWeight: 900,
            fontFamily: 'Impact, "Arial Narrow", sans-serif',
            lineHeight: 1, flexShrink: 0,
            textShadow: '0 1px 4px rgba(255,255,255,0.85)',
            whiteSpace: 'nowrap',
          }}>{s.minute}&apos;</span>
          {s.note && (
            <span style={{
              color: '#1A1A1A', fontSize: 15, fontWeight: 700,
              lineHeight: 1, flexShrink: 0, opacity: 0.75,
              textShadow: '0 1px 4px rgba(255,255,255,0.85)',
              whiteSpace: 'nowrap',
            }}>({s.note})</span>
          )}
        </div>
      ))}
    </div>
  );
}

function ScoreSection({ config }: { config: ResultConfig }) {
  return (
    <div style={{
      position: 'absolute',
      left: 0, top: 310, width: POSTER_W,
      display: 'flex', alignItems: 'center',
      padding: '0 36px', boxSizing: 'border-box',
      gap: 16,
    }}>
      {/* Marcatori CASA — right-aligned, centrati verticalmente sui numeri */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-end' }}>
        <ScorersList scorers={config.homeScorers} side="home" />
      </div>

      {/* Score centrale */}
      <div style={{
        display: 'flex', alignItems: 'center', flexShrink: 0,
        fontFamily: 'Impact, "Arial Narrow", sans-serif', lineHeight: 1,
      }}>
        <span style={{ fontSize: 280, fontWeight: 900, color: '#1A1A1A' }}>
          {config.homeGoals}
        </span>
        <span style={{ fontSize: 140, fontWeight: 900, color: '#C8102E', margin: '0 20px' }}>
          —
        </span>
        <span style={{ fontSize: 280, fontWeight: 900, color: '#1A1A1A' }}>
          {config.awayGoals}
        </span>
      </div>

      {/* Marcatori OSPITI — left-aligned, centrati verticalmente sui numeri */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-start' }}>
        <ScorersList scorers={config.awayScorers} side="away" />
      </div>
    </div>
  );
}

// ── Layer 5 — Social Footer ───────────────────────────────────────────────────

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

// ── ResultPoster ──────────────────────────────────────────────────────────────

export const ResultPoster = forwardRef<HTMLDivElement, { config: ResultConfig }>(
  ({ config }, ref) => {
    const [bgLoaded, setBgLoaded] = useState(false);

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

        {/* Layer 0b: Background stadio */}
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

        {/* Layer 1: Header — identico a FormationPoster (REGIONS.header) */}
        <ResultHeader config={config} />

        {/* Layer 2: FULL TIME / HALF TIME / LIVE */}
        <PhaseSection phase={config.phase} />

        {/* Layer 3+4: Score + Scorers in layout orizzontale */}
        <ScoreSection config={config} />

        {/* Layer 5: Social footer */}
        <SocialFooter />
      </div>
    );
  }
);

ResultPoster.displayName = 'ResultPoster';
