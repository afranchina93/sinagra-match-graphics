import { forwardRef } from 'react';
import type { Player, MatchConfig, Lineup } from '../../domain/types';
import { formationLayouts } from '../../domain/formations';
import { SinagraLogo } from './SinagraLogo';
import { FootballField } from './FootballField';

interface GraphicsPreviewProps {
  roster: Player[];
  matchConfig: MatchConfig;
  lineup: Lineup;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'DOMENICA';
  try {
    const d = new Date(dateStr);
    return d
      .toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
      .toUpperCase();
  } catch {
    return dateStr;
  }
}

function formatTime(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// Red irregular brushstroke SVG paths for background edges
function RedBrushStrokes() {
  return (
    <svg
      width="1080"
      height="1350"
      viewBox="0 0 1080 1350"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}
    >
      {/* Left brushstroke — large irregular red stripe */}
      <path
        d="M -8 0 C 55 40, 70 110, 52 195 C 35 280, 75 360, 48 450
           C 22 540, 68 620, 42 720 C 16 820, 62 900, 38 1000
           C 14 1100, 58 1200, 30 1350 L -8 1350 Z"
        fill="#C8102E"
        opacity="0.92"
      />
      {/* Left secondary drip */}
      <path
        d="M 55 0 C 90 60, 75 130, 58 200 C 42 270, 68 340, 55 430 L 42 430 L 42 0 Z"
        fill="#C8102E"
        opacity="0.65"
      />
      {/* Right brushstroke */}
      <path
        d="M 1088 0 C 1025 50, 1010 130, 1030 220 C 1050 310, 1008 390, 1035 490
           C 1062 590, 1012 680, 1042 780 C 1072 880, 1018 960, 1048 1060
           C 1078 1160, 1020 1260, 1052 1350 L 1088 1350 Z"
        fill="#C8102E"
        opacity="0.92"
      />
      {/* Right secondary drip */}
      <path
        d="M 1028 0 C 995 70, 1008 160, 1022 240 C 1036 320, 1012 400, 1025 490 L 1038 490 L 1038 0 Z"
        fill="#C8102E"
        opacity="0.55"
      />
      {/* Top accent splash */}
      <path
        d="M 0 0 L 200 0 C 180 15, 140 30, 80 25 C 40 22, 10 30, 0 40 Z"
        fill="#C8102E"
        opacity="0.6"
      />
      <path
        d="M 1080 0 L 880 0 C 900 18, 940 32, 1000 28 C 1040 25, 1068 33, 1080 45 Z"
        fill="#C8102E"
        opacity="0.6"
      />
    </svg>
  );
}

// Light grunge/paper texture overlay
function GrungTexture() {
  return (
    <svg
      width="1080"
      height="1350"
      viewBox="0 0 1080 1350"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2, mixBlendMode: 'multiply' }}
    >
      <defs>
        <filter id="grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.72"
            numOctaves="4"
            stitchTiles="stitch"
            result="noise"
          />
          <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise" />
          <feComponentTransfer in="grayNoise" result="fadedNoise">
            <feFuncA type="linear" slope="0.12" />
          </feComponentTransfer>
          <feBlend in="SourceGraphic" in2="fadedNoise" mode="multiply" />
        </filter>
      </defs>
      <rect width="1080" height="1350" fill="rgba(120,80,0,0.06)" filter="url(#grain)" />
    </svg>
  );
}

// Brushstroke underline for title
function TitleBrushstroke() {
  return (
    <svg
      viewBox="0 0 1040 22"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', width: '100%', height: 22 }}
    >
      <path
        d="M 10 11 C 200 4, 420 17, 640 9 C 800 3, 940 15, 1030 11 L 1030 20 C 940 24, 800 12, 640 18 C 420 26, 200 14, 10 20 Z"
        fill="#C8102E"
      />
    </svg>
  );
}

