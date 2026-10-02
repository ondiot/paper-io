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
    let startTime = performance.now();

    const duration = 2600;

    function resize() {
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

      const fontSize = Math.min(
        110,
        Math.max(55, window.innerWidth * 0.09)
      );

      ctx.font = `800 ${fontSize}px Inter, Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const text = "PAPER.IO";

      const width = ctx.measureText(text).width;

      const offscreen = document.createElement("canvas");
      offscreen.width = window.innerWidth;
      offscreen.height = window.innerHeight;

      const offCtx = offscreen.getContext("2d");

      offCtx.font = `800 ${fontSize}px Inter, Arial, sans-serif`;
      offCtx.textAlign = "center";
      offCtx.textBaseline = "middle";
      offCtx.fillStyle = "#fff";

      offCtx.fillText(
        text,
        window.innerWidth / 2,
        window.innerHeight / 2
      );

      const image = offCtx.getImageData(
        0,
        0,
        offscreen.width,
        offscreen.height
      );

      const step = window.innerWidth < 600 ? 3 : 4;

      for (
        let y = window.innerHeight / 2 - fontSize;
        y < window.innerHeight / 2 + fontSize;
        y += step
      ) {
        for (
          let x = window.innerWidth / 2 - width / 2;
          x < window.innerWidth / 2 + width / 2;
          x += step
        ) {
          const px = Math.floor(x);
          const py = Math.floor(y);

          if (
            px < 0 ||
            py < 0 ||
            px >= offscreen.width ||
            py >= offscreen.height
          ) {
            continue;
          }

          const index =
            (py * offscreen.width + px) * 4;

          const alpha = image.data[index + 3];

          if (alpha > 100) {
            particles.push({
              x,
              y,

              originX: x,
              originY: y,

              vx: 0,
              vy: 0,

              size: Math.random() * 1.6 + 0.5,

              delay: Math.random() * 500
            });
          }
        }
      }
    }

    function animate(now) {
      const elapsed = now - startTime;

      ctx.clearRect(
        0,
        0,
        window.innerWidth,
        window.innerHeight
      );

      const progress = Math.min(
        elapsed / duration,
        1
      );

      particles.forEach((particle) => {
        const particleProgress = Math.max(
          0,
          Math.min(
            1,
            (elapsed - particle.delay) / 1600
          )
        );

        if (particleProgress <= 0) {
          ctx.fillStyle = "#fff";

          ctx.fillRect(
            particle.originX,
            particle.originY,
            particle.size,
            particle.size
          );

          return;
        }

        if (particleProgress < 0.35) {
          particle.x = particle.originX;
          particle.y = particle.originY;
        } else {
          if (!particle.vx && !particle.vy) {
            const angle =
              Math.random() * Math.PI * 2;

            const speed =
              Math.random() * 1.8 + 0.4;

            particle.vx =
              Math.cos(angle) * speed;

            particle.vy =
              Math.sin(angle) * speed;
          }

          particle.x +=
            particle.vx * 2.2;

          particle.y +=
            particle.vy * 1.3;

          particle.vy += 0.008;
        }

        const fade =
          1 - particleProgress;

        ctx.fillStyle = `rgba(255,255,255,${fade})`;

        ctx.fillRect(
          particle.x,
          particle.y,
          particle.size,
          particle.size
        );
      });

      if (progress < 1) {
        animationFrame =
          requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    }

    resize();

    window.addEventListener(
      "resize",
      resize
    );

    animationFrame =
      requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);

      window.removeEventListener(
        "resize",
        resize
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
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        zIndex: 9999
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100%",
          height: "100%"
        }}
      />
    </div>
  );
}

export default VaporizeIntro;