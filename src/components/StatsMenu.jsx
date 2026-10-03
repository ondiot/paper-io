import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

function StatsMenu({ room, player }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [papers, setPapers] = useState([]);
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    if (!open || !room?.id || !player?.id) return;

    let active = true;

    async function loadStats() {
      setLoading(true);

      const [papersResult, assignmentsResult] = await Promise.all([
        supabase
          .from("papers")
          .select("id,author_id,round")
          .eq("room_id", room.id),
        supabase
          .from("assignments")
          .select("paper_id,assigned_to,guessed_player_id,round")
          .eq("room_id", room.id)
          .eq("assigned_to", player.id),
      ]);

      if (!active) return;

      if (papersResult.error) console.error("Could not load stats papers:", papersResult.error);
      if (assignmentsResult.error) console.error("Could not load stats guesses:", assignmentsResult.error);

      setPapers(papersResult.data || []);
      setAssignments(assignmentsResult.data || []);
      setLoading(false);
    }

    loadStats();

    return () => {
      active = false;
    };
  }, [open, room?.id, player?.id]);

  const stats = useMemo(() => {
    const paperById = Object.fromEntries(papers.map((paper) => [paper.id, paper]));
    const written = papers.filter((paper) => paper.author_id === player?.id).length;

    let correct = 0;
    let wrong = 0;

    assignments.forEach((assignment) => {
      const paper = paperById[assignment.paper_id];
      if (!paper) return;

      if (assignment.guessed_player_id === paper.author_id) correct += 1;
      else wrong += 1;
    });

    const totalGuesses = correct + wrong;

    return {
      written,
      correct,
      wrong,
      accuracy: totalGuesses ? Math.round((correct / totalGuesses) * 100) : 0,
      score: player?.score || 0,
    };
  }, [papers, assignments, player?.id, player?.score]);

  if (!room || !player) return null;

  return (
    <>
      <button
        type="button"
        className="global-stats-button"
        onClick={() => setOpen(true)}
        aria-label="Open your statistics"
      >
        Stats
      </button>

      {open && (
        <div className="stats-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}>
          <section className="stats-modal" role="dialog" aria-modal="true" aria-label="Your statistics">
            <div className="stats-modal-header">
              <div>
                <span>PLAYER MENU</span>
                <h2>Your Statistics</h2>
                <p>Only you can see these stats.</p>
              </div>
              <button type="button" className="stats-close" onClick={() => setOpen(false)} aria-label="Close statistics">×</button>
            </div>

            <div className="stats-profile">
              <div className="stats-avatar">
                <img
                  src={`${import.meta.env.BASE_URL}assets/avatars/${player.avatar}`}
                  alt={player.name}
                  draggable="false"
                />
              </div>
              <div>
                <strong>{player.name}</strong>
                <span>Room {room.code}</span>
              </div>
            </div>

            {loading ? (
              <div className="stats-loading">Loading your stats...</div>
            ) : (
              <div className="stats-grid">
                <div className="stat-card"><strong>{stats.score}</strong><span>Current score</span></div>
                <div className="stat-card"><strong>{stats.written}</strong><span>Papers written</span></div>
                <div className="stat-card"><strong>{stats.correct}</strong><span>Correct guesses</span></div>
                <div className="stat-card"><strong>{stats.accuracy}%</strong><span>Guess accuracy</span></div>
              </div>
            )}

            <div className="stats-mini-line">
              {stats.wrong} wrong guess{stats.wrong === 1 ? "" : "es"} · Live for this room
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export default StatsMenu;
