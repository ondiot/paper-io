import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import NameScreen from "./components/NameScreen";
import VaporizeIntro from "./components/VaporizeIntro";
import LoadingScreen from "./components/LoadingScreen";
import ModeScreen from "./components/ModeScreen";
import JoinRoom from "./components/JoinRoom";
import Lobby from "./components/Lobby";
import WritingScreen from "./components/WritingScreen";
import GuessingScreen from "./components/GuessingScreen";
import RevealScreen from "./components/RevealScreen";
import ResultsScreen from "./components/ResultsScreen";
import StatsMenu from "./components/StatsMenu";
import MusicControl from "./components/MusicControl";
import ChatBox from "./components/ChatBox";

import { AVATARS } from "./game/avatars";
import {
  createRoom,
  joinRoom,
  getPlayerSession,
  leaveRoom,
  updateHeartbeat,
} from "./game/rooms";
import { supabase } from "./lib/supabase";
import { preloadAllAssets } from "./game/preloadAssets";

function App() {
  const [name, setName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [screen, setScreen] = useState("intro");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [startupReady, setStartupReady] = useState(false);
  const startupLoadingRef = useRef(false);
  const [room, setRoom] = useState(null);
  const [player, setPlayer] = useState(null);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [restoringSession, setRestoringSession] = useState(true);
  const [error, setError] = useState("");
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const leavingRef = useRef(false);

  useEffect(() => {
    async function restoreSession() {
      const savedPlayerId = localStorage.getItem("paperio_player_id");
      const savedRoomId = localStorage.getItem("paperio_room_id");
      const savedName = localStorage.getItem("paperio_name");
      const savedAvatar = localStorage.getItem("paperio_avatar");

      if (!savedPlayerId || !savedRoomId) {
        setRestoringSession(false);
        return;
      }

      try {
        const session = await getPlayerSession(savedPlayerId, savedRoomId);
        if (!session) {
          localStorage.removeItem("paperio_player_id");
          localStorage.removeItem("paperio_room_id");
          setRestoringSession(false);
          return;
        }

        setRoom(session.room);
        setPlayer(session.player);
        setName(savedName || session.player.name || "");
        setSelectedAvatar(savedAvatar || session.player.avatar || AVATARS[0]);

        // Keep the intro/loading sequence in front of any restored room.
        // The room status will be applied after startup preloading finishes.
      } catch (restoreError) {
        console.error("Could not restore session:", restoreError);
      } finally {
        setRestoringSession(false);
      }
    }

    restoreSession();
  }, []);

  useEffect(() => {
    if (name) localStorage.setItem("paperio_name", name);
  }, [name]);

  useEffect(() => {
    if (selectedAvatar) localStorage.setItem("paperio_avatar", selectedAvatar);
  }, [selectedAvatar]);

  useEffect(() => {
    if (!startupReady || restoringSession) return;
    if (!room?.status) {
      setScreen("name");
      return;
    }
    if (room.status === "writing") setScreen("writing");
    else if (room.status === "guessing") setScreen("guessing");
    else if (room.status === "reveal") setScreen("reveal");
    else if (room.status === "ended") setScreen("ended");
    else if (room.status === "lobby") setScreen("lobby");
  }, [room?.status, startupReady, restoringSession]);

  useEffect(() => {
    if (!room?.id) return;

    const channel = supabase
      .channel(`room-status-${room.id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "rooms",
        filter: `id=eq.${room.id}`,
      }, (payload) => setRoom(payload.new))
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [room?.id]);

  useEffect(() => {
    if (!room?.id || !player?.id) return;

    const channel = supabase
      .channel(`player-status-${player.id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "players",
        filter: `id=eq.${player.id}`,
      }, (payload) => setPlayer(payload.new))
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [room?.id, player?.id]);

  /* Universal heartbeat so cleanup never removes active players mid-game. */
  useEffect(() => {
    if (!player?.id) return;
    updateHeartbeat(player.id);
    const timer = setInterval(() => updateHeartbeat(player.id), 10000);
    return () => clearInterval(timer);
  }, [player?.id]);

  /* Universal kick detection. It works on lobby, writing, guessing, reveal and results. */
  const handleKicked = useCallback(() => {
    if (leavingRef.current) return;

    localStorage.removeItem("paperio_player_id");
    localStorage.removeItem("paperio_room_id");
    setRoom(null);
    setPlayer(null);
    setError("You were kicked from the room.");
    setScreen("mode");

    window.setTimeout(() => setError(""), 4500);
  }, []);

  useEffect(() => {
    if (!room?.id || !player?.id) return;

    const channel = supabase
      .channel(`universal-player-removal-${room.id}-${player.id}`)
      .on("postgres_changes", {
        event: "DELETE",
        schema: "public",
        table: "players",
      }, (payload) => {
        if (payload.old?.id === player.id) handleKicked();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [room?.id, player?.id, handleKicked]);

  async function handleIntroComplete() {
    if (startupLoadingRef.current) return;
    startupLoadingRef.current = true;
    setScreen("loading");
    setLoadingProgress(0);

    try {
      await preloadAllAssets(({ percent }) => {
        setLoadingProgress(percent);
      });
    } catch (preloadError) {
      console.error("Asset preload failed:", preloadError);
    } finally {
      setLoadingProgress(100);
      setStartupReady(true);
    }
  }

  function handleContinue() {
    if (!name.trim()) return;
    setError("");

    // The name Continue click unlocks the audio. Then show the
    // vaporizer intro — no separate black screen or tap is needed.
    window.dispatchEvent(new Event("paperio-start-music"));
    setScreen("intro");
  }

  /* Create now; all editable game settings live in the lobby. */
  async function handleCreateRoom() {
    if (creatingRoom) return;
    setCreatingRoom(true);
    setError("");

    try {
      const result = await createRoom({
        name,
        avatar: selectedAvatar,
        roundTime: 60,
        rounds: 3,
        topicMode: "builtin",
      });

      setRoom(result.room);
      setPlayer(result.player);
      localStorage.setItem("paperio_player_id", result.player.id);
      localStorage.setItem("paperio_room_id", result.room.id);
      setScreen("lobby");
    } catch (createError) {
      console.error("Create room failed:", createError);
      setError(createError?.message || "Could not create the room.");
    } finally {
      setCreatingRoom(false);
    }
  }

  async function handleJoin(code) {
    if (joiningRoom) return;
    setJoiningRoom(true);
    setError("");

    try {
      const result = await joinRoom({ code, name, avatar: selectedAvatar });
      setRoom(result.room);
      setPlayer(result.player);
      localStorage.setItem("paperio_player_id", result.player.id);
      localStorage.setItem("paperio_room_id", result.room.id);
      setScreen("lobby");
    } catch (joinError) {
      console.error("Join room failed:", joinError);
      setError(joinError?.message || "Could not join the room.");
    } finally {
      setJoiningRoom(false);
    }
  }

  async function handleLeaveRoom() {
    setConfirmingLeave(false);
    leavingRef.current = true;

    try {
      if (player?.id) await leaveRoom(player.id);
    } catch (leaveError) {
      console.error("Leave room failed:", leaveError);
    }

    localStorage.removeItem("paperio_player_id");
    localStorage.removeItem("paperio_room_id");
    setRoom(null);
    setPlayer(null);
    setError("");
    setScreen("mode");

    window.setTimeout(() => {
      leavingRef.current = false;
    }, 500);
  }

  if (restoringSession) {
    return (
      <div className="app-restore-loading">
        <span />
        Loading PAPER.IO...
      </div>
    );
  }

  const insideRoom = Boolean(room?.id && player?.id);
  const showKickBar = insideRoom && ["lobby", "writing", "guessing", "reveal", "ended"].includes(screen);

  return (
    <>
      {screen === "intro" && (
        <VaporizeIntro
          onStart={() => {}}
          onComplete={handleIntroComplete}
          autoStart
        />
      )}

      {screen === "loading" && (
        <LoadingScreen
          label="Preloading"
          variant="Drive"
          progress={loadingProgress}
        />
      )}

      {screen === "name" && (
        <NameScreen
          name={name}
          setName={setName}
          selectedAvatar={selectedAvatar}
          setSelectedAvatar={setSelectedAvatar}
          onContinue={handleContinue}
        />
      )}

      {screen === "mode" && (
        <ModeScreen
          name={name}
          selectedAvatar={selectedAvatar}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={() => setScreen("join-room")}
        />
      )}

      {screen === "join-room" && (
        <JoinRoom
          name={name}
          selectedAvatar={selectedAvatar}
          onBack={() => setScreen("mode")}
          onJoin={handleJoin}
        />
      )}

      {screen === "lobby" && (
        <Lobby room={room} player={player} onKicked={handleKicked} />
      )}

      {screen === "writing" && <WritingScreen room={room} player={player} />}
      {screen === "guessing" && <GuessingScreen room={room} player={player} />}
      {screen === "reveal" && <RevealScreen room={room} player={player} />}
      {screen === "ended" && <ResultsScreen room={room} player={player} />}

            {insideRoom && <StatsMenu room={room} player={player} />}
      <MusicControl
        enabled
        showControls={screen !== "intro"}
      />
      {insideRoom && <ChatBox room={room} player={player} />}

      {error && (
        <div className="game-toast">
          <span className="game-toast-icon">!</span>
          <span>{error}</span>
        </div>
      )}

      {insideRoom && createPortal(
        <div className="global-leave-container">
          {!confirmingLeave ? (
            <button type="button" className="global-leave-button" onClick={() => setConfirmingLeave(true)}>
              Leave
            </button>
          ) : (
            <div className="global-leave-confirm">
              <span>Leave game?</span>
              <button type="button" className="global-leave-confirm-button" onClick={handleLeaveRoom}>Yes</button>
              <button type="button" className="global-leave-cancel-button" onClick={() => setConfirmingLeave(false)}>No</button>
            </div>
          )}
        </div>,
        document.body
      )}

      {(creatingRoom || joiningRoom) && (
        <div className="global-busy-overlay">
          <span className="busy-spinner" />
          {creatingRoom ? "Creating room..." : "Joining room..."}
        </div>
      )}
    </>
  );
}

export default App;
