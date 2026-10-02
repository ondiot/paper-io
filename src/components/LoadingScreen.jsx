import { useEffect, useState } from "react";

const chevron = Array.from(
  { length: 9 },
  (_, i) => {
    const r = Math.floor(i / 3);
    const c = i % 3;

    return (
      (c + Math.abs(r - 1)) * 90
    );
  }
);

const ORBIT_ORDER = [
  0,
  1,
  2,
  5,
  8,
  7,
  6,
  3,
];

const orbit = Array.from(
  { length: 9 },
  (_, i) => {
    const k =
      ORBIT_ORDER.indexOf(i);

    return k === -1
      ? null
      : k * 110;
  }
);

const PATTERNS = {
  Drive: {
    delays: chevron,
    dur: 650,
    round: false,
  },

  Dots: {
    delays: chevron,
    dur: 650,
    round: true,
  },

  Orbit: {
    delays: orbit,
    dur: 950,
    round: false,
  },
};


function useElapsed() {
  const [ds, setDs] =
    useState(0);

  useEffect(() => {
    const timer =
      setInterval(() => {
        setDs((d) => d + 1);
      }, 100);

    return () =>
      clearInterval(timer);
  }, []);

  const total = ds / 10;

  if (total < 60) {
    return `${total.toFixed(1)}s`;
  }

  return `${Math.floor(total / 60)}m ${(
    total % 60
  ).toFixed(1)}s`;
}


export default function LoadingScreen({
  label = "Preloading",
  variant = "Drive",
  progress = 0,
}) {
  const elapsed =
    useElapsed();

  const {
    delays,
    dur,
    round,
  } =
    PATTERNS[variant] ??
    PATTERNS.Drive;

  return (
    <div className="loading-screen">
      <div className="loading-state">

        <span
          className="loading-grid"
          aria-hidden="true"
        >
          {delays.map(
            (delay, i) => (
              <span
                key={i}
                className={`loading-pixel ${
                  round
                    ? "loading-pixel-round"
                    : ""
                }`}
                style={{
                  opacity:
                    delay === null
                      ? 0.07
                      : 0.15,

                  animation:
                    delay === null
                      ? "none"
                      : `pixel-on ${dur}ms ease-in-out ${delay}ms infinite`,
                }}
              />
            )
          )}
        </span>


        <span className="loading-label">
          {label}
        </span>


        <span className="loading-percent">
          {progress}%
        </span>


        <span className="loading-elapsed">
          {elapsed}
        </span>

      </div>
    </div>
  );
}
