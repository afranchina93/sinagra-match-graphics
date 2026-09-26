import type { Player, PlayerRole } from '../../domain/types';

interface PlayerTokenProps {
  player: Player | null;
  role?: PlayerRole;
  numberOverride?: number;
}

function JerseySvg({ role, number }: { role: PlayerRole; number: number }) {
  const isGK = role === 'goalkeeper';
  const bodyColor = isGK ? '#2A2A2A' : '#F5C500';
  const collarColor = isGK ? '#444444' : '#C8102E';
  const stripeColor = isGK ? '#111111' : '#C8102E';
  const numColor = isGK ? '#F5C500' : '#1A1A1A';

  return (
    <svg width="72" height="78" viewBox="0 0 72 78" xmlns="http://www.w3.org/2000/svg">
      {/* Shadow */}
      <ellipse cx="36" cy="76" rx="28" ry="4" fill="rgba(0,0,0,0.25)" />
      {/* Jersey body */}
      <path
        d="M14 17 L3 34 L16 39 L16 72 L56 72 L56 39 L69 34 L58 17 Q48 10 36 10 Q24 10 14 17 Z"
        fill={bodyColor}
        stroke={stripeColor}
        strokeWidth="2"
      />
      {/* Collar */}
      <path
        d="M25 14 Q36 22 47 14 Q36 6 25 14 Z"
        fill={collarColor}
      />
      {/* Sleeve accent stripes */}
      <path d="M3 34 L16 29 L16 39 L3 44 Z" fill={stripeColor} opacity="0.5" />
      <path d="M69 34 L56 29 L56 39 L69 44 Z" fill={stripeColor} opacity="0.5" />
      {/* Central stripe */}
      <rect x="30" y="10" width="12" height="62" fill={stripeColor} opacity="0.12" />
      {/* Number */}
      <text
        x="36"
        y="50"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="28"
        fontWeight="900"
        fontFamily="Impact, Arial Black, sans-serif"
        fill={numColor}
        stroke={isGK ? 'rgba(245,200,0,0.3)' : 'rgba(0,0,0,0.2)'}
        strokeWidth="0.5"
      >
        {number}
      </text>
    </svg>
  );
}

export function PlayerToken({ player, role = 'midfielder', numberOverride }: PlayerTokenProps) {
  const effectiveRole = player?.role ?? role;

  if (!player) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <div
          style={{
            width: 72,
            height: 78,
            border: '2px dashed rgba(200,16,46,0.35)',
            borderRadius: 4,
            background: 'rgba(0,0,0,0.1)',
          }}
        />
        <div
          style={{
            background: 'rgba(26,26,26,0.6)',
            borderRadius: 4,
            padding: '2px 8px',
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: 800, textTransform: 'uppercase' }}>
            VUOTO
          </span>
        </div>
      </div>
    );
  }

  // Truncate long surnames: max ~9 chars displayed
  const raw = player.posterName || player.lastName.split(' ')[0].toUpperCase();
  const display = raw.length > 9 ? raw.slice(0, 9) + '.' : raw;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <JerseySvg role={effectiveRole} number={numberOverride ?? player.number} />
      <div
        style={{
          background: '#1A1A1A',
          borderRadius: 4,
          padding: '2px 7px',
          minWidth: 58,
          textAlign: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
        }}
      >
        <span
          style={{
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontFamily: 'Arial, sans-serif',
            display: 'block',
            whiteSpace: 'nowrap',
          }}
        >
          {display}
        </span>
      </div>
    </div>
  );
}