export const GraphicsPreview = forwardRef<HTMLDivElement, GraphicsPreviewProps>(
  ({ roster, matchConfig, lineup }, ref) => {
    const layout = formationLayouts[matchConfig.formation] ?? formationLayouts['4-3-3'];
    const playerMap = Object.fromEntries(roster.map((p) => [p.id, p]));

    const benchPlayers = lineup.bench
      .map((id) => playerMap[id])
      .filter(Boolean) as Player[];

    const opponentName = matchConfig.opponent || 'AVVERSARIO';
    const homeTeam = matchConfig.isHome ? 'SINAGRA' : opponentName.toUpperCase();
    const awayTeam = matchConfig.isHome ? opponentName.toUpperCase() : 'SINAGRA';
    const timeStr = formatTime(matchConfig.date);
    const dateStr = formatDate(matchConfig.date);

    return (
      <div
        ref={ref}
        style={{
          width: 1080,
          height: 1350,
          position: 'relative',
          overflow: 'hidden',
          background: '#F5C500',
          fontFamily: 'Arial, sans-serif',
          flexShrink: 0,
        }}
      >
        {/* ── BACKGROUND LAYERS ── */}

        {/* Castle silhouette — above brushstrokes, below content; visible on yellow bg */}
        <img
          src="/castello.png"
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: -20,
            top: '16%',
            height: '46%',
            width: 'auto',
            objectFit: 'contain',
            filter: 'grayscale(1) contrast(1.4) brightness(0.3) sepia(0.3)',
            mixBlendMode: 'multiply',
            opacity: 0.14,
            pointerEvents: 'none',
            zIndex: 4,
          }}
        />

        {/* Red brushstrokes on edges */}
        <RedBrushStrokes />

        {/* Grunge paper texture */}
        <GrungTexture />

        {/* ── CONTENT ── */}
        <div style={{ position: 'relative', zIndex: 5, height: '100%', display: 'flex', flexDirection: 'column' }}>

          {/* ═══════════════════════════════════════
              HEADER
          ═══════════════════════════════════════ */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '22px 30px 18px',
              gap: 16,
            }}
          >
            {/* Left: logo + divider + club info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flex: 1 }}>
              <SinagraLogo size={88} />

              {/* Vertical divider */}
              <div
                style={{
                  width: 2,
                  height: 72,
                  background: 'linear-gradient(180deg, transparent, #C8102E 20%, #C8102E 80%, transparent)',
                  flexShrink: 0,
                }}
              />

              {/* Club text */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span
                  style={{
                    color: '#C8102E',
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    lineHeight: 1,
                  }}
                >
                  A.D.P.
                </span>
                <span
                  style={{
                    color: '#1A1A1A',
                    fontSize: 24,
                    fontWeight: 900,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    lineHeight: 1.15,
                    fontFamily: 'Impact, Arial Black, sans-serif',
                  }}
                >
                  SINAGRA CALCIO 1974
                </span>
                <span
                  style={{
                    color: '#333333',
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: '0.12em',
                    marginTop: 3,
                  }}
                >
                  STAGIONE SPORTIVA 2026/27
                </span>
              </div>
            </div>

            {/* Right: MATCHDAY box */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 10,
                padding: '14px 20px',
                minWidth: 250,
                boxShadow: '0 3px 16px rgba(0,0,0,0.18)',
                flexShrink: 0,
                position: 'relative',
              }}
            >
              {/* MATCHDAY tag */}
              <div
                style={{
                  position: 'absolute',
                  top: -12,
                  left: 16,
                  background: '#C8102E',
                  color: '#FFFFFF',
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: '0.22em',
                  padding: '3px 12px',
                  borderRadius: 4,
                  textTransform: 'uppercase',
                }}
              >
                MATCHDAY
              </div>

              <div style={{ marginTop: 4 }}>
                <p
                  style={{
                    color: '#1A1A1A',
                    fontSize: 10,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    margin: 0,
                  }}
                >
                  {matchConfig.competition || 'CAMPIONATO DI PROMOZIONE'}
                </p>
                {matchConfig.matchday && (
                  <p style={{ color: '#C8102E', fontSize: 9, fontWeight: 700, margin: '2px 0 0', letterSpacing: '0.08em' }}>
                    {matchConfig.matchday}
                  </p>
                )}
              </div>

              {/* Teams */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <SinagraLogo size={26} />
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 900,
                      color: '#1A1A1A',
                      textTransform: 'uppercase',
                      fontFamily: 'Impact, Arial Black, sans-serif',
                    }}
                  >
                    {homeTeam}
                  </span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 900, color: '#C8102E', letterSpacing: '0.05em' }}>VS</span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 900,
                    color: '#1A1A1A',
                    textTransform: 'uppercase',
                    fontFamily: 'Impact, Arial Black, sans-serif',
                  }}
                >
                  {awayTeam}
                </span>
              </div>

              {/* Date / time / venue */}
              {matchConfig.date && (
                <div style={{ marginTop: 8, borderTop: '1px solid #eee', paddingTop: 6 }}>
                  <p style={{ color: '#444', fontSize: 9, fontWeight: 600, margin: 0 }}>
                    📅 {dateStr}{timeStr ? ` · ORE ${timeStr}` : ''}
                  </p>
                  <p style={{ color: '#666', fontSize: 9, margin: '2px 0 0' }}>
                    📍 STADIO COMUNALE DI SINAGRA
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ═══════════════════════════════════════
              RED SEPARATOR LINE
          ═══════════════════════════════════════ */}
          <div
            style={{
              height: 5,
              background: '#C8102E',
              margin: '0 0',
              flexShrink: 0,
            }}
          />

          {/* ═══════════════════════════════════════
              TITLE
          ═══════════════════════════════════════ */}
          <div style={{ padding: '8px 20px 0', flexShrink: 0 }}>
            <div
              style={{
                whiteSpace: 'nowrap',
                lineHeight: 1,
                fontFamily: 'Impact, "Arial Narrow", Haettenschweiler, sans-serif',
                letterSpacing: '-0.5px',
              }}
            >
              <span style={{ fontSize: 92, fontWeight: 900, color: '#1A1A1A', textTransform: 'uppercase', lineHeight: 0.9, display: 'inline-block' }}>
                FORMAZIONE{' '}
              </span>
              <span style={{ fontSize: 92, fontWeight: 900, color: '#C8102E', textTransform: 'uppercase', lineHeight: 0.9, display: 'inline-block' }}>
                UFFICIALE
              </span>
            </div>
            <div style={{ marginTop: 4 }}>
              <TitleBrushstroke />
            </div>
          </div>

          {/* ═══════════════════════════════════════
              FIELD
          ═══════════════════════════════════════ */}
          <div style={{ flex: 1, padding: '8px 0 4px', minHeight: 0 }}>
            <FootballField layout={layout} starters={lineup.starters} roster={roster} />
          </div>

          {/* ═══════════════════════════════════════
              BOTTOM PANEL: BENCH + COACH
          ═══════════════════════════════════════ */}
          <div
            style={{
              background: 'rgba(15,15,15,0.93)',
              flexShrink: 0,
              padding: '18px 30px 16px',
              display: 'flex',
              gap: 24,
              alignItems: 'flex-start',
            }}
          >
            {/* PANCHINA */}
            <div style={{ flex: 1 }}>
              {/* Label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 4, height: 20, background: '#F5C500', borderRadius: 2, flexShrink: 0 }} />
                <span
                  style={{
                    color: '#F5C500',
                    fontSize: 18,
                    fontWeight: 900,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    fontFamily: 'Impact, Arial Black, sans-serif',
                  }}
                >
                  PANCHINA
                </span>
              </div>

              {/* Players grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '6px 16px',
                }}
              >
                {benchPlayers.map((p) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        color: '#F5C500',
                        fontSize: 14,
                        fontWeight: 900,
                        minWidth: 22,
                        fontFamily: 'Impact, Arial Black, sans-serif',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {p.number}
                    </span>
                    <span
                      style={{
                        color: '#FFFFFF',
                        fontSize: 13,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {p.lastName.split(' ')[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Vertical divider */}
            <div
              style={{
                width: 1,
                alignSelf: 'stretch',
                background: 'rgba(245,200,0,0.25)',
                flexShrink: 0,
              }}
            />

            {/* ALLENATORE */}
            <div style={{ width: 210, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 4, height: 20, background: '#C8102E', borderRadius: 2, flexShrink: 0 }} />
                <span
                  style={{
                    color: '#F5C500',
                    fontSize: 18,
                    fontWeight: 900,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    fontFamily: 'Impact, Arial Black, sans-serif',
                  }}
                >
                  ALLENATORE
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Avatar */}
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #C8102E, #8B0000)',
                    border: '2px solid #F5C500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      color: '#F5C500',
                      fontWeight: 900,
                      fontSize: 20,
                      fontFamily: 'Impact, Arial Black, sans-serif',
                    }}
                  >
                    {lineup.coach ? lineup.coach.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() : 'AI'}
                  </span>
                </div>
                <div>
                  <span
                    style={{
                      color: '#FFFFFF',
                      fontSize: 15,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      display: 'block',
                      lineHeight: 1.2,
                    }}
                  >
                    {lineup.coach || 'ALLENATORE'}
                  </span>
                  <span style={{ color: 'rgba(245,200,0,0.7)', fontSize: 10, letterSpacing: '0.1em' }}>
                    MISTER
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════
              FOOTER
          ═══════════════════════════════════════ */}
          <div
            style={{
              background: '#000000',
              padding: '12px 30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            {/* Social icons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Instagram */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#F5C500">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
              {/* Facebook */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#F5C500">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </div>

            <span
              style={{
                color: 'rgba(255,255,255,0.55)',
                fontSize: 13,
                letterSpacing: '0.18em',
                textTransform: 'lowercase',
                fontWeight: 600,
              }}
            >
              sinagra calcio
            </span>

            <SinagraLogo size={28} />
          </div>
        </div>
      </div>
    );
  }
);

GraphicsPreview.displayName = 'GraphicsPreview';
