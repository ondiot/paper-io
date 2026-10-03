import { useEffect, useRef } from "react";

const DEFAULT_GLYPHS = "01·•+*/\\<>=";

function resolveColor(color) {
  if (!color) return "rgba(107, 114, 128, 0.75)";
  if (color.startsWith("#")) {
    let hex = color.slice(1);
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    if (hex.length === 6) {
      const n = Number.parseInt(hex, 16);
      return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, 0.72)`;
    }
  }
  return color;
}

export default function GlyphMatrix({
  glyphs = DEFAULT_GLYPHS,
  cellSize = 14,
  mutationRate = 0.04,
  interval = 90,
  fadeBottom = 0.6,
  color = "#6B7280",
  className = "",
  style,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    let frameId;
    let timerId;
    let cells = [];
    let width = 0;
    let height = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = canvas.clientWidth || window.innerWidth;
      height = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildCells();
    };

    const buildCells = () => {
      const cols = Math.ceil(width / cellSize);
      const rows = Math.ceil(height / cellSize);
      cells = Array.from({ length: cols * rows }, () => ({
        glyph: glyphs[Math.floor(Math.random() * glyphs.length)],
        alpha: Math.random(),
      }));
    };

    const mutate = () => {
      for (let i = 0; i < cells.length; i += 1) {
        if (Math.random() < mutationRate) {
          cells[i].glyph = glyphs[Math.floor(Math.random() * glyphs.length)];
          cells[i].alpha = 0.35 + Math.random() * 0.65;
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.font = `${Math.max(8, cellSize - 2)}px monospace`;
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      const cols = Math.ceil(width / cellSize);
      const rows = Math.ceil(height / cellSize);

      for (let row = 0; row < rows; row += 1) {
        const bottomFade = Math.max(0, Math.min(1, (row / Math.max(1, rows - 1)) * fadeBottom));
        for (let col = 0; col < cols; col += 1) {
          const cell = cells[row * cols + col];
          if (!cell) continue;
          ctx.globalAlpha = cell.alpha * (1 - bottomFade * 0.75);
          ctx.fillStyle = resolveColor(color);
          ctx.fillText(cell.glyph, col * cellSize, row * cellSize);
        }
      }
      ctx.globalAlpha = 1;
      frameId = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    timerId = window.setInterval(mutate, interval);
    frameId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      window.clearInterval(timerId);
      window.cancelAnimationFrame(frameId);
    };
  }, [glyphs, cellSize, mutationRate, interval, fadeBottom, color]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%", display: "block", ...style }}
      aria-hidden="true"
    />
  );
}
