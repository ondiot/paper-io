function Lobby({
  room,
  player,
  onLeave
}) {
  if (!room || !player) {
    return null;
  }

  async function copyRoomCode() {
    try {
      await navigator.clipboard.writeText(room.code);
    } catch (error) {
      console.error("Could not copy room code:", error);
    }
  }

  return (
    <section className="lobby-screen">
      <div className="lobby-card">

        {/* HEADER */}

        <div className="lobby-header">
          <div>
            <h1>Game Lobby</h1>
            <p>Waiting for players to join.</p>
          </div>

          <button
            type="button"
            className="lobby-leave-button"
            onClick={onLeave}
          >
            Leave
          </button>
        </div>

        {/* ROOM CODE */}

        <div className="room-code-box">
          <span>ROOM CODE</span>

          <strong>{room.code}</strong>

          <button
            type="button"
            onClick={copyRoomCode}
          >
            Copy Code
          </button>
        </div>

        {/* PLAYER */}

        <div className="lobby-section">
          <div className="lobby-section-title">
            <h2>Players</h2>
            <span>1 player</span>
          </div>

          <div className="lobby-player">
            <div className="lobby-player-avatar">
              <img
                src={
                  "/assets/avatars/" +
                  player.avatar
                }
                alt={player.name}
              />
            </div>

            <div className="lobby-player-info">
              <strong>{player.name}</strong>
              <span>Host</span>
            </div>

            <div className="lobby-player-status">
              Ready
            </div>
          </div>
        </div>

        {/* WAITING */}

        <div className="lobby-waiting">
          <div className="lobby-waiting-dot" />

          <span>
            Waiting for other players...
          </span>
        </div>

        {/* START */}

        <button
          type="button"
          className="lobby-start-button"
          disabled
        >
          Start Game
        </button>

      </div>
    </section>
  );
}

export default Lobby;