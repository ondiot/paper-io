import { useState } from "react";
import NameScreen from "./components/NameScreen";

function App() {
  const [name, setName] = useState("");
  const [screen, setScreen] = useState("name");

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
          onContinue={handleContinue}
        />
      )}

      {screen === "mode" && (
        <div>
          <h1>Welcome, {name}!</h1>

          <p>
            Mode selection will come next.
          </p>
        </div>
      )}
    </main>
  );
}

export default App;