import {
  useEffect,
  useState
} from "react";

import { supabase } from "../lib/supabase";

import {
  submitPaper,
  checkRoundComplete
} from "../game/rooms";
import { getRoundTopic } from "../game/topics";

function WritingScreen({
  room,
  player
}) {
  const [players, setPlayers] = useState([]);
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(
    room?.round_seconds || 60
  );
  const [submitting, setSubmitting] = useState(false);

  /*
   * LOAD PLAYERS
   */

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
        setPlayers(data || []);
      }
    }

    loadPlayers();

    return () => {
      active = false;
    };
  }, [room?.id]);


  /*
   * REALTIME PLAYER UPDATES
   */

  useEffect(() => {
    if (!room?.id) return;

    const channel = supabase
      .channel(
        `writing-players-${room.id}`
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${room.id}`
        },
        (payload) => {
          setPlayers((current) => {
            const exists = current.some(
              (item) =>
                item.id === payload.new.id
            );

            if (exists) {
              return current;
            }

            return [
              ...current,
              payload.new
            ];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${room.id}`
        },
        (payload) => {
          setPlayers((current) =>
            current.map((item) =>
              item.id === payload.new.id
                ? payload.new
                : item
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "postgres_changes",
          schema: "public",
          table: "players"
        },
        () => {}
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id]);


  /*
   * REALTIME PAPER SUBMISSIONS
   */

  const [submittedPlayers, setSubmittedPlayers] =
    useState(new Set());

  useEffect(() => {
    if (!room?.id) return;

    let active = true;

    async function loadSubmittedPapers() {
      const {
        data,
        error
      } = await supabase
        .from("papers")
        .select("author_id")
        .eq("room_id", room.id)
        .eq("round", room.round);

      if (error) {
        console.error(
          "Could not load submitted papers:",
          error
        );
        return;
      }

      if (!active) return;

      const ids = new Set(
        (data || []).map(
          (paper) => paper.author_id
        )
      );

      setSubmittedPlayers(ids);

      if (ids.has(player.id)) {
        setSubmitted(true);
      }
    }

    loadSubmittedPapers();

    const channel = supabase
      .channel(
        `writing-papers-${room.id}-${room.round}`
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "papers",
          filter: `room_id=eq.${room.id}`
        },
        async (payload) => {
          if (
            payload.new.round !== room.round
          ) {
            return;
          }

          setSubmittedPlayers(
            (current) => {
              const next = new Set(current);

              next.add(
                payload.new.author_id
              );

              return next;
            }
          );

          if (
            payload.new.author_id ===
            player.id
          ) {
            setSubmitted(true);
          }

          await tryFinishRound();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "papers",
          filter: `room_id=eq.${room.id}`
        },
        async (payload) => {
          if (
            payload.new.round !== room.round
          ) {
            return;
          }

          setSubmittedPlayers(
            (current) => {
              const next = new Set(current);

              next.add(
                payload.new.author_id
              );

              return next;
            }
          );

          await tryFinishRound();
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [
    room?.id,
    room?.round,
    player?.id
  ]);


  /*
   * CHECK WHETHER ROUND IS COMPLETE
   */

  async function tryFinishRound() {
    try {
      const complete =
        await checkRoundComplete(
          room.id,
          room.round
        );

      if (!complete) {
        return;
      }

      await supabase
        .from("rooms")
        .update({
          status: "guessing"
        })
        .eq("id", room.id)
        .eq("status", "writing");
    } catch (error) {
      console.error(
        "Could not finish round:",
        error
      );
    }
  }


  /*
   * TIMER
   */

  useEffect(() => {
    if (!room?.writing_ends_at) {
      return;
    }

    function updateTimer() {
      const endTime =
        new Date(
          room.writing_ends_at
        ).getTime();

      const remaining =
        Math.max(
          0,
          Math.ceil(
            (endTime - Date.now()) /
              1000
          )
        );

      setTimeLeft(remaining);

      if (remaining <= 0) {
        handleTimeUp();
      }
    }

    updateTimer();

    const timer = setInterval(
      updateTimer,
      250
    );

    return () => {
      clearInterval(timer);
    };
  }, [
    room?.writing_ends_at
  ]);


  /*
   * TIME UP
   */

  async function handleTimeUp() {
    if (submitted || submitting) {
      return;
    }

    const content =
      text.trim() ||
      "(No writing submitted)";

    try {
      setSubmitting(true);

      await submitPaper({
        roomId: room.id,
        playerId: player.id,
        round: room.round,
        content,
        autoFilled: true
      });

      setSubmitted(true);

      await tryFinishRound();
    } catch (error) {
      console.error(
        "Automatic submission failed:",
        error
      );
    } finally {
      setSubmitting(false);
    }
  }


  /*
   * MANUAL SUBMIT
   */

  async function handleSubmit() {
    if (
      submitted ||
      submitting ||
      !text.trim() ||
      timeLeft <= 0
    ) {
      return;
    }

    try {
      setSubmitting(true);

      await submitPaper({
        roomId: room.id,
        playerId: player.id,
        round: room.round,
        content: text,
        autoFilled: false
      });

      setSubmitted(true);

      setSubmittedPlayers(
        (current) => {
          const next = new Set(current);

          next.add(player.id);

          return next;
        }
      );

      await tryFinishRound();
    } catch (error) {
      console.error(
        "Writing submission failed:",
        error
      );

      alert(
        error?.message ||
        "Could not submit your writing."
      );
    } finally {
      setSubmitting(false);
    }
  }


  if (!room || !player) {
    return null;
  }

  const isExtempore = room.topic_mode === "extempore";
  const roundTopic = isExtempore
    ? getRoundTopic(room.id, room.round)
    : null;

  return (
    <section className="writing-screen">
      <div className="writing-card">

        <div className="writing-header">
          <div>
            <span className="writing-round">
              ROUND {room.round} OF {room.rounds || 3}
            </span>

            <h1>
              Write something
            </h1>

            <p>
              Let your imagination take over.
            </p>
          </div>

          <div
            className={
              timeLeft <= 15
                ? "writing-timer danger"
                : "writing-timer"
            }
          >
            <span>
              {timeLeft}
            </span>

            <small>
              SEC
            </small>
          </div>
        </div>


        {/* PLAYER STATUS STRIP */}

        <div className="writing-players">

          <div className="writing-players-label">
            Players
          </div>

          <div className="writing-player-list">

            {players.map(
              (writingPlayer) => {
                const hasSubmitted =
                  submittedPlayers.has(
                    writingPlayer.id
                  );

                const isYou =
                  writingPlayer.id ===
                  player.id;

                return (
                  <div
                    key={
                      writingPlayer.id
                    }
                    className={
                      "writing-player-status" +
                      (hasSubmitted
                        ? " submitted"
                        : "") +
                      (isYou
                        ? " you"
                        : "")
                    }
                  >

                    <div className="writing-status-avatar">

                      <img
                        src={
                          `${import.meta.env.BASE_URL}assets/avatars/` +
                          writingPlayer.avatar
                        }
                        alt={
                          writingPlayer.name
                        }
                      />

                      {hasSubmitted && (
                        <span className="writing-status-check">
                          ✓
                        </span>
                      )}

                    </div>

                    <span className="writing-status-name">
                      {isYou
                        ? "You"
                        : writingPlayer.name}
                    </span>

                    <span className="writing-status-score">
                      {writingPlayer.score || 0} pts
                    </span>

                  </div>
                );
              }
            )}

          </div>
        </div>


        {/* YOUR PLAYER */}

        <div className="writing-player">

          <div className="writing-player-avatar">
            <img
              src={
                `${import.meta.env.BASE_URL}assets/avatars/` +
                player.avatar
              }
              alt={player.name}
            />
          </div>

          <div>
            <strong>
              {player.name}
            </strong>

            <span>
              Your paper
            </span>
          </div>

        </div>


        {/* WRITING AREA */}

        <div className="writing-area">

          {isExtempore && (
            <div className="writing-topic-card">
              <span>EXTEMPORE TOPIC</span>
              <strong>{roundTopic}</strong>
            </div>
          )}

          <textarea
            value={text}
            onChange={(event) =>
              setText(
                event.target.value
              )
            }
            placeholder="Start writing..."
            disabled={
              submitted ||
              submitting ||
              timeLeft <= 0
            }
            maxLength={2000}
            autoFocus
          />

          <div className="writing-footer">

            <span>
              {text.length} / 2000
            </span>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                submitted ||
                submitting ||
                !text.trim() ||
                timeLeft <= 0
              }
            >
              {submitting
                ? "Submitting..."
                : submitted
                  ? "Submitted ✓"
                  : "Submit →"}
            </button>

          </div>
        </div>


        {/* SUBMITTED MESSAGE */}

        {submitted && (
          <div className="writing-submitted">

            <span className="writing-submitted-icon">
              ✓
            </span>

            <div>
              <strong>
                Writing submitted
              </strong>

              <p>
                Waiting for the other players...
              </p>
            </div>

          </div>
        )}

      </div>
    </section>
  );
}

export default WritingScreen;