import { useState } from "react";
import { kickPlayer } from "../game/rooms";

function AvatarKickControl({ room, hostPlayer, targetPlayer, children }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const canKick =
    room?.id &&
    hostPlayer?.is_host &&
    targetPlayer?.id &&
    targetPlayer.id !== hostPlayer.id;

  async function handleKick(event) {
    event.stopPropagation();
    if (busy) return;

    const confirmed = window.confirm(`Kick ${targetPlayer.name} from the game?`);
    if (!confirmed) return;

    setBusy(true);
    try {
      await kickPlayer({
        targetPlayerId: targetPlayer.id,
        hostPlayerId: hostPlayer.id,
      });
      setOpen(false);
    } catch (error) {
      console.error("Kick failed:", error);
      alert(error?.message || "Could not kick this player.");
    } finally {
      setBusy(false);
    }
  }

  if (!canKick) return children;

  return (
    <div className="avatar-kick-control">
      <button
        type="button"
        className={`avatar-kick-trigger${open ? " open" : ""}`}
        onClick={() => setOpen((current) => !current)}
        title={`Player options for ${targetPlayer.name}`}
        aria-label={`Player options for ${targetPlayer.name}`}
      >
        {children}
      </button>

      {open && (
        <div className="avatar-kick-popover">
          <button
            type="button"
            className="avatar-kick-action"
            onClick={handleKick}
            disabled={busy}
          >
            {busy ? "Kicking..." : "Kick player"}
          </button>
        </div>
      )}
    </div>
  );
}

export default AvatarKickControl;
