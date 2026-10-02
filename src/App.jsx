import {
  useCallback,
  useEffect,
  useState
} from "react";

import NameScreen from "./components/NameScreen";
import ModeScreen from "./components/ModeScreen";
import CreateRoom from "./components/CreateRoom";
import JoinRoom from "./components/JoinRoom";
import Lobby from "./components/Lobby";
import WritingScreen from "./components/WritingScreen";
import VaporizeIntro from "./components/VaporizeIntro";

import { AVATARS } from "./game/avatars";

import {
  createRoom,
  joinRoom,
  getPlayerSession,
  leaveRoom
} from "./game/rooms";

import { supabase } from "./lib/supabase";


function App() {

  // ========================================
  // PLAYER
  // ========================================

  const [name, setName] =
    useState("");

  const [selectedAvatar, setSelectedAvatar] =
    useState(
      AVATARS[0]
    );


  // ========================================
  // SCREEN
  // ========================================

  const [screen, setScreen] =
    useState("intro");


  // ========================================
  // ROOM / PLAYER
  // ========================================

  const [room, setRoom] =
    useState(null);

  const [player, setPlayer] =
    useState(null);


  // ========================================
  // LOADING
  // ========================================

  const [creatingRoom, setCreatingRoom] =
    useState(false);

  const [joiningRoom, setJoiningRoom] =
    useState(false);

  const [restoringSession, setRestoringSession] =
    useState(true);


  // ========================================
  // TOAST
  // ========================================

  const [error, setError] =
    useState("");


  // ========================================
  // RESTORE SESSION
  // ========================================

  useEffect(() => {

    async function restoreSession() {

      const savedPlayerId =
        localStorage.getItem(
          "paperio_player_id"
        );

      const savedRoomId =
        localStorage.getItem(
          "paperio_room_id"
        );

      const savedName =
        localStorage.getItem(
          "paperio_name"
        );

      const savedAvatar =
        localStorage.getItem(
          "paperio_avatar"
        );


      if (
        !savedPlayerId ||
        !savedRoomId
      ) {

        setRestoringSession(
          false
        );

        return;
      }


      try {

        const session =
          await getPlayerSession(
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

          setRestoringSession(
            false
          );

          return;
        }


        setRoom(
          session.room
        );

        setPlayer(
          session.player
        );


        if (savedName) {

          setName(
            savedName
          );

        } else {

          setName(
            session.player.name
          );
        }


        if (savedAvatar) {

          setSelectedAvatar(
            savedAvatar
          );

        } else {

          setSelectedAvatar(
            session.player.avatar
          );
        }


        // Restore the correct screen.

        if (
          session.room.status ===
          "writing"
        ) {

          setScreen(
            "writing"
          );

        } else {

          setScreen(
            "lobby"
          );
        }

      } catch (error) {

        console.error(
          "Could not restore session:",
          error
        );

      } finally {

        setRestoringSession(
          false
        );
      }
    }


    restoreSession();

  }, []);


  // ========================================
  // SAVE NAME
  // ========================================

  useEffect(() => {

    if (name) {

      localStorage.setItem(
        "paperio_name",
        name
      );
    }

  }, [name]);


  // ========================================
  // SAVE AVATAR
  // ========================================

  useEffect(() => {

    if (selectedAvatar) {

      localStorage.setItem(
        "paperio_avatar",
        selectedAvatar
      );
    }

  }, [selectedAvatar]);


  // ========================================
  // REALTIME ROOM UPDATES
  // ========================================

  useEffect(() => {

    if (!room?.id) {
      return;
    }


    const channel =
      supabase
        .channel(
          `room-status-${room.id}-${player?.id || "unknown"}`
        )

        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "rooms",
            filter:
              `id=eq.${room.id}`
          },
          (payload) => {

            const updatedRoom =
              payload.new;


            setRoom(
              updatedRoom
            );


            // LOBBY → WRITING

            if (
              updatedRoom.status ===
              "writing"
            ) {

              setScreen(
                "writing"
              );
            }


            // Future phases

            if (
              updatedRoom.status ===
              "guessing"
            ) {

              setScreen(
                "guessing"
              );
            }


            if (
              updatedRoom.status ===
              "reveal"
            ) {

              setScreen(
                "reveal"
              );
            }


            if (
              updatedRoom.status ===
              "ended"
            ) {

              setScreen(
                "ended"
              );
            }

          }
        )

        .subscribe();


    return () => {

      supabase.removeChannel(
        channel
      );
    };

  }, [
    room?.id,
    player?.id
  ]);


  // ========================================
  // INTRO
  // ========================================

  function handleIntroComplete() {

    setScreen(
      "name"
    );
  }


  // ========================================
  // NAME
  // ========================================

  function handleContinue() {

    if (!name.trim()) {
      return;
    }

    setError("");

    setScreen(
      "mode"
    );
  }


  // ========================================
  // MODE
  // ========================================

  function handleCreateRoom() {

    setError("");

    setScreen(
      "create-room"
    );
  }


  function handleJoinRoom() {

    setError("");

    setScreen(
      "join-room"
    );
  }


  // ========================================
  // CREATE ROOM
  // ========================================

  async function handleCreate(
    settings
  ) {

    if (creatingRoom) {
      return;
    }


    setCreatingRoom(
      true
    );

    setError("");


    try {

      const result =
        await createRoom({
          name,
          avatar:
            selectedAvatar,
          roundTime:
            settings.roundTime,
          rounds:
            settings.rounds,
          topicMode:
            settings.topicMode
        });


      setRoom(
        result.room
      );

      setPlayer(
        result.player
      );


      localStorage.setItem(
        "paperio_player_id",
        result.player.id
      );

      localStorage.setItem(
        "paperio_room_id",
        result.room.id
      );


      setScreen(
        "lobby"
      );

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

      setCreatingRoom(
        false
      );
    }
  }


  // ========================================
  // JOIN ROOM
  // ========================================

  async function handleJoin(
    code
  ) {

    if (joiningRoom) {
      return;
    }


    setJoiningRoom(
      true
    );

    setError("");


    try {

      const result =
        await joinRoom({
          code,
          name,
          avatar:
            selectedAvatar
        });


      setRoom(
        result.room
      );

      setPlayer(
        result.player
      );


      localStorage.setItem(
        "paperio_player_id",
        result.player.id
      );

      localStorage.setItem(
        "paperio_room_id",
        result.room.id
      );


      setScreen(
        "lobby"
      );

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

      setJoiningRoom(
        false
      );
    }
  }


  // ========================================
  // LEAVE ROOM
  // ========================================

  async function handleLeaveRoom() {

    if (player?.id) {

      await leaveRoom(
        player.id
      );
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

    setScreen(
      "mode"
    );
  }


  // ========================================
  // KICKED
  // ========================================

  const handleKicked =
    useCallback(() => {

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


      setScreen(
        "mode"
      );


      setTimeout(() => {

        setError("");

      }, 4000);

    }, []);


  // ========================================
  // RESTORING
  // ========================================

  if (restoringSession) {

    return (
      <main className="app">

        <div
          style={{
            position: "fixed",
            inset: 0,

            display: "flex",
            alignItems: "center",
            justifyContent: "center",

            background: "#000",
            color: "#fff",

            fontSize: "14px"
          }}
        >
          Loading...
        </div>

      </main>
    );
  }


  // ========================================
  // RENDER
  // ========================================

  return (

    <main className="app">


      {/* INTRO */}

      {screen === "intro" && (

        <VaporizeIntro
          onComplete={
            handleIntroComplete
          }
        />

      )}


      {/* NAME */}

      {screen === "name" && (

        <NameScreen
          name={name}

          setName={
            setName
          }

          selectedAvatar={
            selectedAvatar
          }

          setSelectedAvatar={
            setSelectedAvatar
          }

          onContinue={
            handleContinue
          }
        />

      )}


      {/* MODE */}

      {screen === "mode" && (

        <ModeScreen
          name={name}

          selectedAvatar={
            selectedAvatar
          }

          onCreateRoom={
            handleCreateRoom
          }

          onJoinRoom={
            handleJoinRoom
          }
        />

      )}


      {/* CREATE ROOM */}

      {screen === "create-room" && (

        <CreateRoom
          name={name}

          selectedAvatar={
            selectedAvatar
          }

          onBack={() => {

            setError("");

            setScreen(
              "mode"
            );

          }}

          onCreate={
            handleCreate
          }
        />

      )}


      {/* JOIN ROOM */}

      {screen === "join-room" && (

        <JoinRoom
          name={name}

          selectedAvatar={
            selectedAvatar
          }

          onBack={() => {

            setError("");

            setScreen(
              "mode"
            );

          }}

          onJoin={
            handleJoin
          }

        />

      )}


      {/* LOBBY */}

      {screen === "lobby" && (

        <Lobby
          room={room}

          player={player}

          onLeave={
            handleLeaveRoom
          }

          onKicked={
            handleKicked
          }
        />

      )}


      {/* WRITING */}

      {screen === "writing" && (

        <WritingScreen
          room={room}
          player={player}
        />

      )}


      {/* TOAST */}

      {error && (

        <div className="game-toast">

          <span className="game-toast-icon">
            !
          </span>

          <span>
            {error}
          </span>

        </div>

      )}


      {/* LOADING */}

      {(creatingRoom ||
        joiningRoom) && (

        <div
          style={{
            position: "fixed",
            inset: 0,

            zIndex: 9998,

            display: "flex",
            alignItems: "center",
            justifyContent:
              "center",

            background:
              "rgba(0, 0, 0, 0.65)",

            color: "#fff",

            fontSize: "15px"
          }}
        >
          {creatingRoom
            ? "Creating room..."
            : "Joining room..."}
        </div>

      )}

    </main>
  );
}


export default App;