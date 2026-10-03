import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { startGame, updateRoomSettings, updateHeartbeat } from "../game/rooms";
import AvatarKickControl from "./InlineKickButton";

function Lobby({ room, player, onKicked }) {
  const [players, setPlayers] = useState([]);
  const [settings, setSettings] = useState({
    roundTime: room?.round_seconds || 60,
    rounds: room?.rounds || 3,
    topicMode: room?.topic_mode || "builtin",
  });
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!room?.id) return;
    let active = true;

    async function loadPlayers() {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", room.id)
        .order("joined_at", { ascending: true });
      if (!error && active) setPlayers(data || []);
    }

    loadPlayers();

    const channel = supabase
      .channel(`lobby-${room.id}-${player.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "players", filter: `room_id=eq.${room.id}`,
      }, (payload) => {
        setPlayers((current) => current.some((p) => p.id === payload.new.id) ? current : [...current, payload.new]);
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "players", filter: `room_id=eq.${room.id}`,
      }, (payload) => {
        setPlayers((current) => current.map((p) => p.id === payload.new.id ? payload.new : p));
      })
      .on("postgres_changes", {
        event: "DELETE", schema: "public", table: "players",
      }, (payload) => {
        setPlayers((current) => current.filter((p) => p.id !== payload.old.id));
        if (payload.old.id === player.id) onKicked();
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [room?.id, player?.id, onKicked]);

  useEffect(() => {
    if (!room?.id) return;
    setSettings({
      roundTime: room.round_seconds || 60,
      rounds: room.rounds || 3,
      topicMode: room.topic_mode || "builtin",
    });
  }, [room?.round_seconds, room?.rounds, room?.topic_mode]);

  useEffect(() => {
    if (!player?.id) return;
    updateHeartbeat(player.id);
    const timer = setInterval(() => updateHeartbeat(player.id), 10000);
    return () => clearInterval(timer);
  }, [player?.id]);

  async function changeSetting(key, value) {
    if (!player?.is_host || saving) return;

    const next = { ...settings, [key]: value };
    setSettings(next);
    setSaving(true);

    try {
      await updateRoomSettings({
        roomId: room.id,
        hostPlayerId: player.id,
        roundTime: next.roundTime,
        rounds: next.rounds,
        topicMode: next.topicMode,
      });
    } catch (error) {
      console.error("Could not save settings:", error);
      alert(error?.message || "Could not save game settings.");
    } finally {
      setSaving(false);
    }
  }

  async function copyRoomCode() {
    try {
      await navigator.clipboard.writeText(room.code);
    } catch (error) {
      console.error("Could not copy room code:", error);
    }
  }

  async function handleStart() {
    if (!player?.is_host || starting || players.length < 2) return;
    setStarting(true);
    try {
      await startGame(room.id, player.id);
    } catch (error) {
      console.error("Start game failed:", error);
      alert(error?.message || "Could not start the game.");
    } finally {
      setStarting(false);
    }
  }

  if (!room || !player) return null;

  return (
    <section className="lobby-screen">
      <div className="lobby-card lobby-combined-card">
        <header className="lobby-header">
          <div>
            <span className="lobby-eyebrow">PAPER.IO</span>
            <h1>Game Lobby</h1>
            <p>{player.is_host ? "Set the rules, then start the game." : "Waiting for the host to start the game."}</p>
          </div>
        </header>

        <div className="room-code-box">
          <span>ROOM CODE</span>
          <strong>{room.code}</strong>
          <button type="button" onClick={copyRoomCode}>Copy Code</button>
        </div>

        <div className="lobby-combined-grid">
          <section className="lobby-panel">
            <div className="lobby-section-title">
              <h2>Game settings</h2>
              <span>{player.is_host ? (saving ? "Saving..." : "Editable") : "Read only"}</span>
            </div>

            <div className="lobby-setting-list">
              <label className="lobby-setting-row">
                <span><b>Round time</b><small>Writing time per round</small></span>
                <select disabled={!player.is_host} value={settings.roundTime} onChange={(e) => changeSetting("roundTime", Number(e.target.value))}>
                  <option value={30}>30 seconds</option>
                  <option value={45}>45 seconds</option>
                  <option value={60}>60 seconds</option>
                  <option value={90}>90 seconds</option>
                  <option value={120}>120 seconds</option>
                </select>
              </label>

              <label className="lobby-setting-row">
                <span><b>Rounds</b><small>Total game rounds</small></span>
                <select disabled={!player.is_host} value={settings.rounds} onChange={(e) => changeSetting("rounds", Number(e.target.value))}>
                  <option value={1}>1 round</option>
                  <option value={2}>2 rounds</option>
                  <option value={3}>3 rounds</option>
                  <option value={4}>4 rounds</option>
                  <option value={5}>5 rounds</option>
                </select>
              </label>

              <label className="lobby-setting-row">
                <span><b>Topic mode</b><small>How writing prompts work</small></span>
                <select disabled={!player.is_host} value={settings.topicMode} onChange={(e) => changeSetting("topicMode", e.target.value)}>
                  <option value="builtin">Built-in</option>
                  <option value="extempore">Extempore</option>
                  <option value="custom">Custom</option>
                  <option value="freestyle">Freestyle</option>
                </select>
              </label>
            </div>

            {!player.is_host && <div className="lobby-readonly-note">Only the host can change these settings.</div>}
          </section>

          <section className="lobby-panel">
            <div className="lobby-section-title">
              <h2>Players</h2>
              <span>{players.length}/8</span>
            </div>

            <div className="lobby-players">
              {players.map((item) => (
                <div className="lobby-player" key={item.id}>
                  <AvatarKickControl room={room} hostPlayer={player} targetPlayer={item}>
                    <div className="lobby-player-avatar">
                      <img src={`${import.meta.env.BASE_URL}assets/avatars/${item.avatar}`} alt={item.name} draggable="false" />
                    </div>
                  </AvatarKickControl>
                  <div className="lobby-player-info">
                    <strong>{item.name}{item.id === player.id && <span className="you-label">YOU</span>}</strong>
                    <span>{item.is_host ? "Host" : "Player"}</span>

                  </div>
                  <div className="lobby-player-status">{item.is_host ? "Host" : "Ready"}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="lobby-waiting">
          <div className="lobby-waiting-dot" />
          <span>{players.length < 2 ? "Waiting for at least one more player..." : `${players.length} players are in the room.`}</span>
        </div>

        {player.is_host && (
          <button type="button" className="lobby-start-button" onClick={handleStart} disabled={starting || saving || players.length < 2}>
            {starting ? "Starting..." : saving ? "Saving settings..." : players.length < 2 ? "Waiting for players..." : "Start Game →"}
          </button>
        )}
      </div>
    </section>
  );
}

export default Lobby;
