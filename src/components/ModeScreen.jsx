function ModeScreen({
  name,
  selectedAvatar,
  onCreateRoom,
  onJoinRoom
}) {
  return (
    <section className="mode-screen">
      <div className="mode-card">

        <div className="mode-profile">
          <div className="mode-avatar">
            <img
              src={`${import.meta.env.BASE_URL}assets/avatars/${selectedAvatar}`}
              alt="Your avatar"
            />
          </div>

          <div className="mode-profile-info">
            <h2>{name}</h2>
            <p>Ready to play?</p>
          </div>
        </div>

        <div className="mode-title">
          <h1>Choose a mode</h1>
          <p>Create a room or join your friends.</p>
        </div>

        <div className="mode-options">

          <button
            type="button"
            className="mode-option"
            onClick={onCreateRoom}
          >
            <div className="mode-option-icon">＋</div>

            <div className="mode-option-text">
              <h3>Create Room</h3>
              <p>Start a new game and invite your friends.</p>
            </div>

            <span className="mode-option-arrow">›</span>
          </button>

          <button
            type="button"
            className="mode-option"
            onClick={onJoinRoom}
          >
            <div className="mode-option-icon">→</div>

            <div className="mode-option-text">
              <h3>Join Room</h3>
              <p>Enter a room code to join a game.</p>
            </div>

            <span className="mode-option-arrow">›</span>
          </button>

        </div>

      </div>
    </section>
  );
}

export default ModeScreen;
