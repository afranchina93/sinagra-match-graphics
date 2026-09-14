import { POSTER_ASSETS } from '../../poster-config';

interface SinagraLogoProps {
  size?: number;
}

export function SinagraLogo({ size = 80 }: SinagraLogoProps) {
  return (
    <img
      src={POSTER_ASSETS.logo}
      width={size}
      height={size}
      alt="Sinagra Calcio"
      style={{ objectFit: 'contain', display: 'block' }}
    />
  );
}
