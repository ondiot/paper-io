import {
  useEffect,
  useMemo,
  useState
} from "react";

import { supabase } from "../lib/supabase";

import {
  submitGuesses,
  checkGuessingComplete,
  startReveal
} from "../game/rooms";

function GuessingScreen({
  room,
  player
}) {
  const [players, setPlayers] =
    useState([]);

  const [papers, setPapers] =
    useState([]);

  const [guesses, setGuesses] =
    useState({});

  const [finishedPlayers, setFinishedPlayers] =
    useState(new Set());

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [submitted, setSubmitted] =
    useState(false);


  /*
   * LOAD PLAYERS + PAPERS
   */

  useEffect(() => {
    if (!room?.id) return;

    let active = true;

    async function loadGame() {
      setLoading(true);

      const [
        playersResult,
        papersResult,
        assignmentsResult
      ] = await Promise.all([
        supabase
          .from("players")
          .select("*")
          .eq("room_id", room.id)
          .order("joined_at", {
            ascending: true
          }),

        supabase
          .from("papers")
          .select("*")
          .eq("room_id", room.id)
          .eq("round", room.round)
          .order("created_at", {
            ascending: true
          }),

        supabase
          .from("assignments")
          .select(
            "assigned_to,paper_id,guessed_player_id"
          )
          .eq("room_id", room.id)
          .eq("round", room.round)
      ]);

      if (!active) return;

      if (playersResult.error) {
        console.error(
          "Could not load players:",
          playersResult.error
        );
      }

      if (papersResult.error) {
        console.error(
          "Could not load papers:",
          papersResult.error
        );
      }

      if (assignmentsResult.error) {
        console.error(
          "Could not load guesses:",
          assignmentsResult.error
        );
      }

      const loadedPlayers =
        playersResult.data || [];

      const loadedPapers =
        papersResult.data || [];

      setPlayers(loadedPlayers);

      /*
       * Show every paper except
       * your own.
       */

      const otherPapers =
        loadedPapers.filter(
          (paper) =>
            paper.author_id !==
            player.id
        );

      setPapers(otherPapers);


      /*
       * RESTORE OUR GUESSES
       */

      const restoredGuesses = {};

      const ourAssignments =
        (
          assignmentsResult.data ||
          []
        ).filter(
          (assignment) =>
            assignment.assigned_to ===
            player.id
        );

      ourAssignments.forEach(
        (assignment) => {
          restoredGuesses[
            assignment.paper_id
          ] =
            assignment.guessed_player_id;
        }
      );

      setGuesses(
        restoredGuesses
      );

      /*
       * If we already submitted
       * every guess, mark ourselves
       * as finished.
       */

      if (
        otherPapers.length > 0 &&
        Object.keys(
          restoredGuesses
        ).length ===
          otherPapers.length
      ) {
        setSubmitted(true);

        setFinishedPlayers(
          (current) => {
            const next =
              new Set(current);

            next.add(player.id);

            return next;
          }
        );
      }

      /*
       * Determine which players have
       * completed all guesses.
       */

      const finished = new Set();

      for (
        const gamePlayer of
        loadedPlayers
      ) {
        const count =
          (
            assignmentsResult.data ||
            []
          ).filter(
            (assignment) =>
              assignment.assigned_to ===
              gamePlayer.id
          ).length;

        if (
          otherPapers.length > 0 &&
          count >=
            Math.max(
              0,
              loadedPapers.length - 1
            )
        ) {
          finished.add(
            gamePlayer.id
          );
        }
      }

      setFinishedPlayers(
        finished
      );

      setLoading(false);
    }

    loadGame();

    return () => {
      active = false;
    };
  }, [
    room?.id,
    room?.round,
    player?.id
  ]);


  /*
   * REALTIME ASSIGNMENT UPDATES
   */

  useEffect(() => {
    if (!room?.id) return;

    const channel =
      supabase
        .channel(
          `guessing-${room.id}-${room.round}`
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "assignments",
            filter: `room_id=eq.${room.id}`
          },
          handleAssignmentUpdate
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "assignments",
            filter: `room_id=eq.${room.id}`
          },
          handleAssignmentUpdate
        )
        .subscribe();

    function handleAssignmentUpdate(
      payload
    ) {
      const assignment =
        payload.new;

      if (
        assignment.round !==
        room.round
      ) {
        return;
      }

      /*
       * Count how many guesses this
       * player has submitted.
       */

      setFinishedPlayers(
        (current) => {
          const next =
            new Set(current);

          /*
           * We can't know the exact
           * count from this event alone,
           * so reload the assignments.
           */

          return next;
        }
      );

      reloadAssignments();
    }

    async function reloadAssignments() {
      const {
        data,
        error
      } = await supabase
        .from("assignments")
        .select(
          "assigned_to,paper_id,guessed_player_id"
        )
        .eq("room_id", room.id)
        .eq("round", room.round);

      if (error) {
        console.error(
          "Could not reload guesses:",
          error
        );

        return;
      }

      /*
       * Update our own guesses.
       */

      const ours = {};

      (data || [])
        .filter(
          (item) =>
            item.assigned_to ===
            player.id
        )
        .forEach(
          (item) => {
            ours[item.paper_id] =
              item.guessed_player_id;
          }
        );

      setGuesses(ours);

      /*
       * Determine finished players.
       */

      const finished =
        new Set();

      const required =
        Math.max(
          0,
          papers.length
        );

      players.forEach(
        (gamePlayer) => {
          const count =
            (data || []).filter(
              (item) =>
                item.assigned_to ===
                gamePlayer.id
            ).length;

          if (
            required > 0 &&
            count >= required
          ) {
            finished.add(
              gamePlayer.id
            );
          }
        }
      );

      setFinishedPlayers(
        finished
      );
    }

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    room?.id,
    room?.round,
    player?.id,
    papers.length,
    players
  ]);


  /*
   * SELECT GUESS
   */

  function selectGuess(
    paperId,
    authorId
  ) {
    if (submitted) {
      return;
    }

    setGuesses(
      (current) => ({
        ...current,
        [paperId]:
          authorId
      })
    );
  }


  /*
   * SUBMIT ALL GUESSES
   */

  async function handleSubmit() {
    if (
      submitting ||
      submitted
    ) {
      return;
    }

    if (
      Object.keys(guesses)
        .length !==
      papers.length
    ) {
      return;
    }

    setSubmitting(true);

    try {
      await submitGuesses({
        roomId: room.id,
        round: room.round,
        playerId: player.id,
        guesses
      });

      setSubmitted(true);

      setFinishedPlayers(
        (current) => {
          const next =
            new Set(current);

          next.add(player.id);

          return next;
        }
      );

      /*
       * Check whether everyone
       * has finished.
       */

      const complete =
        await checkGuessingComplete({
          roomId: room.id,
          round: room.round
        });

      if (complete) {
        // Score the round atomically BEFORE switching the room to Reveal.
        // This guarantees the first Reveal already shows the new scores.
        await startReveal(room.id);
      }

    } catch (error) {
      console.error(
        "Could not submit guesses:",
        error
      );

      alert(
        error?.message ||
        "Could not submit your guesses."
      );
    } finally {
      setSubmitting(false);
    }
  }


  /*
   * CALCULATE PROGRESS
   */

  const guessedCount =
    useMemo(
      () =>
        Object.keys(
          guesses
        ).length,
      [guesses]
    );


  if (!room || !player) {
    return null;
  }


  if (loading) {
    return (
      <section className="guessing-screen">
        <div className="guessing-loading">
          Loading papers...
        </div>
      </section>
    );
  }


  return (
    <section className="guessing-screen">
      <div className="guessing-card">

        {/* HEADER */}

        <div className="guessing-header">

          <div>
            <span className="writing-round">
              ROUND {room.round}
            </span>

            <h1>
              Whose paper is this?
            </h1>

            <p>
              Guess who wrote every paper.
            </p>
          </div>

        </div>


        {/* PLAYER STATUS */}

        <div className="guessing-players">

          <span className="guessing-players-label">
            Players
          </span>

          <div className="guessing-player-list">

            {players.map(
              (gamePlayer) => {

                const finished =
                  finishedPlayers.has(
                    gamePlayer.id
                  );

                const isYou =
                  gamePlayer.id ===
                  player.id;

                return (
                  <div
                    key={
                      gamePlayer.id
                    }
                    className={
                      "guessing-player" +
                      (
                        finished
                          ? " finished"
                          : ""
                      )
                    }
                  >

                    <div className="guessing-player-avatar">

                      <img
                        src={
                          "/assets/avatars/" +
                          gamePlayer.avatar
                        }
                        alt={
                          gamePlayer.name
                        }
                      />

                      {finished && (
                        <span className="guessing-player-check">
                          ✓
                        </span>
                      )}

                    </div>

                    <span>
                      {isYou
                        ? "You"
                        : gamePlayer.name}
                    </span>

                  </div>
                );
              }
            )}

          </div>
        </div>


        {/* PAPERS */}

        <div className="guessing-papers">

          {papers.length === 0 && (
            <div className="guessing-empty">
              No other papers found.
            </div>
          )}

          {papers.map(
            (
              paper,
              paperIndex
            ) => (

              <article
                className="guessing-paper"
                key={paper.id}
              >

                <div className="guessing-paper-number">
                  PAPER{" "}
                  {paperIndex + 1}
                </div>

                <div className="guessing-paper-content">
                  {paper.content}
                </div>

                <div className="guessing-options">

                  <div className="guessing-question">
                    Who wrote this?
                  </div>

                  {players
                    .filter(
                      (gamePlayer) =>
                        gamePlayer.id !==
                        player.id
                    )
                    .map(
                      (
                        gamePlayer
                      ) => {

                        const selected =
                          guesses[
                            paper.id
                          ] ===
                          gamePlayer.id;

                        return (
                          <button
                            type="button"
                            key={
                              gamePlayer.id
                            }
                            className={
                              selected
                                ? "guess-option selected"
                                : "guess-option"
                            }
                            onClick={() =>
                              selectGuess(
                                paper.id,
                                gamePlayer.id
                              )
                            }
                            disabled={
                              submitted
                            }
                          >

                            <div className="guess-option-avatar">

                              <img
                                src={
                                  "/assets/avatars/" +
                                  gamePlayer.avatar
                                }
                                alt={
                                  gamePlayer.name
                                }
                              />

                            </div>

                            <span>
                              {
                                gamePlayer.name
                              }
                            </span>

                            {selected && (
                              <b>
                                ✓
                              </b>
                            )}

                          </button>
                        );
                      }
                    )}

                </div>

              </article>
            )
          )}

        </div>


        {/* FOOTER */}

        <div className="guessing-footer">

          <span>
            {guessedCount} /{" "}
            {papers.length} guessed
          </span>

          <button
            type="button"
            className="guessing-submit"
            onClick={
              handleSubmit
            }
            disabled={
              submitted ||
              submitting ||
              papers.length === 0 ||
              guessedCount !==
                papers.length
            }
          >
            {submitting
              ? "Submitting..."
              : submitted
                ? "Guesses Submitted ✓"
                : "Submit Guesses →"}
          </button>

        </div>


        {submitted && (
          <div className="guessing-submitted-message">
            ✓ Your guesses are locked in. Waiting for everyone else...
          </div>
        )}

      </div>
    </section>
  );
}

export default GuessingScreen;