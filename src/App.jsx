import {
  useCallback,
  useEffect,
  useState,
} from "react";

import LoadingScreen from "./components/LoadingScreen";
import NameScreen from "./components/NameScreen";
import ModeScreen from "./components/ModeScreen";
import CreateRoom from "./components/CreateRoom";
import JoinRoom from "./components/JoinRoom";
import Lobby from "./components/Lobby";
import WritingScreen from "./components/WritingScreen";
import GuessingScreen from "./components/GuessingScreen";
import VaporizeIntro from "./components/VaporizeIntro";
import RevealScreen from "./components/RevealScreen";

import { AVATARS } from "./game/avatars";

import { preloadAllAssets } from "./game/preloadAssets";

import {
  createRoom,
  joinRoom,
  getPlayerSession,
  leaveRoom,
} from "./game/rooms";

import { supabase } from "./lib/supabase";

function App() {
  const [name, setName] = useState("");

  const [selectedAvatar, setSelectedAvatar] = useState(
    AVATARS[0]
  );

  const [screen, setScreen] = useState("intro");

  const [room, setRoom] = useState(null);

  const [player, setPlayer] = useState(null);

  const [creatingRoom, setCreatingRoom] = useState(false);

  const [joiningRoom, setJoiningRoom] = useState(false);

  const [restoringSession, setRestoringSession] = useState(true);

  const [preloadingAssets, setPreloadingAssets] = useState(false);

  const [preloadProgress, setPreloadProgress] = useState(0);

  const [error, setError] = useState("");

  /*
   * Restore a previously saved player session.
   *
   * If the browser still has a valid player ID and room ID,
   * attempt to reconnect the player to that room.
   */
  useEffect(() => {
    async function restoreSession() {
      const savedPlayerId = localStorage.getItem(
        "paperio_player_id"
      );

      const savedRoomId = localStorage.getItem(
        "paperio_room_id"
      );

      const savedName = localStorage.getItem(
        "paperio_name"
      );

      const savedAvatar = localStorage.getItem(
        "paperio_avatar"
      );

      if (!savedPlayerId || !savedRoomId) {
        setRestoringSession(false);
        return;
      }

      try {
        const session = await getPlayerSession(
          savedPlayerId,
          savedRoomId
        );

        if (!session) {
          localStorage.removeItem("paperio_player_id");
          localStorage.removeItem("paperio_room_id");

          setRestoringSession(false);
          return;
        }

        setRoom(session.room);
        setPlayer(session.player);

        if (savedName) {
          setName(savedName);
        } else {
          setName(session.player.name);
        }

        if (savedAvatar) {
          setSelectedAvatar(savedAvatar);
        } else {
          setSelectedAvatar(session.player.avatar);
        }

        // Restore the correct screen based on the room status.
        switch (session.room.status) {
          case "writing":
            setScreen("writing");
            break;

          case "guessing":
            setScreen("guessing");
            break;

          case "reveal":
            setScreen("reveal");
            break;

          case "ended":
            setScreen("ended");
            break;

          default:
            setScreen("lobby");
            break;
        }
      } catch (error) {
        console.error(
          "Could not restore session:",
          error
        );
      } finally {
        setRestoringSession(false);
      }
    }

    restoreSession();
  }, []);

  /*
   * Save the player's name locally so it can be restored
   * when the page is opened again.
   */
  useEffect(() => {
    if (name) {
      localStorage.setItem("paperio_name", name);
    }
  }, [name]);

  /*
   * Save the selected avatar locally.
   */
  useEffect(() => {
    if (selectedAvatar) {
      localStorage.setItem(
        "paperio_avatar",
        selectedAvatar
      );
    }
  }, [selectedAvatar]);

  /*
   * Keep the visible screen synchronized with the
   * current room status.
   */
  useEffect(() => {
    if (!room?.status) {
      return;
    }

    switch (room.status) {
      case "writing":
        setScreen("writing");
        break;

      case "guessing":
        setScreen("guessing");
        break;

      case "reveal":
        setScreen("reveal");
        break;

      case "ended":
        setScreen("ended");
        break;

      case "lobby":
        setScreen("lobby");
        break;

      default:
        break;
    }
  }, [room?.status]);

  /*
   * Listen for realtime changes to the current room.
   *
   * This keeps the local room state synchronized when
   * another player changes the room status.
   */
  useEffect(() => {
    if (!room?.id) {
      return;
    }

    const channel = supabase
      .channel(`room-status-${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${room.id}`,
        },
        (payload) => {
          console.log(
            "ROOM UPDATE:",
            payload.new
          );

          setRoom(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id]);

  /*
   * Listen for realtime changes to the current player.
   *
   * This is especially useful for keeping the player's
   * score and other player information synchronized.
   */
  useEffect(() => {
    if (!room?.id || !player?.id) {
      return;
    }

    const channel = supabase
      .channel(`player-status-${player.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "players",
          filter: `id=eq.${player.id}`,
        },
        (payload) => {
          console.log(
            "PLAYER UPDATE:",
            payload.new
          );

          setPlayer(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id, player?.id]);

  /*
   * Preload all game assets after the intro finishes.
   *
   * preloadAllAssets() handles images, audio, fonts,
   * and reports loading progress back to this component.
   */
  async function handleIntroComplete() {
    setPreloadingAssets(true);
    setPreloadProgress(0);

    try {
      await preloadAllAssets(({ percent }) => {
        setPreloadProgress(percent);
      });
    } catch (error) {
      console.error(
        "Asset preloading failed:",
        error
      );
    }

    /*
     * Keep the loading screen visible briefly even when
     * everything is already cached by the browser.
     */
    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });

    setPreloadingAssets(false);
    setScreen("name");
  }

  /*
   * Continue from the name screen.
   */
  function handleContinue() {
    if (!name.trim()) {
      return;
    }

    setError("");
    setScreen("mode");
  }

  /*
   * Open the create-room screen.
   */
  function handleCreateRoom() {
    setError("");
    setScreen("create-room");
  }

  /*
   * Open the join-room screen.
   */
  function handleJoinRoom() {
    setError("");
    setScreen("join-room");
  }

  /*
   * Create a new game room.
   */
  async function handleCreate(settings) {
    if (creatingRoom) {
      return;
    }

    setCreatingRoom(true);
    setError("");

    try {
      const result = await createRoom({
        name,
        avatar: selectedAvatar,
        roundTime: settings.roundTime,
        rounds: settings.rounds,
        topicMode: settings.topicMode,
      });

      setRoom(result.room);
      setPlayer(result.player);

      localStorage.setItem(
        "paperio_player_id",
        result.player.id
      );

      localStorage.setItem(
        "paperio_room_id",
        result.room.id
      );

      setScreen("lobby");
    } catch (error) {
      console.error(
        "Create room failed:",
        error
      );

      setError(
        error?.message ||
          "Something went wrong while creating the room."
      );
    } finally {
      setCreatingRoom(false);
    }
  }

  /*
   * Join an existing game room.
   */
  async function handleJoin(code) {
    if (joiningRoom) {
      return;
    }

    setJoiningRoom(true);
    setError("");

    try {
      const result = await joinRoom({
        code,
        name,
        avatar: selectedAvatar,
      });

      setRoom(result.room);
      setPlayer(result.player);

      localStorage.setItem(
        "paperio_player_id",
        result.player.id
      );

      localStorage.setItem(
        "paperio_room_id",
        result.room.id
      );

      setScreen("lobby");
    } catch (error) {
      console.error(
        "Join room failed:",
        error
      );

      setError(
        error?.message ||
          "Something went wrong while joining the room."
      );
    } finally {
      setJoiningRoom(false);
    }
  }

  /*
   * Leave the current room and clear the saved session.
   */
  async function handleLeaveRoom() {
    if (player?.id) {
      try {
        await leaveRoom(player.id);
      } catch (error) {
        console.error(
          "Leave room failed:",
          error
        );
      }
    }

    localStorage.removeItem(
      "paperio_player_id"
    );

    localStorage.removeItem(
      "paperio_room_id"
    );

    setRoom(null);
    setPlayer(null);
    setError("");

    setScreen("mode");
  }

  /*
   * Handle being kicked from the room.
   */
  const handleKicked = useCallback(() => {
    localStorage.removeItem(
      "paperio_player_id"
    );

    localStorage.removeItem(
      "paperio_room_id"
    );

    setRoom(null);
    setPlayer(null);

    setError(
      "You were kicked from the room."
    );

    setScreen("mode");

    setTimeout(() => {
      setError("");
    }, 4000);
  }, []);

  /*
   * Show a simple loading screen while attempting
   * to restore a previous session.
   */
  if (restoringSession) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000",
          color: "#fff",
          fontSize: "14px",
        }}
      >
        Loading...
      </div>
    );
  }

  /*
   * Main application.
   */
  return (
    <>
      {/* Intro */}
      {screen === "intro" && (
        <VaporizeIntro
          onComplete={handleIntroComplete}
        />
      )}

      {/* Asset preloading */}
      {preloadingAssets && (
        <LoadingScreen
          label="Preloading"
          variant="Drive"
          progress={preloadProgress}
        />
      )}

      {/* Name */}
      {screen === "name" && (
        <NameScreen
          name={name}
          setName={setName}
          selectedAvatar={selectedAvatar}
          setSelectedAvatar={setSelectedAvatar}
          onContinue={handleContinue}
        />
      )}

      {/* Mode selection */}
      {screen === "mode" && (
        <ModeScreen
          name={name}
          selectedAvatar={selectedAvatar}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
        />
      )}

      {/* Create room */}
      {screen === "create-room" && (
        <CreateRoom
          name={name}
          selectedAvatar={selectedAvatar}
          onBack={() => {
            setError("");
            setScreen("mode");
          }}
          onCreate={handleCreate}
        />
      )}

      {/* Join room */}
      {screen === "join-room" && (
        <JoinRoom
          name={name}
          selectedAvatar={selectedAvatar}
          onBack={() => {
            setError("");
            setScreen("mode");
          }}
          onJoin={handleJoin}
        />
      )}

      {/* Lobby */}
      {screen === "lobby" && (
        <Lobby
          room={room}
          player={player}
          onLeave={handleLeaveRoom}
          onKicked={handleKicked}
        />
      )}

      {/* Writing */}
      {screen === "writing" && (
        <WritingScreen
          room={room}
          player={player}
        />
      )}

      {/* Guessing */}
      {screen === "guessing" && (
        <GuessingScreen
          room={room}
          player={player}
        />
      )}

      {/* Reveal */}
      {screen === "reveal" && (
        <RevealScreen
          room={room}
          player={player}
        />
      )}

      {/* Error toast */}
      {error && (
        <div className="game-toast">
          <span className="game-toast-icon">
            !
          </span>

          <span>{error}</span>
        </div>
      )}

      {/* Create / Join loading overlay */}
      {(creatingRoom || joiningRoom) && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0, 0, 0, 0.65)",
            color: "#fff",
            fontSize: "15px",
          }}
        >
          {creatingRoom
            ? "Creating room..."
            : "Joining room..."}
        </div>
      )}
    </>
  );
}

export default App;
