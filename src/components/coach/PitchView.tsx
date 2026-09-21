import type { Player } from '../../domain/types';
import { formationLayouts } from '../../domain/formations';

interface PitchViewProps {
  formation: string;
  starters: Record<string, string>; // slotId → playerId
  players: Player[];
  numberOverrides?: Record<string, number>;
}

export function PitchView({ formation, starters, players, numberOverrides }: PitchViewProps) {
  const layout = formationLayouts[formation];
  if (!layout) return null;

  const playerMap = new Map(players.map(p => [p.id, p]));

  return (
    <div className="relative w-full" style={{ aspectRatio: '2/3' }}>
      {/* SVG field background */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 200 300"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Green pitch */}
        <rect width="200" height="300" fill="#2d5a1b" />
        {/* Outer border */}
        <rect x="8" y="8" width="184" height="284" fill="none" stroke="#4a8a2a" strokeWidth="2" />
        {/* Center line */}
        <line x1="8" y1="150" x2="192" y2="150" stroke="#4a8a2a" strokeWidth="1.5" />
        {/* Center circle */}
        <circle cx="100" cy="150" r="28" fill="none" stroke="#4a8a2a" strokeWidth="1.5" />
        {/* Center spot */}
        <circle cx="100" cy="150" r="2" fill="#4a8a2a" />
        {/* Top penalty area */}
        <rect x="40" y="8" width="120" height="52" fill="none" stroke="#4a8a2a" strokeWidth="1.5" />
        {/* Top goal area */}
        <rect x="68" y="8" width="64" height="22" fill="none" stroke="#4a8a2a" strokeWidth="1.5" />
        {/* Top penalty spot */}
        <circle cx="100" cy="44" r="2" fill="#4a8a2a" />
        {/* Bottom penalty area */}
        <rect x="40" y="240" width="120" height="52" fill="none" stroke="#4a8a2a" strokeWidth="1.5" />
        {/* Bottom goal area */}
        <rect x="68" y="270" width="64" height="22" fill="none" stroke="#4a8a2a" strokeWidth="1.5" />
        {/* Bottom penalty spot */}
        <circle cx="100" cy="256" r="2" fill="#4a8a2a" />
      </svg>

      {/* Player markers */}
      {layout.slots.map(slot => {
        const playerId = starters[slot.id];
        const player = playerId ? playerMap.get(playerId) : undefined;
        const isGK = slot.role === 'goalkeeper';

        // x=0 left, x=1 right; y=0 attack (top in view), y=1 defense (bottom in view)
        const leftPct = slot.x * 100;
        const topPct = slot.y * 100;

        return (
          <div
            key={slot.id}
            className="absolute flex flex-col items-center"
            style={{
              left: `${leftPct}%`,
              top: `${topPct}%`,
              transform: 'translate(-50%, -50%)',
              width: 44,
            }}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black border-2 border-white/40 shadow ${
                isGK
                  ? 'bg-[#C8102E] text-white'
                  : 'bg-[#F5C800] text-black'
              }`}
            >
              {(playerId && numberOverrides?.[playerId]) ?? player?.number ?? '?'}
            </div>
            <span className="text-[8px] text-white font-semibold mt-0.5 text-center leading-tight drop-shadow max-w-full truncate px-0.5">
              {player ? player.lastName.slice(0, 8).toUpperCase() : slot.label ?? slot.id}
            </span>
          </div>
        );
      })}
    </div>
  );
}
