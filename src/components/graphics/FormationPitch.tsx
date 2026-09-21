/**
 * FormationPitch
 * ─────────────────────────────────────────────────────────────────────────────
 * Renderizza il campo (asset statico pitch.png) e sovrappone i PlayerMarker.
 *
 * Il posizionamento dei giocatori usa formationEngine.computeSlotPositions()
 * che distribuisce automaticamente le righe tattiche rispettando la prospettiva
 * trapezoidale del campo. Non usa più coordinate hardcoded per formazione.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { useState } from 'react';
import type { Player, FormationLayout } from '../../domain/types';
import {
  PITCH_REGION, PITCH_IMG_W, PITCH_IMG_H, PITCH_IMG_OFFSET_X, PITCH_IMG_OFFSET_Y,
  POSTER_ASSETS,
} from '../../poster-config';
import { computeSlotPositions } from '../../domain/formationEngine';
import { PlayerMarker } from './PlayerMarker';

interface FormationPitchProps {
  layout: FormationLayout;
  starters: Record<string, string>; // slotId → playerId
  roster: Player[];
  duplicateLastNames: Set<string>;
  numberOverrides?: Record<string, number>;
}

// ── Fallback SVG campo ──────────────────────────────────────────────────────

const TL_X = 90,  TR_X = 990;
const BL_X = 10,  BR_X = 1070;
const TOP_Y = 10, BOT_Y = 650;
const FH = BOT_Y - TOP_Y;

const lx  = (ry: number) => TL_X + (BL_X - TL_X) * ry;
const rx  = (ry: number) => TR_X + (BR_X - TR_X) * ry;
const fw  = (ry: number) => rx(ry) - lx(ry);
const sy  = (ry: number) => TOP_Y + ry * FH;
const pt  = (prx: number, pry: number) => ({ x: lx(pry) + prx * fw(pry), y: sy(pry) });

function hSeg(pry: number, rx1 = 0, rx2 = 1) {
  const y = sy(pry);
  return { x1: lx(pry) + rx1 * fw(pry), y1: y, x2: lx(pry) + rx2 * fw(pry), y2: y };
}
function vSeg(prx: number, ry1: number, ry2: number) {
  const a = pt(prx, ry1), b = pt(prx, ry2);
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
}
function gStripe(ry1: number, ry2: number) {
  const tl = pt(0, ry1), tr = pt(1, ry1), br = pt(1, ry2), bl = pt(0, ry2);
  return `${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}`;
}

const LW = 2.5, LC = 'rgba(255,255,255,0.82)';
const PEN_H = 0.157, PEN_S = 0.204;
const GA_H  = 0.052, GA_S  = 0.366;

function PitchFallbackSVG({ formationName }: { formationName: string }) {
  const poly = `${TL_X},${TOP_Y} ${TR_X},${TOP_Y} ${BR_X},${BOT_Y} ${BL_X},${BOT_Y}`;
  const cc = pt(0.5, 0.5);
  const ccRX = fw(0.5) * 0.092;
  const ccRY = FH * 0.087;

  return (
    <svg
      viewBox={`0 0 1080 660`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      preserveAspectRatio="none"
    >
      <defs>
        <pattern id="fpGrass" x="0" y="0" width="100" height="64" patternUnits="userSpaceOnUse">
          <rect width="100" height="32" fill="#287832" />
          <rect y="32" width="100" height="32" fill="#236e2c" />
        </pattern>
        <clipPath id="fpClip">
          <polygon points={poly} />
        </clipPath>
      </defs>
      <polygon points={poly} fill="url(#fpGrass)" />
      {Array.from({ length: 10 }).map((_, i) => (
        <polygon key={i} points={gStripe(i / 10, (i + 1) / 10)}
          fill={i % 2 === 0 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.03)'}
          clipPath="url(#fpClip)" />
      ))}
      <polygon points={poly} fill="none" stroke={LC} strokeWidth={LW} />
      {(() => { const s = hSeg(0.5); return <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={LC} strokeWidth={LW} />; })()}
      <ellipse cx={cc.x} cy={cc.y} rx={ccRX} ry={ccRY} fill="none" stroke={LC} strokeWidth={LW} />
      <circle cx={cc.x} cy={cc.y} r={4} fill={LC} />
      {[hSeg(0, PEN_S, 1-PEN_S), hSeg(PEN_H, PEN_S, 1-PEN_S)].map((s, i) => (
        <line key={`tph${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={LC} strokeWidth={LW} />
      ))}
      {[vSeg(PEN_S, 0, PEN_H), vSeg(1-PEN_S, 0, PEN_H)].map((s, i) => (
        <line key={`tpv${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={LC} strokeWidth={LW} />
      ))}
      {[hSeg(0, GA_S, 1-GA_S), hSeg(GA_H, GA_S, 1-GA_S)].map((s, i) => (
        <line key={`tgh${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={LC} strokeWidth={LW} />
      ))}
      {[vSeg(GA_S, 0, GA_H), vSeg(1-GA_S, 0, GA_H)].map((s, i) => (
        <line key={`tgv${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={LC} strokeWidth={LW} />
      ))}
      {(() => { const p = pt(0.5, 0.105); return <circle cx={p.x} cy={p.y} r={4} fill={LC} />; })()}
      {[hSeg(1-PEN_H, PEN_S, 1-PEN_S), hSeg(1, PEN_S, 1-PEN_S)].map((s, i) => (
        <line key={`bph${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={LC} strokeWidth={LW} />
      ))}
      {[vSeg(PEN_S, 1-PEN_H, 1), vSeg(1-PEN_S, 1-PEN_H, 1)].map((s, i) => (
        <line key={`bpv${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={LC} strokeWidth={LW} />
      ))}
      {[hSeg(1-GA_H, GA_S, 1-GA_S), hSeg(1, GA_S, 1-GA_S)].map((s, i) => (
        <line key={`bgh${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={LC} strokeWidth={LW} />
      ))}
      {[vSeg(GA_S, 1-GA_H, 1), vSeg(1-GA_S, 1-GA_H, 1)].map((s, i) => (
        <line key={`bgv${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={LC} strokeWidth={LW} />
      ))}
      {(() => { const p = pt(0.5, 0.895); return <circle cx={p.x} cy={p.y} r={4} fill={LC} />; })()}
      {/* Formation badge */}
      <path d="M 872 608 C 896 598, 1062 596, 1072 606 C 1078 620, 1076 652, 1068 660 C 1048 668, 892 670, 874 658 C 866 646, 866 618, 872 608 Z" fill="#C8102E" />
      <text x="972" y="636" textAnchor="middle" dominantBaseline="middle"
        fontSize="40" fontWeight="900" fontFamily="Impact, Arial Black, sans-serif"
        fill="#F5C500" letterSpacing="1">
        {formationName}
      </text>
    </svg>
  );
}

