import { useMemo } from "react";

function DarkGradientBackground({ children, className = "" }) {
  const noiseId = useMemo(
    () => `paperio-noise-${Math.random().toString(36).slice(2)}`,
    []
  );

  return (
    <div className={`dark-gradient-background ${className}`.trim()}>
      <svg className="dark-gradient-noise" aria-hidden="true">
        <filter id={noiseId}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="4"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${noiseId})`} />
      </svg>

      <div className="dark-gradient-orb dark-gradient-orb-one" aria-hidden="true" />
      <div className="dark-gradient-orb dark-gradient-orb-two" aria-hidden="true" />

      <div className="dark-gradient-shape dark-gradient-shape-one" aria-hidden="true" />
      <div className="dark-gradient-shape dark-gradient-shape-two" aria-hidden="true" />
      <div className="dark-gradient-shape dark-gradient-shape-three" aria-hidden="true" />

      <div className="dark-gradient-content">{children}</div>
    </div>
  );
}

export default DarkGradientBackground;
