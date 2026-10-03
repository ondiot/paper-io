import { useState } from "react";
import { kickPlayer } from "../game/rooms";

function InlineKickButton({ room, hostPlayer, targetPlayer }) {
  const [busy, setBusy] = useState(false);

  if (
    !room?.id ||
    !hostPlayer?.is_host ||
    !targetPlayer?.id ||
    targetPlayer.id === hostPlayer.id
  ) {
    return null;
  }

  async function handleKick() {
    if (busy) return;

    const confirmed = window.confirm(
      `Kick ${targetPlayer.name} from the game?`
    );

    if (!confirmed) return;

    setBusy(true);

    try {
      await kickPlayer({
        targetPlayerId: targetPlayer.id,
        hostPlayerId: hostPlayer.id,
      });
    } catch (error) {
      console.error("Kick failed:", error);
      alert(error?.message || "Could not kick this player.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className="inline-kick-button"
      onClick={handleKick}
      disabled={busy}
      title={`Kick ${targetPlayer.name}`}
    >
      {busy ? "..." : "Kick"}
    </button>
  );
}

export default InlineKickButton;
