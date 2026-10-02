import {
  useEffect,
  useState
} from "react";

import { supabase } from "../lib/supabase";

import {
  updateHeartbeat,
  kickPlayer,
  startGame
} from "../game/rooms";


function Lobby({
  room,
  player,
  onLeave,
  onKicked
}) {

  const [players, setPlayers] =
    useState([]);

  const [kickingPlayer, setKickingPlayer] =
    useState(null);

  const [startingGame, setStartingGame] =
    useState(false);


  // ========================================
  // LOAD + REALTIME PLAYERS
  // ========================================

  useEffect(() => {

    if (!room?.id) return;

    let active = true;


    async function loadPlayers() {

      const {
        data,
        error
      } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", room.id)
        .order("joined_at", {
          ascending: true
        });


      if (error) {

        console.error(
          "Could not load players:",
          error
        );

        return;
      }


      if (active) {

        setPlayers(
          data || []
        );
      }
    }


    loadPlayers();


    const channel =
      supabase
        .channel(
          `lobby-${room.id}-${player.id}`
        )

        // PLAYER JOINED
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "players",
            filter:
              `room_id=eq.${room.id}`
          },
          (payload) => {

            setPlayers(
              (current) => {

                const exists =
                  current.some(
                    (item) =>
                      item.id ===
                      payload.new.id
                  );


                if (exists) {
                  return current;
                }


                return [
                  ...current,
                  payload.new
                ];
              }
            );
          }
        )

        // PLAYER UPDATED
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "players",
            filter:
              `room_id=eq.${room.id}`
          },
          (payload) => {

            setPlayers(
              (current) =>
                current.map(
                  (item) =>
                    item.id ===
                    payload.new.id
                      ? payload.new
                      : item
                )
            );
          }
        )

        // PLAYER LEFT / KICKED
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "players"
          },
          (payload) => {

            const deletedId =
              payload.old.id;


            setPlayers(
              (current) =>
                current.filter(
                  (item) =>
                    item.id !==
                    deletedId
                )
            );


            if (
              deletedId ===
              player.id
            ) {

              onKicked();
            }
          }
        )

        .subscribe();


    return () => {

      active = false;

      supabase.removeChannel(
        channel
      );
    };

  }, [
    room?.id,
    player?.id,
    onKicked
  ]);


  // ========================================
  // HEARTBEAT
  // ========================================

  useEffect(() => {

    if (!player?.id) return;


    updateHeartbeat(
      player.id
    );


    const heartbeat =
      setInterval(() => {

        updateHeartbeat(
          player.id
        );

      }, 10000);


    return () => {

      clearInterval(
        heartbeat
      );
    };

  }, [
    player?.id
  ]);


  // ========================================
  // COPY ROOM CODE
  // ========================================

  async function copyRoomCode() {

    try {

      await navigator.clipboard.writeText(
        room.code
      );

    } catch (error) {

      console.error(
        "Could not copy room code:",
        error
      );
    }
  }


  // ========================================
  // KICK PLAYER
  // ========================================

  async function handleKick(
    targetPlayer
  ) {

    if (
      kickingPlayer ||
      !player?.is_host ||
      targetPlayer.id ===
        player.id
    ) {
      return;
    }


    setKickingPlayer(
      targetPlayer.id
    );


    try {

      await kickPlayer({
        targetPlayerId:
          targetPlayer.id,

        hostPlayerId:
          player.id
      });

    } catch (error) {

      console.error(
        "Kick failed:",
        error
      );

    } finally {

      setKickingPlayer(
        null
      );
    }
  }


  // ========================================
  // START GAME
  // ========================================

  async function handleStartGame() {

    if (
      startingGame ||
      !player?.is_host ||
      !room?.id
    ) {
      return;
    }


    setStartingGame(
      true
    );


    try {

      await startGame(
        room.id,
        player.id
      );

    } catch (error) {

      console.error(
        "Start game failed:",
        error
      );


      alert(
        error?.message ||
        "Could not start the game."
      );

    } finally {

      setStartingGame(
        false
      );
    }
  }


  // ========================================
  // SAFETY
  // ========================================

  if (!room || !player) {
    return null;
  }


  // ========================================
  // UI
  // ========================================

  return (

    <section className="lobby-screen">

      <div className="lobby-card">


        {/* HEADER */}

        <div className="lobby-header">

          <div>

            <h1>
              Game Lobby
            </h1>

            <p>
              Waiting for players to join.
            </p>

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

          <span>
            ROOM CODE
          </span>


          <strong>
            {room.code}
          </strong>


          <button
            type="button"
            onClick={
              copyRoomCode
            }
          >
            Copy Code
          </button>

        </div>


        {/* PLAYERS */}

        <div className="lobby-section">

          <div className="lobby-section-title">

            <h2>
              Players
            </h2>


            <span>

              {players.length}{" "}

              {players.length === 1
                ? "player"
                : "players"}

            </span>

          </div>


          <div className="lobby-players">

            {players.map(
              (lobbyPlayer) => (

                <div
                  className="lobby-player"
                  key={
                    lobbyPlayer.id
                  }
                >

                  <div className="lobby-player-avatar">

                    <img
                      src={
                        "/assets/avatars/" +
                        lobbyPlayer.avatar
                      }
                      alt={
                        lobbyPlayer.name
                      }
                    />

                  </div>


                  <div className="lobby-player-info">

                    <strong>

                      {lobbyPlayer.name}


                      {lobbyPlayer.id ===
                        player.id && (

                        <span className="you-label">
                          YOU
                        </span>

                      )}

                    </strong>


                    <span>

                      {lobbyPlayer.is_host
                        ? "Host"
                        : "Player"}

                    </span>

                  </div>


                  <div className="lobby-player-status">

                    {lobbyPlayer.is_host
                      ? "Host"
                      : "Ready"}

                  </div>


                  {player.is_host &&
                    lobbyPlayer.id !==
                      player.id && (

                    <button
                      type="button"
                      className="lobby-kick-button"
                      onClick={() =>
                        handleKick(
                          lobbyPlayer
                        )
                      }
                      disabled={
                        kickingPlayer ===
                        lobbyPlayer.id
                      }
                    >

                      {kickingPlayer ===
                      lobbyPlayer.id
                        ? "..."
                        : "Kick"}

                    </button>

                  )}

                </div>

              )
            )}

          </div>

        </div>


        {/* WAITING */}

        <div className="lobby-waiting">

          <div className="lobby-waiting-dot" />

          <span>

            {players.length < 2
              ? "Waiting for other players..."
              : "Everyone is ready."}

          </span>

        </div>


        {/* START GAME */}

        {player.is_host && (

          <button
            type="button"
            className="lobby-start-button"
            onClick={
              handleStartGame
            }
            disabled={
              startingGame ||
              players.length < 2
            }
          >

            {startingGame
              ? "Starting..."
              : players.length < 2
                ? "Waiting for players..."
                : "Start Game"}

          </button>

        )}

      </div>

    </section>

  );
}


export default Lobby;