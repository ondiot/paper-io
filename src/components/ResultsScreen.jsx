import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { returnToLobby } from "../game/rooms";

function ResultsScreen({ room, player }) {
  const [players, setPlayers] = useState([]);
  const [papers, setPapers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [returning, setReturning] = useState(false);

  useEffect(() => {
    if (!room?.id) return;
    let active = true;

    async function load() {
      const [p, pa, a] = await Promise.all([
        supabase.from("players").select("*").eq("room_id", room.id).order("score", { ascending: false }),
        supabase.from("papers").select("*").eq("room_id", room.id),
        supabase.from("assignments").select("*").eq("room_id", room.id),
      ]);

      if (!active) return;
      if (p.error) console.error(p.error);
      if (pa.error) console.error(pa.error);
      if (a.error) console.error(a.error);
      setPlayers(p.data || []);
      setPapers(pa.data || []);
      setAssignments(a.data || []);
      setLoading(false);
    }

    load();
    return () => { active = false; };
  }, [room?.id]);

  const ranking = useMemo(
    () => [...players].sort((a, b) => (b.score || 0) - (a.score || 0)),
    [players]
  );

  const stats = useMemo(() => {
    const map = Object.fromEntries(players.map((p) => [p.id, {
      player: p, correct: 0, wrong: 0, received: 0, identified: 0,
    }]));
    const paperById = Object.fromEntries(papers.map((p) => [p.id, p]));

    assignments.forEach((assignment) => {
      const paper = paperById[assignment.paper_id];
      if (!paper) return;
      const guesser = map[assignment.assigned_to];
      const writer = map[paper.author_id];
      const correct = assignment.guessed_player_id === paper.author_id;

      if (guesser) {
        if (correct) guesser.correct += 1;
        else guesser.wrong += 1;
      }

      if (writer) {
        writer.received += 1;
        if (correct) writer.identified += 1;
      }
    });

    return Object.values(map);
  }, [players, papers, assignments]);

  const sharpshooter = [...stats].sort(
    (a, b) => b.correct - a.correct || b.wrong - a.wrong
  )[0];
  const openBook = [...stats]
    .filter((s) => s.received > 0)
    .sort((a, b) => (b.identified / b.received) - (a.identified / a.received))[0];
  const dummy = [...stats].sort((a, b) => b.wrong - a.wrong)[0];
  const hardest = [...stats]
    .filter((s) => s.received > 0)
    .sort((a, b) => (a.identified / a.received) - (b.identified / b.received))[0];

  function avatar(item, className = "results-avatar") {
    return item?.avatar ? (
      <img
        className={className}
        src={`${import.meta.env.BASE_URL}assets/avatars/${item.avatar}`}
        alt={item.name}
        draggable="false"
      />
    ) : null;
  }

  async function handleBackToLobby() {
    if (!player?.is_host || returning) return;

    setReturning(true);
    try {
      await returnToLobby(room.id, player.id);
    } catch (error) {
      console.error("Could not return to lobby:", error);
      alert(error?.message || "Could not return everyone to the lobby.");
      setReturning(false);
    }
  }

  if (loading) {
    return (
      <section className="results-screen">
        <div className="results-loading">
          <div className="reveal-loading-dot" />
          <h1>Calculating results...</h1>
        </div>
      </section>
    );
  }

  const first = ranking[0];
  const second = ranking[1];
  const third = ranking[2];

  const podium = [
    { item: second, place: 2, cls: "second" },
    { item: first, place: 1, cls: "first" },
    { item: third, place: 3, cls: "third" },
  ];

  return (
    <section className="results-screen">
      <div className="results-card">
        <header className="results-header">
          <span>GAME COMPLETE</span>
          <h1>Final Results</h1>
          <p>Every paper. Every guess. One final scoreboard.</p>
        </header>

        <div className="results-podium">
          {podium.map(({ item, place, cls }) => item && (
            <div className={`podium-place podium-${cls}`} key={item.id}>
              <div className="podium-avatar">
                {avatar(item, "podium-avatar-image")}
              </div>
              <strong>{item.name}</strong>
              <span>{item.score || 0} pts</span>
              <div className="podium-block"><b>{place}</b></div>
            </div>
          ))}
        </div>

        <div className="results-ranking-section">
          <div className="results-section-title">FINAL SCORE</div>
          {ranking.map((item, index) => (
            <div className={`results-ranking-row ${item.id === player?.id ? "current" : ""}`} key={item.id}>
              <b className="results-rank">{index + 1}</b>
              <div className="results-ranking-avatar">{avatar(item)}</div>
              <div className="results-ranking-name">
                {item.name}
                {item.id === player?.id && <small>YOU</small>}
              </div>
              <strong>{item.score || 0}</strong>
            </div>
          ))}
        </div>

        <div className="results-awards-section">
          <div className="results-section-title">AWARDS</div>
          <div className="results-awards-grid">
            {[
              ["🎯", "Sharpshooter", sharpshooter, `${sharpshooter?.correct || 0} correct guesses`],
              ["📖", "Open Book", openBook, "Easiest to identify"],
              ["🤡", "Fool", dummy, `${dummy?.wrong || 0} wrong guesses`],
              ["🎭", "Master of Disguise", hardest, "Hardest to identify"],
            ].map(([icon, title, stat, detail]) => stat && (
              <div className="results-award" key={title}>
                <div className="results-award-icon">{icon}</div>
                <div>
                  <strong>{title}</strong>
                  <span>{stat.player.name}</span>
                  <small>{detail}</small>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="results-lobby-section">
          {player?.is_host ? (
            <>
              <button
                type="button"
                className="results-back-lobby-button"
                onClick={handleBackToLobby}
                disabled={returning}
              >
                {returning ? "Returning everyone..." : "← Back to Lobby"}
              </button>
              <p>Everyone will return to the same room lobby for another game.</p>
            </>
          ) : (
            <p>Waiting for the host to return everyone to the lobby...</p>
          )}
        </div>
      </div>
    </section>
  );
}

export default ResultsScreen;
