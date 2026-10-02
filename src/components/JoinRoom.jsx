import { useState } from "react";

function JoinRoom({
  name,
  selectedAvatar,
  onBack,
  onJoin
}) {
  const [code, setCode] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    const cleanCode = code
      .trim()
      .toUpperCase();

    if (cleanCode.length !== 6) {
      return;
    }

    onJoin(cleanCode);
  }

  return (
    <section className="join-room-screen">
      <div className="join-room-card">

        {/* HEADER */}

        <div className="join-room-header">
          <button
            type="button"
            className="back-button"
            onClick={onBack}
          >
            ←
          </button>

          <div>
            <h1>Join Room</h1>
            <p>Enter your friend's room code.</p>
          </div>
        </div>

        {/* PROFILE */}

        <div className="create-room-profile">
          <div className="create-room-avatar">
            <img
              src={
                "/assets/avatars/" +
                selectedAvatar
              }
              alt="Your avatar"
            />
          </div>

          <div>
            <strong>{name}</strong>
            <span>Player</span>
          </div>
        </div>

        {/* CODE */}

        <form
          className="join-room-form"
          onSubmit={handleSubmit}
        >
          <label htmlFor="room-code">
            Room code
          </label>

          <input
            id="room-code"
            type="text"
            value={code}
            onChange={(event) =>
              setCode(
                event.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "")
                  .slice(0, 6)
              )
            }
            placeholder="ABC123"
            maxLength={6}
            autoComplete="off"
            spellCheck="false"
            autoFocus
          />

          <p className="join-room-hint">
            Ask the host for the 6-character room code.
          </p>

          <button
            type="submit"
            className="join-room-button"
            disabled={code.length !== 6}
          >
            Join Room
            <span>→</span>
          </button>
        </form>

      </div>
    </section>
  );
}

export default JoinRoom;