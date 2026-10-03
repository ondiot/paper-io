import { useEffect, useMemo, useState } from "react";
import AvatarPicker from "./AvatarPicker";
import GlyphMatrix from "./GlyphMatrix";

const MATRIX_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
const PHRASES = [
  "PAPER.IO",
  "A FUN-FILLED GAME",
  "CAN YOU GUESS THE PAPER?",
  "Built by Niraj !"
];

function NameScreen({ name, setName, selectedAvatar, setSelectedAvatar, onContinue }) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayTitle, setDisplayTitle] = useState(PHRASES[0]);

  const characters = useMemo(() => {
    const count = window.innerWidth < 600 ? 105 : 180;
    return Array.from({ length: count }, (_, index) => ({
      id: index,
      char: MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)],
      left: Math.random() * 100,
      delay: Math.random() * -9,
      duration: 6 + Math.random() * 7,
      size: 12 + Math.random() * (window.innerWidth < 600 ? 9 : 15),
    }));
  }, []);

  useEffect(() => {
    let timeout;
    let interval;
    let stopped = false;

    function run() {
      if (stopped) return;
      const target = PHRASES[phraseIndex];
      let step = 0;
      const total = 12;

      interval = setInterval(() => {
        if (stopped) return;
        step += 1;
        const visible = Math.floor(target.length * (step / total));
        let output = "";

        for (let i = 0; i < target.length; i += 1) {
          if (target[i] === " ") output += " ";
          else if (i < visible) output += target[i];
          else output += MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
        }

        setDisplayTitle(output);

        if (step >= total) {
          clearInterval(interval);
          setDisplayTitle(target);
          timeout = setTimeout(() => {
            setPhraseIndex((current) => (current + 1) % PHRASES.length);
          }, 1700);
        }
      }, 55);
    }

    run();
    return () => {
      stopped = true;
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [phraseIndex]);

  return (
    <main className="paper-name-page">
      <div className="paper-name-glyph-background" aria-hidden="true">
        <GlyphMatrix
          glyphs="01·•+*/\\<>="
          cellSize={14}
          mutationRate={0.04}
          interval={90}
          fadeBottom={0.6}
          color="#6B7280"
        />
      </div>
      <div className="paper-name-rain" aria-hidden="true">
        {characters.map((item) => (
          <span
            key={item.id}
            className="paper-matrix-char"
            style={{
              left: `${item.left}%`,
              animationDelay: `${item.delay}s`,
              animationDuration: `${item.duration}s`,
              fontSize: `${item.size}px`,
            }}
          >
            {item.char}
          </span>
        ))}
      </div>

      <div className="paper-title-layer" aria-hidden="true">
        <div className="paper-title">{displayTitle}</div>
      </div>

      <section className="paper-name-card">
        <h2>Enter your name</h2>
        <p>Choose your avatar and join the game.</p>

        <AvatarPicker
          selectedAvatar={selectedAvatar}
          setSelectedAvatar={setSelectedAvatar}
        />

        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name"
          maxLength={20}
          autoComplete="nickname"
          autoFocus
        />

        <button type="button" onClick={onContinue} disabled={!name.trim()}>
          Continue
        </button>
      </section>
    </main>
  );
}

export default NameScreen;
