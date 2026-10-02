import { useState } from "react";
import NameScreen from "./components/NameScreen";
import { AVATARS } from "./game/avatars";

function App() {
  const [name, setName] = useState("");
  const [selectedAvatar, setSelectedAvatar] =
    useState(AVATARS[0]);

  const [screen, setScreen] =
    useState("name");

  function handleContinue() {
    if (!name.trim()) return;

    setScreen("mode");
  }

  return (
    <main className="app">

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
        <div className="mode-screen">
          <div className="mode-screen-card">

            <h1>
              Welcome, {name}!
            </h1>

            <p>
              Your avatar:
            </p>

            <img
              src={`/assets/avatars/${selectedAvatar}`}
              alt="Avatar"
              width="100"
            />

            <p>
              Mode selection will come next.
            </p>

          </div>
        </div>
      )}

    </main>
  );
}

export default App;