import { useState } from "react";

function CreateRoom({
  name,
  selectedAvatar,
  onBack,
  onCreate
}) {
  const [roundTime, setRoundTime] = useState(60);
  const [rounds, setRounds] = useState(3);
  const [topicMode, setTopicMode] = useState("builtin");

  function handleCreate() {
    onCreate({
      roundTime,
      rounds,
      topicMode
    });
  }

  return (
    <section className="create-room-screen">
      <div className="create-room-card">

        {/* HEADER */}

        <div className="create-room-header">
          <button
            type="button"
            className="back-button"
            onClick={onBack}
          >
            ←
          </button>

          <div>
            <h1>Create Room</h1>
            <p>Set up your game.</p>
          </div>
        </div>

        {/* HOST PROFILE */}

        <div className="create-room-profile">
          <div className="create-room-avatar">
            <img
              src={"/assets/avatars/" + selectedAvatar}
              alt="Your avatar"
            />
          </div>

          <div>
            <strong>{name}</strong>
            <span>Host</span>
          </div>
        </div>

        {/* GAME SETTINGS */}

        <div className="create-room-section">
          <h2>Game settings</h2>

          {/* WRITING TIME */}

          <div className="setting-row">
            <div className="setting-info">
              <h3>Writing time</h3>
              <p>Time each player gets to write.</p>
            </div>

            <select
              value={roundTime}
              onChange={(event) =>
                setRoundTime(Number(event.target.value))
              }
            >
              <option value={30}>30 sec</option>
              <option value={45}>45 sec</option>
              <option value={60}>60 sec</option>
              <option value={90}>90 sec</option>
              <option value={120}>120 sec</option>
            </select>
          </div>

          {/* ROUNDS */}

          <div className="setting-row">
            <div className="setting-info">
              <h3>Rounds</h3>
              <p>Number of rounds in the game.</p>
            </div>

            <select
              value={rounds}
              onChange={(event) =>
                setRounds(Number(event.target.value))
              }
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
            </select>
          </div>

          {/* WRITING MODE */}

          <div className="topic-setting">
            <div className="setting-info">
              <h3>Writing mode</h3>
              <p>
                Choose how players get their writing prompts.
              </p>
            </div>

            <div className="topic-options">

              {/* BUILT-IN TOPICS */}

              <button
                type="button"
                className={
                  topicMode === "builtin"
                    ? "topic-option active"
                    : "topic-option"
                }
                onClick={() => setTopicMode("builtin")}
              >
                <span className="topic-radio">
                  {topicMode === "builtin" ? "✓" : ""}
                </span>

                <span>
                  <strong>Built-in topics</strong>
                  <small>
                    Use the default topic list.
                  </small>
                </span>
              </button>

              {/* CUSTOM TOPICS */}

              <button
                type="button"
                className={
                  topicMode === "custom"
                    ? "topic-option active"
                    : "topic-option"
                }
                onClick={() => setTopicMode("custom")}
              >
                <span className="topic-radio">
                  {topicMode === "custom" ? "✓" : ""}
                </span>

                <span>
                  <strong>Custom topics</strong>
                  <small>
                    Use topics provided by the host.
                  </small>
                </span>
              </button>

              {/* FREESTYLE */}

              <button
                type="button"
                className={
                  topicMode === "freestyle"
                    ? "topic-option active"
                    : "topic-option"
                }
                onClick={() => setTopicMode("freestyle")}
              >
                <span className="topic-radio">
                  {topicMode === "freestyle" ? "✓" : ""}
                </span>

                <span>
                  <strong>Freestyle</strong>
                  <small>
                    No topics. Write whatever you want.
                  </small>
                </span>
              </button>

            </div>
          </div>
        </div>

        {/* CREATE ROOM */}

        <button
          type="button"
          className="create-room-button"
          onClick={handleCreate}
        >
          <span>Create Room</span>
          <span>→</span>
        </button>

      </div>
    </section>
  );
}

export default CreateRoom;
