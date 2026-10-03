import { useEffect, useRef, useState } from "react";

const MUSIC_TRACKS = [
  `${import.meta.env.BASE_URL}assets/music/bg.mp3`,
  `${import.meta.env.BASE_URL}assets/music/bg1.mp3`,
  `${import.meta.env.BASE_URL}assets/music/bg2.mp3`,
  `${import.meta.env.BASE_URL}assets/music/bg3.mp3`,
  `${import.meta.env.BASE_URL}assets/music/bg4.mp3`,
];

function MusicControl({ enabled = true, showControls = true }) {
  const audioRef = useRef(null);
  const [trackIndex, setTrackIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.35);
  const volumeRef = useRef(0.35);

  useEffect(() => {
    volumeRef.current = volume;
    if (audioRef.current && audioRef.current.volume > 0) {
      audioRef.current.volume = volume;
    }
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
    function unlockMusic() {
      const audio = audioRef.current;
      if (!audio || !enabled || !audio.paused) return;

      audio.src = MUSIC_TRACKS[0];
      audio.volume = 0;
      audio.load();

      // This handler runs synchronously from the intro button's click.
      audio.play()
        .then(() => setPlaying(true))
        .catch((error) => {
          console.error("Could not unlock background music:", error);
          setPlaying(false);
        });
    }

    function revealMusic() {
      const audio = audioRef.current;
      if (!audio || !enabled) return;
      audio.volume = volumeRef.current;
      setPlaying(!audio.paused);
    }

    window.addEventListener("paperio-start-music", unlockMusic);
    window.addEventListener("paperio-reveal-music", revealMusic);

    return () => {
      window.removeEventListener("paperio-start-music", unlockMusic);
      window.removeEventListener("paperio-reveal-music", revealMusic);
    };
  }, [enabled]);

  async function startTrack(index, targetVolume = volumeRef.current) {
    const audio = audioRef.current;
    if (!audio) return;

    audio.src = MUSIC_TRACKS[index];
    audio.load();
    audio.volume = targetVolume;

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
    await startTrack(nextIndex);
  }

  return (
    <>
      <audio ref={audioRef} onEnded={handleEnded} aria-hidden="true" />

      {enabled && showControls && (
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