// ── FormationPitch ──────────────────────────────────────────────────────────

export function FormationPitch({ layout, starters, roster, duplicateLastNames, numberOverrides }: FormationPitchProps) {
  const [pitchAssetFailed, setPitchAssetFailed] = useState(false);
  const playerMap = Object.fromEntries(roster.map((p) => [p.id, p]));

  // Calcola le posizioni tramite formationEngine (linee tattiche auto-distribuite)
  const slotPositions = computeSlotPositions(layout.name, layout);

  return (
    <>
      {/* ── PITCH ASSET (o fallback SVG) — posizione assoluta nel canvas */}
      <div
        style={{
          position: 'absolute',
          left:   PITCH_REGION.x,
          top:    PITCH_REGION.y,
          width:  PITCH_REGION.width,
          height: PITCH_REGION.height,
          overflow: 'hidden',
        }}
      >
        {!pitchAssetFailed ? (
          <img
            src={POSTER_ASSETS.pitch}
            alt=""
            crossOrigin="anonymous"
            style={{
              position: 'absolute',
              left: PITCH_IMG_OFFSET_X,
              top:  PITCH_IMG_OFFSET_Y,
              width:  PITCH_IMG_W,
              height: PITCH_IMG_H,
              display: 'block',
            }}
            onError={() => setPitchAssetFailed(true)}
          />
        ) : (
          <PitchFallbackSVG formationName={layout.name} />
        )}
      </div>

      {/* ── PLAYER MARKERS — posizione assoluta nel canvas 1080 × 1350 ── */}
      {layout.slots.map((slot) => {
        const playerId = starters[slot.id];
        const player = playerId ? playerMap[playerId] : null;
        const abs = slotPositions[slot.id] ?? { x: 540, y: 700 };

        return (
          <PlayerMarker
            key={slot.id}
            player={player}
            x={abs.x}
            y={abs.y}
            role={slot.role}
            showInitial={player ? duplicateLastNames.has(player.lastName) : false}
            numberOverride={playerId ? numberOverrides?.[playerId] : undefined}
          />
        );
      })}
    </>
  );
}
