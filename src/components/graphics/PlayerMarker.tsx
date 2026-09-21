/**
 * PlayerMarker
 * ─────────────────────────────────────────────────────────────────────────────
 * Renderizza un giocatore sul campo: maglia asset + numero dinamico + cognome.
 *
 * Le maglie (player-shirt.png / goalkeeper-shirt.png) sono 144×156 px.
 * Vengono visualizzate a 80×87 px (≈56% — buona leggibilità sul campo).
 *
 * Il NUMERO viene sovrapposto via HTML centrato sulla maglia.
 * Il COGNOME viene mostrato integrale (nessun split, nessun troncamento).
 *   es. "Di Pane" → etichetta "DI PANE"
 *
 * Posizionamento: centrato orizzontalmente su (x, y); la maglia è traslata
 * leggermente verso l'alto rispetto al punto campo, con il nome label in basso.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type { Player, PlayerRole } from '../../domain/types';
import { POSTER_ASSETS } from '../../poster-config';

export interface PlayerMarkerProps {
  player: Player | null;
  /** Coordinata x assoluta nel canvas 1080 × 1350 (centro del marker) */
  x: number;
  /** Coordinata y assoluta nel canvas 1080 × 1350 (centro del marker) */
  y: number;
  role: PlayerRole;
  /** Se true, mostra anche l'iniziale del nome (es. "R. FRANCHINA") */
  showInitial?: boolean;
}

// Dimensioni di visualizzazione maglia (px nel canvas 1080×1350)
const SHIRT_W = 97;
const SHIRT_H = 106; // mantiene ratio 144/156 ≈ 0.923

// Colore numero in base al ruolo
const numberColor: Record<PlayerRole, string> = {
  goalkeeper: '#F5C500',
  defender:   '#FFFFFF',
  midfielder: '#FFFFFF',
  forward:    '#FFFFFF',
};

export function PlayerMarker({ player, x, y, role, showInitial = false }: PlayerMarkerProps) {
  const shirtSrc = role === 'goalkeeper'
    ? POSTER_ASSETS.goalkeeperShirt
    : POSTER_ASSETS.playerShirt;

  const numColor = numberColor[role];

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        // Centra orizzontalmente; sposta in su di ~55% così il punto campo
        // cade approssimativamente al centro-basso della maglia
        transform: 'translate(-50%, -55%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      {/* ── Maglia ── */}
      {player ? (
        <div style={{ position: 'relative', width: SHIRT_W, height: SHIRT_H, flexShrink: 0 }}>
          {/* Asset PNG */}
          <img
            src={shirtSrc}
            alt=""
            width={SHIRT_W}
            height={SHIRT_H}
            style={{ display: 'block', objectFit: 'contain' }}
            crossOrigin="anonymous"
          />
          {/* Numero dinamico sovrapposto */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: 12, // scende leggermente sotto il colletto
            }}
          >
            <span
              style={{
                fontSize: 29,
                fontWeight: 900,
                fontFamily: 'Impact, Arial Black, sans-serif',
                color: numColor,
                lineHeight: 1,
                textShadow:
                  '1px 1px 2px rgba(0,0,0,0.85), -1px -1px 2px rgba(0,0,0,0.85)',
              }}
            >
              {player.number}
            </span>
          </div>
        </div>
      ) : (
        /* Slot vuoto */
        <div
          style={{
            width: SHIRT_W,
            height: SHIRT_H,
            border: '2px dashed rgba(255,255,255,0.3)',
            borderRadius: 4,
          }}
        />
      )}

      {/* ── Etichetta cognome (intera, nessun troncamento) ── */}
      <div
        style={{
          background: 'rgba(20,20,20,0.88)',
          borderRadius: 3,
          padding: '2px 6px',
          textAlign: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
        }}
      >
        <span
          style={{
            color: '#FFFFFF',
            fontSize: 17,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontFamily: 'Arial, sans-serif',
            whiteSpace: 'nowrap',
            display: 'block',
          }}
        >
          {player
            ? (showInitial && player.firstName
                ? `${player.firstName[0].toUpperCase()}. ${player.lastName.split(' ')[0]}`
                : player.lastName.split(' ')[0])
            : '—'}
        </span>
      </div>
    </div>
  );
}
