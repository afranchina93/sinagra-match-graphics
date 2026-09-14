// Decorative castle silhouette (Castello di Sinagra) - very subtle background element
export function CastleSilhouette() {
  return (
    <svg
      viewBox="0 0 400 200"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: 'absolute',
        bottom: '120px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '70%',
        opacity: 0.05,
        pointerEvents: 'none',
      }}
    >
      {/* Castle silhouette */}
      <path
        d="
          M20 200 L20 140 L30 140 L30 120 L20 120 L20 100 L40 100 L40 120 L50 120 L50 100
          L70 100 L70 120 L80 120 L80 100 L100 100 L100 140 L110 140 L110 200 Z
          M110 200 L110 130 L130 130 L130 80 L140 80 L140 60 L130 60 L130 40 L145 40 L145 60 L155 60 L155 40 L170 40 L170 60 L180 60 L180 40 L195 40 L195 80 L200 80 L200 130 L210 130 L210 200 Z
          M200 200 L200 150 L220 150 L220 110 L230 110 L230 90 L220 90 L220 70 L235 70 L235 90 L245 90 L245 70 L260 70 L260 90 L270 90 L270 110 L280 110 L280 150 L290 150 L290 200 Z
          M290 200 L290 160 L350 160 L350 140 L360 140 L360 120 L350 120 L350 100 L370 100 L370 120 L380 120 L380 100 L400 100 L400 200 Z
        "
        fill="#FFFFFF"
      />
    </svg>
  );
}
