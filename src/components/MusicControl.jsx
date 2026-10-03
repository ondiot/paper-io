import { useEffect, useRef, useState } from "react";

const MUSIC_TRACKS = [
  `${import.meta.env.BASE_URL}assets/music/bg.mp3`,
  `${import.meta.env.BASE_URL}assets/music/bg1.mp3`,
  `${import.meta.env.BASE_URL}assets/music/bg2.mp3`,
  `${import.meta.env.BASE_URL}assets/music/bg3.mp3`,
  `${import.meta.env.BASE_URL}assets/music/bg4.mp3`,
];

function MusicControl({ enabled = true, startAfterGesture = false, revealDelay = 5000 }) {
  const audioRef = useRef(null);
  const [trackIndex, setTrackIndex] = useState(0);
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

    audio.preload = "auto";
    audio.loop = false;
    audio.src = MUSIC_TRACKS[trackIndex];
    audio.load();

    return () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    };
  }, [trackIndex]);

  useEffect(() => {
    if (!enabled && audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (startAfterGesture) return;

    // Fallback for browsers that allow autoplay.
    startTrack(0);
  }, [enabled, startAfterGesture]);

  useEffect(() => {
    if (!startAfterGesture || !enabled) return;

    let cancelled = false;

    async function unlockAndScheduleMusic() {
      const audio = audioRef.current;
      if (!audio) return;

      audio.src = MUSIC_TRACKS[0];
      audio.load();
      audio.volume = 0;

      try {
        // This call is made directly from the user's intro click.
        await audio.play();
        if (cancelled) return;

        setPlaying(true);

        window.setTimeout(() => {
          if (cancelled || !audioRef.current) return;
          audioRef.current.volume = volume;
        }, revealDelay);
      } catch (error) {
        console.error("Could not unlock background music:", error);
        setPlaying(false);
      }
    }

    unlockAndScheduleMusic();

    return () => {
      cancelled = true;
    };
  }, [startAfterGesture, enabled, revealDelay]);

  async function startTrack(index) {
    const audio = audioRef.current;
    if (!audio) return;

    audio.src = MUSIC_TRACKS[index];
    audio.load();
    audio.volume = volume;

    try {
      await audio.play();
      setPlaying(true);
    } catch (error) {
      console.error("Could not play background music:", error);
      setPlaying(false);
    }
  }

  async function toggleMusic() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      await startTrack(trackIndex);
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  async function handleEnded() {
    const nextIndex = (trackIndex + 1) % MUSIC_TRACKS.length;
    setTrackIndex(nextIndex);

    const audio = audioRef.current;
    if (!audio) return;

    audio.src = MUSIC_TRACKS[nextIndex];
    audio.load();

    try {
      await audio.play();
      setPlaying(true);
    } catch (error) {
      console.error("Could not start next background track:", error);
      setPlaying(false);
    }
  }

  return (
    <>
      <audio
        ref={audioRef}
        onEnded={handleEnded}
        aria-hidden="true"
      />

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
