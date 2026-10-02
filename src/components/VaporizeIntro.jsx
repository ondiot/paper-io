import { useEffect, useRef } from "react";

function VaporizeIntro({ onComplete }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrame;
    let particles = [];

    const FADE_IN = 300;
    const HOLD = 1000;
    const VAPORIZE = 2400;

    const startTime = performance.now();

    function getFontSize() {
      return Math.min(
        100,
        Math.max(55, window.innerWidth * 0.085)
      );
    }

    function setupCanvas() {
      const dpr = window.devicePixelRatio || 1;

      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;

      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      createParticles();
    }

    function createParticles() {
      particles = [];

      const width = window.innerWidth;
      const height = window.innerHeight;
      const fontSize = getFontSize();

      const buffer = document.createElement("canvas");

      buffer.width = width;
      buffer.height = height;

      const bufferCtx = buffer.getContext("2d");

      if (!bufferCtx) return;

      bufferCtx.font =
        `800 ${fontSize}px Inter, Arial, sans-serif`;

      bufferCtx.textAlign = "center";
      bufferCtx.textBaseline = "middle";
      bufferCtx.fillStyle = "#fff";

      bufferCtx.fillText(
        "PAPER.IO",
        width / 2,
        height / 2
      );

      const textWidth =
        bufferCtx.measureText("PAPER.IO").width;

      const image = bufferCtx.getImageData(
        0,
        0,
        width,
        height
      );

      const step = width < 600 ? 3 : 3;

      const left =
        width / 2 - textWidth / 2;

      const right =
        width / 2 + textWidth / 2;

      const top =
        height / 2 - fontSize * 0.65;

      const bottom =
        height / 2 + fontSize * 0.65;

      for (let y = top; y < bottom; y += step) {
        for (let x = left; x < right; x += step) {
          const px = Math.floor(x);
          const py = Math.floor(y);

          if (
            px < 0 ||
            py < 0 ||
            px >= width ||
            py >= height
          ) {
            continue;
          }

          const index =
            (py * width + px) * 4;

          if (image.data[index + 3] > 120) {
            particles.push({
              x,
              y,

              originalX: x,
              originalY: y,

              vx: 0,
              vy: 0,

              size:
                Math.random() * 1.6 + 0.5,

              life: 0,

              activated: false,

              angle:
                Math.random() *
                Math.PI *
                2,

              speed:
                Math.random() * 1.5 + 0.6,

              rotation:
                Math.random() *
                Math.PI *
                2
            });
          }
        }
      }
    }

    function drawSolidText(alpha = 1) {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const fontSize = getFontSize();

      ctx.save();

      ctx.globalAlpha = alpha;

      ctx.font =
        `800 ${fontSize}px Inter, Arial, sans-serif`;

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillStyle = "#fff";

      ctx.fillText(
        "PAPER.IO",
        width / 2,
        height / 2
      );

      ctx.restore();
    }

    function activateParticle(particle) {
      particle.activated = true;

      particle.x = particle.originalX;
      particle.y = particle.originalY;

      particle.angle =
        Math.random() *
        Math.PI *
        2;

      particle.speed =
        Math.random() * 2.2 + 0.5;

      particle.vx =
        Math.cos(particle.angle) *
        particle.speed;

      particle.vy =
        Math.sin(particle.angle) *
        particle.speed;

      particle.life = 1;
    }

    function animate(now) {
      const elapsed =
        now - startTime;

      ctx.clearRect(
        0,
        0,
        window.innerWidth,
        window.innerHeight
      );

      // =========================
      // APPEAR
      // =========================

      if (elapsed < FADE_IN) {
        drawSolidText(
          elapsed / FADE_IN
        );
      }

      // =========================
      // HOLD
      // =========================

      else if (
        elapsed <
        FADE_IN + HOLD
      ) {
        drawSolidText(1);
      }

      // =========================
      // VAPORIZE
      // =========================

      else if (
        elapsed <
        FADE_IN +
          HOLD +
          VAPORIZE
      ) {
        const vaporTime =
          elapsed -
          FADE_IN -
          HOLD;

        const progress =
          Math.min(
            1,
            vaporTime / VAPORIZE
          );

        const width = window.innerWidth;
        const height = window.innerHeight;
        const fontSize = getFontSize();

        ctx.font =
          `800 ${fontSize}px Inter, Arial, sans-serif`;

        const textWidth =
          ctx.measureText("PAPER.IO").width;

        const left =
          width / 2 -
          textWidth / 2;

        const right =
          width / 2 +
          textWidth / 2;

        /*
         * Vapor front.
         *
         * It starts just before
         * the first letter and moves
         * continuously to the right.
         */
        const front =
          left -
          5 +
          (textWidth + 10) *
            progress;

        // =========================
        // SOLID REMAINING TEXT
        // =========================

        /*
         * IMPORTANT:
         *
         * Only draw the portion
         * AFTER the vapor front.
         *
         * Everything behind the front
         * is now gone.
         */
        ctx.save();

        ctx.beginPath();

        ctx.rect(
          front,
          0,
          width - front,
          height
        );

        ctx.clip();

        drawSolidText(1);

        ctx.restore();

        // =========================
        // PARTICLES
        // =========================

        particles.forEach((particle) => {
          /*
           * The particle does NOT exist
           * visually until the vapor front
           * actually reaches it.
           */
          if (
            !particle.activated &&
            particle.originalX <= front
          ) {
            activateParticle(particle);
          }

          if (!particle.activated) {
            return;
          }

          // Particle movement
          particle.vx *= 0.985;
          particle.vy *= 0.985;

          particle.vy += 0.018;

          particle.x += particle.vx;
          particle.y += particle.vy;

          particle.life -= 0.008;

          if (particle.life <= 0) {
            return;
          }

          /*
           * Slight random opacity
           * makes the vapor feel natural.
           */
          const alpha =
            particle.life *
            (0.7 +
              Math.random() * 0.3);

          ctx.save();

          ctx.globalAlpha = alpha;

          ctx.fillStyle = "#fff";

          ctx.fillRect(
            particle.x,
            particle.y,
            particle.size,
            particle.size
          );

          ctx.restore();
        });
      }

      // =========================
      // DONE
      // =========================

      else {
        cancelAnimationFrame(
          animationFrame
        );

        onComplete();

        return;
      }

      animationFrame =
        requestAnimationFrame(animate);
    }

    setupCanvas();

    window.addEventListener(
      "resize",
      setupCanvas
    );

    animationFrame =
      requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(
        animationFrame
      );

      window.removeEventListener(
        "resize",
        setupCanvas
      );
    };
  }, [onComplete]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        background: "#000",
        overflow: "hidden",
        zIndex: 9999
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block"
        }}
      />
    </div>
  );
}

export default VaporizeIntro;
