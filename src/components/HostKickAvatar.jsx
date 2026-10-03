import { useState } from "react";
import { kickPlayer } from "../game/rooms";

function HostKickAvatar({
  targetPlayer,
  currentPlayer,
  className = "",
  children
}) {
  const [confirming, setConfirming] = useState(false);
  const [kicking, setKicking] = useState(false);
  const [error, setError] = useState("");

  const canKick =
    Boolean(currentPlayer?.is_host) &&
    Boolean(targetPlayer?.id) &&
    targetPlayer.id !== currentPlayer?.id;

  if (!canKick) {
    return <>{children}</>;
  }

  async function handleKick() {
    if (kicking) return;

    setKicking(true);
    setError("");

    try {
      await kickPlayer({
        targetPlayerId: targetPlayer.id,
        hostPlayerId: currentPlayer.id
      });
      setConfirming(false);
    } catch (err) {
      console.error("Kick failed:", err);
      setError(err?.message || "Could not kick this player.");
    } finally {
      setKicking(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={`host-kick-avatar ${className}`.trim()}
        onClick={() => setConfirming(true)}
        title={`Kick ${targetPlayer.name}`}
      >
        {children}
        <span className="host-kick-hint">KICK</span>
      </button>

      {confirming && (
        <div className="host-kick-overlay">
          <div className="host-kick-dialog">
            <span className="host-kick-dialog-label">HOST ACTION</span>
            <h3>Kick {targetPlayer.name}?</h3>
            <p>They will be removed from this game.</p>

            {error && (
              <div className="host-kick-error">{error}</div>
            )}

            <div className="host-kick-actions">
              <button
                type="button"
                className="host-kick-cancel"
                onClick={() => {
                  setConfirming(false);
                  setError("");
                }}
                disabled={kicking}
              >
                Cancel
              </button>

              <button
                type="button"
                className="host-kick-confirm"
                onClick={handleKick}
                disabled={kicking}
              >
                {kicking ? "Kicking..." : "Kick player"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default HostKickAvatar;
