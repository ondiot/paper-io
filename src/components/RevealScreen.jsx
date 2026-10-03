import {
  useEffect,
  useState
} from "react";

import { supabase } from "../lib/supabase";

import {
  startNextRound
} from "../game/rooms";

function RevealScreen({
  room,
  player
}) {
  const [players, setPlayers] =
    useState([]);

  const [papers, setPapers] =
    useState([]);

  const [assignments, setAssignments] =
    useState([]);

  const [selectedPaper, setSelectedPaper] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [secondsLeft, setSecondsLeft] =
    useState(15);

  const [startingNextRound, setStartingNextRound] =
    useState(false);

  /* =========================================================
     LOAD REVEAL DATA
  ========================================================= */

  useEffect(() => {
    if (
      !room?.id ||
      !room?.round
    ) {
      return;
    }

    let cancelled = false;

    async function loadReveal() {
      try {
        setLoading(true);
        setErrorMessage("");

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
            .select("*")
            .eq("room_id", room.id)
            .eq("round", room.round)
        ]);

        if (
          playersResult.error
        ) {
          throw playersResult.error;
        }

        if (
          papersResult.error
        ) {
          throw papersResult.error;
        }

        if (
          assignmentsResult.error
        ) {
          throw assignmentsResult.error;
        }

        if (cancelled) {
          return;
        }

        setPlayers(
          playersResult.data || []
        );

        setPapers(
          papersResult.data || []
        );

        setAssignments(
          assignmentsResult.data || []
        );

        setSelectedPaper(0);

      } catch (error) {
        console.error(
          "Reveal loading failed:",
          error
        );

        if (!cancelled) {
          setErrorMessage(
            error?.message ||
            "Could not load the reveal."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReveal();

    return () => {
      cancelled = true;
    };
  }, [
    room?.id,
    room?.round
  ]);

  /* =========================================================
     REALTIME PLAYER SCORE UPDATES
  ========================================================= */

  useEffect(() => {
    if (!room?.id) {
      return;
    }

    const channel =
      supabase
        .channel(
          `reveal-scores-${room.id}`
        )
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
              (currentPlayers) =>
                currentPlayers.map(
                  (existingPlayer) =>
                    existingPlayer.id ===
                    payload.new.id
                      ? payload.new
                      : existingPlayer
                )
            );
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [room?.id]);

  /* =========================================================
     REALTIME ASSIGNMENTS
  ========================================================= */

  useEffect(() => {
    if (
      !room?.id ||
      !room?.round
    ) {
      return;
    }

    const channel =
      supabase
        .channel(
          `reveal-assignments-${room.id}-${room.round}`
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "assignments",
            filter:
              `room_id=eq.${room.id}`
          },
          (payload) => {
            if (
              payload.new.round !==
              room.round
            ) {
              return;
            }

            setAssignments(
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
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    room?.id,
    room?.round
  ]);

  /* =========================================================
     COUNTDOWN
  ========================================================= */

  useEffect(() => {
    if (
      !room?.writing_ends_at
    ) {
      setSecondsLeft(15);
      return;
    }

    function updateCountdown() {
      const end =
        new Date(
          room.writing_ends_at
        ).getTime();

      if (Number.isNaN(end)) {
        setSecondsLeft(15);
        return;
      }

      const remaining =
        Math.max(
          0,
          Math.ceil(
            (end - Date.now()) /
              1000
          )
        );

      setSecondsLeft(
        remaining
      );
    }

    updateCountdown();

    const interval =
      setInterval(
        updateCountdown,
        250
      );

    return () => {
      clearInterval(
        interval
      );
    };
  }, [
    room?.writing_ends_at
  ]);

  /* =========================================================
     START NEXT ROUND
  ========================================================= */

  useEffect(() => {
    if (
      !room?.id ||
      !player?.id ||
      !player?.is_host ||
      secondsLeft > 0 ||
      startingNextRound
    ) {
      return;
    }

    let cancelled = false;

    async function advanceRound() {
      try {
        setStartingNextRound(
          true
        );

        await startNextRound(
          room.id,
          player.id
        );

      } catch (error) {
        console.error(
          "Could not start next round:",
          error
        );

        if (!cancelled) {
          setStartingNextRound(
            false
          );
        }
      }
    }

    advanceRound();

    return () => {
      cancelled = true;
    };
  }, [
    secondsLeft,
    room?.id,
    player?.id,
    player?.is_host,
    startingNextRound
  ]);

  /* =========================================================
     LOADING
  ========================================================= */

  if (
    !room ||
    !player
  ) {
    return (
      <section className="reveal-screen">
        <div className="reveal-loading">
          <h1>
            Loading...
          </h1>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="reveal-screen">
        <div className="reveal-loading">
          <div className="reveal-loading-dot" />

          <h1>
            Revealing...
          </h1>

          <p>
            Finding out who wrote what.
          </p>
        </div>
      </section>
    );
  }

  /* =========================================================
     ERROR
  ========================================================= */

  if (errorMessage) {
    return (
      <section className="reveal-screen">
        <div className="reveal-loading">
          <h1>
            Reveal Error
          </h1>

          <p>
            {errorMessage}
          </p>
        </div>
      </section>
    );
  }

  /* =========================================================
     NO PAPERS
  ========================================================= */

  if (papers.length === 0) {
    return (
      <section className="reveal-screen">
        <div className="reveal-loading">
          <h1>
            No papers found
          </h1>

          <p>
            There are no papers for this round.
          </p>
        </div>
      </section>
    );
  }

  /* =========================================================
     CURRENT PAPER
  ========================================================= */

  const safePaperIndex =
    Math.min(
      Math.max(
        selectedPaper,
        0
      ),
      papers.length - 1
    );

  const paper =
    papers[safePaperIndex];

  const author =
    players.find(
      (item) =>
        item.id ===
        paper.author_id
    );

  const paperGuesses =
    assignments.filter(
      (item) =>
        item.paper_id ===
        paper.id
    );

  const isLastRound =
    room.round >=
    (room.rounds || 3);

  const roundStats = players.map((roundPlayer) => {
    const guesses = assignments.filter(
      (item) => item.assigned_to === roundPlayer.id
    );
    const correct = guesses.filter((item) => {
      const paper = papers.find((p) => p.id === item.paper_id);
      return paper && item.guessed_player_id === paper.author_id;
    }).length;
    const wrong = guesses.length - correct;
    const received = papers.filter(
      (paper) => paper.author_id === roundPlayer.id
    ).length;
    const identified = assignments.filter((item) => {
      const paper = papers.find((p) => p.id === item.paper_id);
      return paper &&
        paper.author_id === roundPlayer.id &&
        item.guessed_player_id === paper.author_id;
    }).length;
    return { player: roundPlayer, correct, wrong, received, identified };
  });

  const roundSharpshooter = [...roundStats]
    .sort((a, b) => b.correct - a.correct || a.wrong - b.wrong)[0];

  const roundOpenBook = [...roundStats]
    .filter((item) => item.received > 0)
    .sort(
      (a, b) =>
        (b.identified / b.received) -
        (a.identified / a.received)
    )[0];

  const roundHardest = [...roundStats]
    .filter((item) => item.received > 0)
    .sort(
      (a, b) =>
        (a.identified / a.received) -
        (b.identified / b.received)
    )[0];

  /* =========================================================
     PAPER NAVIGATION
  ========================================================= */

  function previousPaper() {
    setSelectedPaper(
      (current) => {
        if (
          papers.length <= 1
        ) {
          return 0;
        }

        if (current <= 0) {
          return (
            papers.length - 1
          );
        }

        return current - 1;
      }
    );
  }

  function nextPaper() {
    setSelectedPaper(
      (current) => {
        if (
          papers.length <= 1
        ) {
          return 0;
        }

        if (
          current >=
          papers.length - 1
        ) {
          return 0;
        }

        return current + 1;
      }
    );
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <section className="reveal-screen">

      <div className="reveal-card">

        {/* HEADER */}

        <div className="reveal-header">

          <span className="reveal-eyebrow">
            ROUND {room.round}
          </span>

          <h1>
            Reveal
          </h1>

          <p>
            Find out who wrote each paper.
          </p>

        </div>

        {/* =================================================
           PAPER PICKER
        ================================================= */}

        <div className="reveal-paper-picker">

          <button
            type="button"
            className="reveal-paper-arrow"
            onClick={
              previousPaper
            }
            aria-label="Previous paper"
          >
            ‹
          </button>

          <div className="reveal-paper-selector">

            <span className="reveal-paper-label">
              PAPER
            </span>

            <strong>
              {safePaperIndex + 1}
            </strong>

            <span className="reveal-paper-total">
              / {papers.length}
            </span>

          </div>

          <button
            type="button"
            className="reveal-paper-arrow"
            onClick={
              nextPaper
            }
            aria-label="Next paper"
          >
            ›
          </button>

        </div>

        {/* =================================================
           PAPER
        ================================================= */}

        <article className="reveal-paper">

          <div className="reveal-paper-content">
            {paper.content ||
              "(Empty paper)"}
          </div>

          {/* AUTHOR */}

          <div className="reveal-author">

            <div className="reveal-author-avatar">

              {author?.avatar && (
                <img
                  src={`${import.meta.env.BASE_URL}assets/avatars/${author.avatar}`}
                  alt={
                    author.name
                  }
                />
              )}

            </div>

            <div>

              <span>
                Written by
              </span>

              <strong>
                {author?.name ||
                  "Unknown"}
              </strong>

            </div>

          </div>

          {/* =================================================
             GUESSES
          ================================================= */}

          <div className="reveal-guesses">

            <div className="reveal-guesses-title">
              Guesses
            </div>

            {paperGuesses.length ===
            0 ? (
              <div className="reveal-no-guesses">
                No guesses.
              </div>
            ) : (
              paperGuesses.map(
                (guess) => {

                  const guesser =
                    players.find(
                      (item) =>
                        item.id ===
                        guess.assigned_to
                    );

                  const guessedPlayer =
                    players.find(
                      (item) =>
                        item.id ===
                        guess.guessed_player_id
                    );

                  const correct =
                    guess.guessed_player_id ===
                    paper.author_id;

                  const earnedPoints =
                    correct
                      ? 1
                      : 0;

                  return (
                    <div
                      key={
                        guess.id
                      }
                      className={
                        "reveal-guess " +
                        (
                          correct
                            ? "correct"
                            : "wrong"
                        )
                      }
                    >

                      {/* GUESSER */}

                      <div className="reveal-guess-player">

                        {guesser?.avatar && (
                          <img
                            src={`${import.meta.env.BASE_URL}assets/avatars/${guesser.avatar}`}
                            alt={
                              guesser.name
                            }
                          />
                        )}

                        <span>
                          {guesser?.name ||
                            "Unknown"}
                        </span>

                        <strong className="reveal-player-score">
                          {guesser?.score ??
                            0}
                        </strong>

                      </div>

                      {/* ARROW */}

                      <div className="reveal-guess-arrow">
                        →
                      </div>

                      {/* GUESSED PLAYER */}

                      <div className="reveal-guess-player">

                        {guessedPlayer?.avatar && (
                          <img
                            src={`${import.meta.env.BASE_URL}assets/avatars/${guessedPlayer.avatar}`}
                            alt={
                              guessedPlayer.name
                            }
                          />
                        )}

                        <span>
                          {guessedPlayer?.name ||
                            "Unknown"}
                        </span>

                      </div>

                      {/* RESULT */}

                      <div className="reveal-result">

                        <span>
                          {correct
                            ? "✓ Correct"
                            : "✕ Wrong"}
                        </span>

                        <strong className="reveal-points">
                          +{earnedPoints}
                        </strong>

                      </div>

                    </div>
                  );
                }
              )
            )}

          </div>

        </article>

        {/* =================================================
           CURRENT SCORES
        ================================================= */}

        <div className="reveal-score-section">

          <div className="reveal-score-title">
            Current Scores
          </div>

          <div className="reveal-scores">

            {players
              .slice()
              .sort(
                (a, b) =>
                  (b.score || 0) -
                  (a.score || 0)
              )
              .map(
                (
                  scorePlayer,
                  index
                ) => (

                  <div
                    key={
                      scorePlayer.id
                    }
                    className={
                      "reveal-score-player " +
                      (
                        scorePlayer.id ===
                        player.id
                          ? "current"
                          : ""
                      )
                    }
                  >

                    {/* RANK */}

                    <div className="reveal-rank">
                      {index + 1}
                    </div>

                    {/* AVATAR */}

                    <div className="reveal-score-avatar">

                      {scorePlayer.avatar && (
                        <img
                          src={`${import.meta.env.BASE_URL}assets/avatars/${scorePlayer.avatar}`}
                          alt={
                            scorePlayer.name
                          }
                        />
                      )}

                    </div>

                    {/* NAME */}

                    <div className="reveal-score-name">

                      {scorePlayer.name}

                      {scorePlayer.id ===
                        player.id && (
                        <span>
                          YOU
                        </span>
                      )}

                    </div>

                    {/* SCORE */}

                    <strong>
                      {scorePlayer.score ||
                        0}
                    </strong>

                  </div>

                )
              )}

          </div>

        </div>

        {/* =================================================
           ROUND AWARDS
        ================================================= */}

        <div className="results-awards-section reveal-round-awards">
          <div className="results-section-title">ROUND AWARDS</div>
          <div className="results-awards-grid">
            {roundSharpshooter && (
              <div className="results-award">
                <div className="results-award-icon">🎯</div>
                <div>
                  <strong>Sharpshooter</strong>
                  <span>{roundSharpshooter.player.name}</span>
                  <small>{roundSharpshooter.correct} correct guesses</small>
                </div>
              </div>
            )}
            {roundOpenBook && (
              <div className="results-award">
                <div className="results-award-icon">📖</div>
                <div>
                  <strong>Open Book</strong>
                  <span>{roundOpenBook.player.name}</span>
                  <small>Easiest to identify this round</small>
                </div>
              </div>
            )}
            {roundHardest && (
              <div className="results-award">
                <div className="results-award-icon">🕵️</div>
                <div>
                  <strong>Hardest to Catch</strong>
                  <span>{roundHardest.player.name}</span>
                  <small>Lowest identification rate</small>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =================================================
           COUNTDOWN
        ================================================= */}

        <div className="next-round-countdown">

          <div className="next-round-countdown-label">

            {isLastRound
              ? "GAME ENDS IN"
              : "NEXT ROUND IN"}

          </div>

          <div className="next-round-countdown-number">
            {secondsLeft}
          </div>

          <div className="next-round-countdown-sub">

            {secondsLeft === 1
              ? "second"
              : "seconds"}

          </div>

          {player.is_host && !startingNextRound && (
            <button
              type="button"
              className="next-round-button"
              onClick={async () => {
                setStartingNextRound(true);

                try {
                  await startNextRound(room.id, player.id);
                } catch (error) {
                  console.error("Could not start next round:", error);
                  setStartingNextRound(false);
                  setErrorMessage(error?.message || "Could not start the next round.");
                }
              }}
            >
              {isLastRound ? "Finish Game →" : "Next Round →"}
            </button>
          )}

        </div>

        {/* NEXT ROUND LOADING */}

        {startingNextRound && (
          <div className="next-round-starting">
            Starting...
          </div>
        )}

      </div>

    </section>
  );
}

export default RevealScreen;