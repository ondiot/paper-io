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
  const [players, setPlayers] = useState([]);
  const [papers, setPapers] = useState([]);
  const [guesses, setGuesses] = useState({});
  const [finishedPlayers, setFinishedPlayers] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [currentPaperIndex, setCurrentPaperIndex] = useState(0);

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
          .order("joined_at", { ascending: true }),

        supabase
          .from("papers")
          .select("*")
          .eq("room_id", room.id)
          .eq("round", room.round)
          .order("created_at", { ascending: true }),

        supabase
          .from("assignments")
          .select("assigned_to,paper_id,guessed_player_id")
          .eq("room_id", room.id)
          .eq("round", room.round)
      ]);

      if (!active) return;

      if (playersResult.error) {
        console.error("Could not load players:", playersResult.error);
      }

      if (papersResult.error) {
        console.error("Could not load papers:", papersResult.error);
      }

      if (assignmentsResult.error) {
        console.error("Could not load guesses:", assignmentsResult.error);
      }

      const loadedPlayers = playersResult.data || [];
      const loadedPapers = papersResult.data || [];

      setPlayers(loadedPlayers);

      const otherPapers = loadedPapers.filter(
        (paper) => paper.author_id !== player.id
      );

      setPapers(otherPapers);

      const restoredGuesses = {};

      (assignmentsResult.data || [])
        .filter((assignment) => assignment.assigned_to === player.id)
        .forEach((assignment) => {
          restoredGuesses[assignment.paper_id] =
            assignment.guessed_player_id;
        });

      setGuesses(restoredGuesses);

      const alreadySubmitted =
        otherPapers.length > 0 &&
        Object.keys(restoredGuesses).length === otherPapers.length;

      if (alreadySubmitted) {
        setSubmitted(true);
        setCurrentPaperIndex(Math.max(0, otherPapers.length - 1));
      } else {
        const firstUnanswered = otherPapers.findIndex(
          (paper) => !restoredGuesses[paper.id]
        );

        setCurrentPaperIndex(
          firstUnanswered === -1 ? 0 : firstUnanswered
        );
      }

      const finished = new Set();
      const requiredGuesses = Math.max(0, loadedPapers.length - 1);

      if (requiredGuesses > 0) {
        for (const gamePlayer of loadedPlayers) {
          const count = (assignmentsResult.data || []).filter(
            (assignment) => assignment.assigned_to === gamePlayer.id
          ).length;

          if (count >= requiredGuesses) {
            finished.add(gamePlayer.id);
          }
        }
      }

      setFinishedPlayers(finished);
      setLoading(false);
    }

    loadGame();

    return () => {
      active = false;
    };
  }, [room?.id, room?.round, player?.id]);

  useEffect(() => {
    if (!room?.id) return;

    const channel = supabase
      .channel(`guessing-${room.id}-${room.round}`)
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

    function handleAssignmentUpdate(payload) {
      if (payload.new.round !== room.round) return;
      reloadAssignments();
    }

    async function reloadAssignments() {
      const { data, error } = await supabase
        .from("assignments")
        .select("assigned_to,paper_id,guessed_player_id")
        .eq("room_id", room.id)
        .eq("round", room.round);

      if (error) {
        console.error("Could not reload guesses:", error);
        return;
      }

      const ours = {};

      (data || [])
        .filter((item) => item.assigned_to === player.id)
        .forEach((item) => {
          ours[item.paper_id] = item.guessed_player_id;
        });

      setGuesses((current) => {
        if (submitted) return current;
        return ours;
      });

      const finished = new Set();
      const required = Math.max(0, papers.length);

      if (required > 0) {
        players.forEach((gamePlayer) => {
          const count = (data || []).filter(
            (item) => item.assigned_to === gamePlayer.id
          ).length;

          if (count >= required) {
            finished.add(gamePlayer.id);
          }
        });
      }

      setFinishedPlayers(finished);
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    room?.id,
    room?.round,
    player?.id,
    papers.length,
    players,
    submitted
  ]);

  function selectGuess(paperId, authorId) {
    if (submitted || submitting) return;

    setGuesses((current) => ({
      ...current,
      [paperId]: authorId
    }));
  }

  function handleNextPaper() {
    if (submitted || submitting) return;

    const currentPaper = papers[currentPaperIndex];

    if (!currentPaper || !guesses[currentPaper.id]) return;

    if (currentPaperIndex < papers.length - 1) {
      setCurrentPaperIndex((index) => index + 1);
    }
  }

  async function handleSubmit() {
    if (submitting || submitted) return;

    if (Object.keys(guesses).length !== papers.length) return;

    setSubmitting(true);

    try {
      await submitGuesses({
        roomId: room.id,
        round: room.round,
        playerId: player.id,
        guesses
      });

      setSubmitted(true);
      setCurrentPaperIndex(Math.max(0, papers.length - 1));

      setFinishedPlayers((current) => {
        const next = new Set(current);
        next.add(player.id);
        return next;
      });

      const complete = await checkGuessingComplete({
        roomId: room.id,
        round: room.round
      });

      if (complete) {
        await startReveal(room.id);
      }
    } catch (error) {
      console.error("Could not submit guesses:", error);

      alert(
        error?.message ||
        "Could not submit your guesses."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const guessedCount = useMemo(
    () => Object.keys(guesses).length,
    [guesses]
  );

  const currentPaper = papers[currentPaperIndex];
  const isLastPaper =
    currentPaperIndex === papers.length - 1;

  const currentPaperAnswered =
    Boolean(currentPaper && guesses[currentPaper.id]);

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
        <div className="guessing-header">
          <div>
            <span className="writing-round">
              ROUND {room.round}
            </span>

            <h1>Whose paper is this?</h1>

            <p>
              Guess who wrote each paper. Your choices are submitted together at the end.
            </p>
          </div>
        </div>

        <div className="guessing-players">
          <span className="guessing-players-label">
            Players
          </span>

          <div className="guessing-player-list">
            {players.map((gamePlayer) => {
              const finished = finishedPlayers.has(gamePlayer.id);
              const isYou = gamePlayer.id === player.id;

              return (
                <div
                  key={gamePlayer.id}
                  className={
                    "guessing-player" +
                    (finished ? " finished" : "")
                  }
                >
                  <div className="guessing-player-avatar">
                    <img
                      src={
                        `${import.meta.env.BASE_URL}assets/avatars/` +
                        gamePlayer.avatar
                      }
                      alt={gamePlayer.name}
                    />

                    {finished && (
                      <span className="guessing-player-check">
                        ✓
                      </span>
                    )}
                  </div>

                  <span>
                    {isYou ? "You" : gamePlayer.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {papers.length === 0 ? (
          <div className="guessing-empty">
            No other papers found.
          </div>
        ) : submitted ? (
          <div className="guessing-submitted-panel">
            <div className="guessing-paper-number">
              ALL PAPERS SUBMITTED
            </div>

            <div className="guessing-submitted-message">
              ✓ Your guesses are locked in. Waiting for everyone else...
            </div>
          </div>
        ) : (
          <>
            <div className="guessing-paper-progress">
              <span>
                PAPER {currentPaperIndex + 1} OF {papers.length}
              </span>

              <span style={{ marginLeft: "1rem" }}>
                {guessedCount} / {papers.length} guessed
              </span>
            </div>

            <article
              className="guessing-paper"
              key={currentPaper.id}
            >
              <div className="guessing-paper-number">
                PAPER {currentPaperIndex + 1}
              </div>

              <div className="guessing-paper-content">
                {currentPaper.content}
              </div>

              <div className="guessing-options">
                <div className="guessing-question">
                  Who wrote this?
                </div>

                {players
                  .filter(
                    (gamePlayer) =>
                      gamePlayer.id !== player.id
                  )
                  .map((gamePlayer) => {
                    const selected =
                      guesses[currentPaper.id] ===
                      gamePlayer.id;

                    return (
                      <button
                        type="button"
                        key={gamePlayer.id}
                        className={
                          selected
                            ? "guess-option selected"
                            : "guess-option"
                        }
                        onClick={() =>
                          selectGuess(
                            currentPaper.id,
                            gamePlayer.id
                          )
                        }
                        disabled={submitting}
                      >
                        <div className="guess-option-avatar">
                          <img
                            src={
                              `${import.meta.env.BASE_URL}assets/avatars/` +
                              gamePlayer.avatar
                            }
                            alt={gamePlayer.name}
                          />
                        </div>

                        <span>
                          {gamePlayer.name}
                        </span>

                        {selected && <b>✓</b>}
                      </button>
                    );
                  })}
              </div>
            </article>

            <div className="guessing-footer">
              <span>
                {currentPaperAnswered
                  ? isLastPaper
                    ? "Ready to submit"
                    : "Guess locked for this paper"
                  : "Choose a player to continue"}
              </span>

              {isLastPaper ? (
                <button
                  type="button"
                  className="guessing-submit"
                  onClick={handleSubmit}
                  disabled={
                    submitting ||
                    !currentPaperAnswered ||
                    guessedCount !== papers.length
                  }
                >
                  {submitting
                    ? "Submitting..."
                    : "Submit Guesses →"}
                </button>
              ) : (
                <button
                  type="button"
                  className="guessing-submit"
                  onClick={handleNextPaper}
                  disabled={
                    submitting ||
                    !currentPaperAnswered
                  }
                >
                  Next Paper →
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default GuessingScreen;
