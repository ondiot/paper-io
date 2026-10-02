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

  const [confirmingLeave, setConfirmingLeave] =
    useState(false);

  /*
   * Restore previously saved player session.
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
          localStorage.removeItem(
            "paperio_player_id"
          );

          localStorage.removeItem(
            "paperio_room_id"
          );

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
   * Save player's name.
   */
  useEffect(() => {
    if (name) {
      localStorage.setItem(
        "paperio_name",
        name
      );
    }
  }, [name]);

  /*
   * Save selected avatar.
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
   * Keep screen synchronized with room status.
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
   * Listen for room changes.
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
   * Listen for player changes.
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
   * Preload assets.
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

    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });

    setPreloadingAssets(false);
    setScreen("name");
  }

  /*
   * Continue from name screen.
   */
  function handleContinue() {
    if (!name.trim()) {
      return;
    }

    setError("");
    setScreen("mode");
  }

  /*
   * Open create room.
   */
  function handleCreateRoom() {
    setError("");
    setScreen("create-room");
  }

  /*
   * Open join room.
   */
  function handleJoinRoom() {
    setError("");
    setScreen("join-room");
  }

  /*
   * Create room.
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
   * Join room.
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
   * Leave current room.
   */
  async function handleLeaveRoom() {
    setConfirmingLeave(false);

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
   * Handle kicked player.
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
   * Show leave button only while inside a room.
   */
  const showLeaveButton =
    room &&
    player &&
    [
      "lobby",
      "writing",
      "guessing",
      "reveal",
      "ended",
    ].includes(screen);

  /*
   * Loading while restoring session.
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

  return (
    <>
      {showLeaveButton && (
        <div className="global-leave-container">
          {!confirmingLeave ? (
            <button
              type="button"
              className="global-leave-button"
              onClick={() =>
                setConfirmingLeave(true)
              }
            >
              Leave
            </button>
          ) : (
            <div className="global-leave-confirm">
              <span>Leave game?</span>

              <button
                type="button"
                className="global-leave-confirm-button"
                onClick={handleLeaveRoom}
              >
                Yes
              </button>

              <button
                type="button"
                className="global-leave-cancel-button"
                onClick={() =>
                  setConfirmingLeave(false)
                }
              >
                No
              </button>
            </div>
          )}
        </div>
      )}

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

      {/* Mode */}
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

      {/* Ended */}
      {screen === "ended" && (
        <div />
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

      {/* Create / Join loading */}
      {(creatingRoom || joiningRoom) && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "rgba(0, 0, 0, 0.65)",
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