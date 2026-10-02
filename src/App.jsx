import { useState } from "react";

import NameScreen from "./components/NameScreen";
import ModeScreen from "./components/ModeScreen";
import VaporizeIntro from "./components/VaporizeIntro";

import { AVATARS } from "./game/avatars";

function App() {
  const [name, setName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);

  const [screen, setScreen] = useState("intro");

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
    console.log("Create Room clicked");
  }

  function handleJoinRoom() {
    console.log("Join Room clicked");
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

    </main>
  );
}

export default App;