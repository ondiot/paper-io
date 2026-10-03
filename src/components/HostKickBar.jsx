import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { kickPlayer } from "../game/rooms";

function HostKickBar({ room, player, enabled = true }) {
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!enabled || !room?.id || !player?.is_host) return;

    let active = true;

    async function load() {
      const { data, error } = await supabase
        .from("players")
        .select("id,name,avatar,is_host")
        .eq("room_id", room.id)
        .order("joined_at", { ascending: true });

      if (!error && active) setPlayers(data || []);
    }

    load();

    const channel = supabase
      .channel(`host-kick-${room.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "players",
        filter: `room_id=eq.${room.id}`,
      }, (payload) => {
        setPlayers((current) => current.some((p) => p.id === payload.new.id)
          ? current
          : [...current, payload.new]);
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "players",
        filter: `room_id=eq.${room.id}`,
      }, (payload) => {
        setPlayers((current) => current.map((p) =>
          p.id === payload.new.id ? payload.new : p
        ));
      })
      .on("postgres_changes", {
        event: "DELETE",
        schema: "public",
        table: "players",
      }, (payload) => {
        setPlayers((current) => current.filter((p) => p.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [enabled, room?.id, player?.is_host]);

  if (!enabled || !room?.id || !player?.is_host || players.length < 2) {
    return null;
  }

  async function confirmKick() {
    if (!selected || busy) return;

    setBusy(true);
    try {
      await kickPlayer({
        targetPlayerId: selected.id,
        hostPlayerId: player.id,
      });
      setSelected(null);
    } catch (error) {
      console.error("Kick failed:", error);
      alert(error?.message || "Could not kick this player.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="host-kick-bar">
        <span className="host-kick-label">HOST • KICK</span>
        <div className="host-kick-players">
          {players.filter((item) => item.id !== player.id).map((item) => (
            <button
              key={item.id}
              type="button"
              className="host-kick-player"
              onClick={() => setSelected(item)}
              title={`Kick ${item.name}`}
            >
              <span className="host-kick-avatar">
                <img
                  src={`${import.meta.env.BASE_URL}assets/avatars/${item.avatar}`}
                  alt={item.name}
                  draggable="false"
                />
              </span>
              <span>{item.name}</span>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div className="kick-confirm-backdrop" onMouseDown={() => !busy && setSelected(null)}>
          <div className="kick-confirm-card" onMouseDown={(event) => event.stopPropagation()}>
            <div className="kick-confirm-avatar">
              <img
                src={`${import.meta.env.BASE_URL}assets/avatars/${selected.avatar}`}
                alt={selected.name}
              />
            </div>
            <h3>Kick {selected.name}?</h3>
            <p>They will be removed from the game immediately.</p>
            <div className="kick-confirm-actions">
              <button type="button" onClick={() => setSelected(null)} disabled={busy}>
                Cancel
              </button>
              <button type="button" className="danger" onClick={confirmKick} disabled={busy}>
                {busy ? "Kicking..." : "Kick Player"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default HostKickBar;
