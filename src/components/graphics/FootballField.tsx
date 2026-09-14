import { PlayerToken } from './PlayerToken';
import type { Player, FormationLayout } from '../../domain/types';

interface FootballFieldProps {
  layout: FormationLayout;
  starters: Record<string, string>;
  roster: Player[];
}

// ── Trapezoid field geometry ──────────────────────────────────────────────
// SVG viewBox: 0 0 1080 660
// Top edge: TL=(90,10)   TR=(990,10)   width=900
// Bot edge: BL=(10,650)  BR=(1070,650) width=1060
// Field height: 640px (y: 10 → 650)

const TL_X = 90,  TR_X = 990;
const BL_X = 10,  BR_X = 1070;
const TOP_Y = 10, BOT_Y = 650;
const FH = BOT_Y - TOP_Y; // 640

const leftX  = (ry: number) => TL_X + (BL_X - TL_X) * ry;  // 90 → 10
const rightX = (ry: number) => TR_X + (BR_X - TR_X) * ry;  // 990 → 1070
const fw     = (ry: number) => rightX(ry) - leftX(ry);      // 900 → 1060
const svgY   = (ry: number) => TOP_Y + ry * FH;             // 10 → 650

// SVG coords of a relative field position
const fieldPt = (rx: number, ry: number) => ({
  x: leftX(ry) + rx * fw(ry),
  y: svgY(ry),
});

// Horizontal line at ry from rx1 to rx2
function hSeg(ry: number, rx1 = 0, rx2 = 1) {
  const y = svgY(ry);
  return { x1: leftX(ry) + rx1 * fw(ry), y1: y, x2: leftX(ry) + rx2 * fw(ry), y2: y };
}
// Vertical (converging) line at rx from ry1 to ry2
function vSeg(rx: number, ry1: number, ry2: number) {
  const a = fieldPt(rx, ry1), b = fieldPt(rx, ry2);
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
}
// Grass stripe polygon points
function gStripe(ry1: number, ry2: number) {
  const tl = fieldPt(0, ry1), tr = fieldPt(1, ry1);
  const br = fieldPt(1, ry2), bl = fieldPt(0, ry2);
  return `${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}`;
}

const LW = 2.5;
const LC = 'rgba(255,255,255,0.82)';

// Field proportions (standard football pitch)
const PEN_H    = 0.157; // penalty area depth  (16.5m / 105m)
const PEN_SIDE = 0.204; // space outside pen area each side  ((1-0.593)/2)
const GA_H     = 0.052; // goal area depth     (5.5m / 105m)
const GA_SIDE  = 0.366; // space outside goal area each side ((1-0.268)/2)
const PEN_Y    = 0.105; // penalty spot y      (11m / 105m from goal line)

// SVG viewBox dimensions (for absolute % positioning of HTML player tokens)
export const FIELD_SVG_W = 1080;
export const FIELD_SVG_H = 660;

// Returns the % position inside the field container for a (rx,ry) slot
export function slotPct(rx: number, ry: number): { leftPct: number; topPct: number } {
  const pt = fieldPt(rx, ry);
  return {
    leftPct: (pt.x / FIELD_SVG_W) * 100,
    topPct:  (pt.y / FIELD_SVG_H) * 100,
  };
}

