import { useEffect, useRef, useState } from "react";

const MUSIC_SRC = `${import.meta.env.BASE_URL}assets/music/bg.mp3`;

function MusicControl({ enabled = true }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.35);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.loop = true;
    audio.preload = "metadata";

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  useEffect(() => {
    if (!enabled && audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
    }
  }, [enabled]);

  async function toggleMusic() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      try {
        await audio.play();
        setPlaying(true);
      } catch (error) {
        console.error("Could not play background music:", error);
      }
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  function handleEnded() {
    setPlaying(false);
  }

  return (
    <>
      <audio ref={audioRef} src={MUSIC_SRC} onEnded={handleEnded} />
      {enabled && (
        <div className="global-music-control">
          <button
            type="button"
            className={`global-music-button ${playing ? "playing" : ""}`}
            onClick={toggleMusic}
            aria-label={playing ? "Pause background music" : "Play background music"}
            title={playing ? "Pause music" : "Play music"}
          >
            <span aria-hidden="true">{playing ? "🔊" : "🎵"}</span>
          </button>

          {playing && (
            <label className="global-music-volume" title="Music volume">
              <span>VOL</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
                aria-label="Music volume"
              />
            </label>
          )}
        </div>
      )}
    </>
  );
}

export default MusicControl;
