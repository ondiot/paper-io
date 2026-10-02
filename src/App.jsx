import { useState } from "react";

import NameScreen from "./components/NameScreen";
import ModeScreen from "./components/ModeScreen";
import CreateRoom from "./components/CreateRoom";
import VaporizeIntro from "./components/VaporizeIntro";

import { AVATARS } from "./game/avatars";
import { createRoom } from "./game/rooms";

function App() {
  const [name, setName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(
    AVATARS[0]
  );

  const [screen, setScreen] = useState("intro");

  const [room, setRoom] = useState(null);
  const [player, setPlayer] = useState(null);

  const [creatingRoom, setCreatingRoom] = useState(false);
  const [error, setError] = useState("");

  // =========================
  // INTRO
  // =========================

  function handleIntroComplete() {
    setScreen("name");
  }

  // =========================
  // NAME
  // =========================

  function handleContinue() {
    if (!name.trim()) return;

    setScreen("mode");
  }

  // =========================
  // MODE
  // =========================

  function handleCreateRoom() {
    setError("");
    setScreen("create-room");
  }

  function handleJoinRoom() {
    console.log("Join Room clicked");
  }

  // =========================
  // CREATE ROOM
  // =========================

  async function handleCreate(settings) {
    if (creatingRoom) return;

    setCreatingRoom(true);
    setError("");

    try {
      const result = await createRoom({
        name,
        avatar: selectedAvatar,
        roundTime: settings.roundTime,
        rounds: settings.rounds,
        topicMode: settings.topicMode
      });

      setRoom(result.room);
      setPlayer(result.player);

      console.log("Room created:", result.room);
      console.log("Host created:", result.player);

      // Lobby will be added next.
      console.log(
        `Room code: ${result.room.code}`
      );

    } catch (error) {
      console.error("Create room failed:", error);

      setError(
        error?.message ||
        "Something went wrong while creating the room."
      );
    } finally {
      setCreatingRoom(false);
    }
  }

  // =========================
  // RENDER
  // =========================

  return (
    <main className="app">

      {/* INTRO */}

      {screen === "intro" && (
        <VaporizeIntro
          onComplete={handleIntroComplete}
        />
      )}

      {/* NAME SCREEN */}

      {screen === "name" && (
        <NameScreen
          name={name}
          setName={setName}
          selectedAvatar={selectedAvatar}
          setSelectedAvatar={setSelectedAvatar}
          onContinue={handleContinue}
        />
      )}

      {/* MODE SCREEN */}

      {screen === "mode" && (
        <ModeScreen
          name={name}
          selectedAvatar={selectedAvatar}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
        />
      )}

      {/* CREATE ROOM SCREEN */}

      {screen === "create-room" && (
        <CreateRoom
          name={name}
          selectedAvatar={selectedAvatar}
          onBack={() => setScreen("mode")}
          onCreate={handleCreate}
        />
      )}

      {/* TEMP ERROR */}

      {error && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10000,
            padding: "12px 16px",
            border: "1px solid #444",
            borderRadius: "10px",
            background: "#111",
            color: "#fff",
            fontSize: "13px"
          }}
        >
          {error}
        </div>
      )}

      {/* TEMP LOADING */}

      {creatingRoom && (
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
            fontSize: "15px"
          }}
        >
          Creating room...
        </div>
      )}

    </main>
  );
}

export default App;