export function FootballField({ layout, starters, roster }: FootballFieldProps) {
  const playerMap = Object.fromEntries(roster.map((p) => [p.id, p]));

  const poly = `${TL_X},${TOP_Y} ${TR_X},${TOP_Y} ${BR_X},${BOT_Y} ${BL_X},${BOT_Y}`;

  // Center circle
  const ccRY = 0.5;
  const ccPt = fieldPt(0.5, ccRY);
  const ccRX = fw(ccRY) * 0.092;   // horizontal radius
  const ccRYpx = FH * 0.087;        // vertical radius

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Drop shadow */}
      <div
        style={{
          position: 'absolute',
          bottom: -10,
          left: '4%',
          right: '4%',
          height: 18,
          background: 'rgba(0,0,0,0.32)',
          filter: 'blur(10px)',
          borderRadius: '50%',
          zIndex: 0,
        }}
      />

      {/* ── FIELD SVG (pure SVG, no foreignObject) ── */}
      <svg
        viewBox={`0 0 ${FIELD_SVG_W} ${FIELD_SVG_H}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', display: 'block', position: 'relative', zIndex: 1 }}
        preserveAspectRatio="none"
      >
        <defs>
          <pattern id="grass" x="0" y="0" width="100" height="64" patternUnits="userSpaceOnUse">
            <rect width="100" height="32" fill="#287832" />
            <rect y="32" width="100" height="32" fill="#236e2c" />
          </pattern>
          <clipPath id="fClip">
            <polygon points={poly} />
          </clipPath>
        </defs>

        {/* Base grass */}
        <polygon points={poly} fill="url(#grass)" />

        {/* Alternating stripe overlay */}
        {Array.from({ length: 10 }).map((_, i) => (
          <polygon
            key={i}
            points={gStripe(i / 10, (i + 1) / 10)}
            fill={i % 2 === 0 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.03)'}
            clipPath="url(#fClip)"
          />
        ))}

        {/* Field border */}
        <polygon points={poly} fill="none" stroke={LC} strokeWidth={LW} />

        {/* Halfway line */}
        {(() => { const s = hSeg(0.5); return <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={LC} strokeWidth={LW} />; })()}

        {/* Center circle + spot */}
        <ellipse cx={ccPt.x} cy={ccPt.y} rx={ccRX} ry={ccRYpx} fill="none" stroke={LC} strokeWidth={LW} />
        <circle cx={ccPt.x} cy={ccPt.y} r={4} fill={LC} />

        {/* TOP penalty area */}
        {[hSeg(0, PEN_SIDE, 1-PEN_SIDE), hSeg(PEN_H, PEN_SIDE, 1-PEN_SIDE)].map((s, i) => (
          <line key={`tph${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={LC} strokeWidth={LW} />
        ))}
        {[vSeg(PEN_SIDE, 0, PEN_H), vSeg(1-PEN_SIDE, 0, PEN_H)].map((s, i) => (
          <line key={`tpv${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={LC} strokeWidth={LW} />
        ))}

        {/* TOP goal area */}
        {[hSeg(0, GA_SIDE, 1-GA_SIDE), hSeg(GA_H, GA_SIDE, 1-GA_SIDE)].map((s, i) => (
          <line key={`tgh${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={LC} strokeWidth={LW} />
        ))}
        {[vSeg(GA_SIDE, 0, GA_H), vSeg(1-GA_SIDE, 0, GA_H)].map((s, i) => (
          <line key={`tgv${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={LC} strokeWidth={LW} />
        ))}

        {/* TOP penalty spot */}
        {(() => { const p = fieldPt(0.5, PEN_Y); return <circle cx={p.x} cy={p.y} r={4} fill={LC} />; })()}

        {/* BOTTOM penalty area */}
        {[hSeg(1-PEN_H, PEN_SIDE, 1-PEN_SIDE), hSeg(1, PEN_SIDE, 1-PEN_SIDE)].map((s, i) => (
          <line key={`bph${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={LC} strokeWidth={LW} />
        ))}
        {[vSeg(PEN_SIDE, 1-PEN_H, 1), vSeg(1-PEN_SIDE, 1-PEN_H, 1)].map((s, i) => (
          <line key={`bpv${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={LC} strokeWidth={LW} />
        ))}

        {/* BOTTOM goal area */}
        {[hSeg(1-GA_H, GA_SIDE, 1-GA_SIDE), hSeg(1, GA_SIDE, 1-GA_SIDE)].map((s, i) => (
          <line key={`bgh${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={LC} strokeWidth={LW} />
        ))}
        {[vSeg(GA_SIDE, 1-GA_H, 1), vSeg(1-GA_SIDE, 1-GA_H, 1)].map((s, i) => (
          <line key={`bgv${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={LC} strokeWidth={LW} />
        ))}

        {/* BOTTOM penalty spot */}
        {(() => { const p = fieldPt(0.5, 1-PEN_Y); return <circle cx={p.x} cy={p.y} r={4} fill={LC} />; })()}

        {/* Corner arcs */}
        {([
          { rx: 0, ry: 0, sweep: 1 },
          { rx: 1, ry: 0, sweep: 0 },
          { rx: 0, ry: 1, sweep: 0 },
          { rx: 1, ry: 1, sweep: 1 },
        ]).map(({ rx, ry, sweep }, i) => {
          const p = fieldPt(rx, ry);
          const dx = rx === 0 ? 18 : -18;
          const dy = ry === 0 ? 18 : -18;
          return (
            <path
              key={i}
              d={`M ${p.x + dx} ${p.y} A 18 18 0 0 ${sweep} ${p.x} ${p.y + dy}`}
              fill="none"
              stroke={LC}
              strokeWidth={LW}
            />
          );
        })}

        {/* ── FORMATION BADGE ── brushstroke style */}
        <path
          d="M 872 608 C 896 598, 1062 596, 1072 606 C 1078 620, 1076 652, 1068 660 C 1048 668, 892 670, 874 658 C 866 646, 866 618, 872 608 Z"
          fill="#C8102E"
        />
        <text
          x="972"
          y="636"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="40"
          fontWeight="900"
          fontFamily="Impact, Arial Black, sans-serif"
          fill="#F5C500"
          letterSpacing="1"
        >
          {layout.name}
        </text>
      </svg>

      {/* ── PLAYER TOKENS — HTML overlay (works with html-to-image) ── */}
      {layout.slots.map((slot) => {
        const playerId = starters[slot.id];
        const player = playerId ? playerMap[playerId] : null;
        const { leftPct, topPct } = slotPct(slot.x, slot.y);

        return (
          <div
            key={slot.id}
            style={{
              position: 'absolute',
              left: `${leftPct}%`,
              top: `${topPct}%`,
              transform: 'translate(-50%, -52%)',
              zIndex: 10,
              pointerEvents: 'none',
            }}
          >
            <PlayerToken player={player} role={slot.role} />
          </div>
        );
      })}
    </div>
  );
}
