import { supabase } from "../lib/supabase";

/* =========================================================
   ROOM CODE
========================================================= */

function generateRoomCode(length = 6) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  for (let i = 0; i < length; i++) {
    code +=
      chars[
        Math.floor(
          Math.random() * chars.length
        )
      ];
  }

  return code;
}

/* =========================================================
   CREATE ROOM
========================================================= */

export async function createRoom({
  name,
  avatar,
  roundTime,
  rounds,
  topicMode
}) {
  const code = generateRoomCode();

  const {
    data: room,
    error: roomError
  } = await supabase
    .from("rooms")
    .insert({
      code,
      status: "lobby",
      round: 1,
      round_seconds: roundTime,
      rounds,
      topic_mode: topicMode,
      writing_ends_at: null
    })
    .select()
    .single();

  if (roomError) {
    throw roomError;
  }

  const {
    data: player,
    error: playerError
  } = await supabase
    .from("players")
    .insert({
      room_id: room.id,
      name,
      avatar,
      is_host: true,
      score: 0,
      last_seen: new Date().toISOString()
    })
    .select()
    .single();

  if (playerError) {
    await supabase
      .from("rooms")
      .delete()
      .eq("id", room.id);

    throw playerError;
  }

  return {
    room,
    player
  };
}

/* =========================================================
   JOIN ROOM
========================================================= */

export async function joinRoom({
  code,
  name,
  avatar
}) {
  const cleanCode =
    code.trim().toUpperCase();

  const {
    data: room,
    error: roomError
  } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", cleanCode)
    .maybeSingle();

  if (roomError) {
    throw roomError;
  }

  if (!room) {
    throw new Error(
      "Room not found."
    );
  }

  if (room.status !== "lobby") {
    throw new Error(
      "This game has already started."
    );
  }

  const {
    data: existingPlayers,
    error: playersError
  } = await supabase
    .from("players")
    .select("id")
    .eq("room_id", room.id);

  if (playersError) {
    throw playersError;
  }

  if (
    (existingPlayers || []).length >= 8
  ) {
    throw new Error(
      "This room is full."
    );
  }

  const {
    data: player,
    error: playerError
  } = await supabase
    .from("players")
    .insert({
      room_id: room.id,
      name,
      avatar,
      is_host: false,
      score: 0,
      last_seen: new Date().toISOString()
    })
    .select()
    .single();

  if (playerError) {
    throw playerError;
  }

  return {
    room,
    player
  };
}

/* =========================================================
   RESTORE PLAYER SESSION
========================================================= */

export async function getPlayerSession(
  playerId,
  roomId
) {
  const {
    data: player,
    error: playerError
  } = await supabase
    .from("players")
    .select("*")
    .eq("id", playerId)
    .eq("room_id", roomId)
    .maybeSingle();

  if (playerError) {
    throw playerError;
  }

  if (!player) {
    return null;
  }

  const {
    data: room,
    error: roomError
  } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();

  if (roomError) {
    throw roomError;
  }

  if (!room) {
    return null;
  }

  return {
    player,
    room
  };
}

/* =========================================================
   HEARTBEAT
========================================================= */

export async function updateHeartbeat(
  playerId
) {
  if (!playerId) {
    return;
  }

  const {
    error
  } = await supabase
    .from("players")
    .update({
      last_seen: new Date().toISOString()
    })
    .eq("id", playerId);

  if (error) {
    console.error(
      "Heartbeat failed:",
      error
    );
  }
}

/* =========================================================
   LEAVE ROOM
========================================================= */

export async function leaveRoom(
  playerId
) {
  if (!playerId) {
    return;
  }

  const {
    error
  } = await supabase
    .from("players")
    .delete()
    .eq("id", playerId);

  if (error) {
    throw error;
  }
}

/* =========================================================
   KICK PLAYER
========================================================= */

export async function kickPlayer({
  targetPlayerId,
  hostPlayerId
}) {
  const {
    data,
    error
  } = await supabase.rpc(
    "kick_player",
    {
      target_player_id:
        targetPlayerId,

      host_player_id:
        hostPlayerId
    }
  );

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "Could not kick this player."
    );
  }

  return true;
}

/* =========================================================
   START GAME
========================================================= */

export async function startGame(
  roomId,
  hostPlayerId
) {
  const {
    data: host,
    error: hostError
  } = await supabase
    .from("players")
    .select("*")
    .eq("id", hostPlayerId)
    .eq("room_id", roomId)
    .eq("is_host", true)
    .maybeSingle();

  if (hostError) {
    throw hostError;
  }

  if (!host) {
    throw new Error(
      "Only the host can start the game."
    );
  }

  const {
    data: players,
    error: playersError
  } = await supabase
    .from("players")
    .select("id")
    .eq("room_id", roomId);

  if (playersError) {
    throw playersError;
  }

  if (
    !players ||
    players.length < 2
  ) {
    throw new Error(
      "At least 2 players are required."
    );
  }

  const {
    data: room,
    error: roomError
  } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  if (roomError) {
    throw roomError;
  }

  const endsAt = new Date(
    Date.now() +
      room.round_seconds * 1000
  ).toISOString();

  const {
    data: updatedRoom,
    error: updateError
  } = await supabase
    .from("rooms")
    .update({
      status: "writing",
      round: 1,
      writing_ends_at: endsAt
    })
    .eq("id", roomId)
    .select()
    .single();

  if (updateError) {
    throw updateError;
  }

  return updatedRoom;
}

/* =========================================================
   SUBMIT PAPER
========================================================= */

export async function submitPaper({
  roomId,
  playerId,
  round,
  content,
  autoFilled = false
}) {
  const cleanContent =
    content?.trim() || "";

  if (!cleanContent) {
    throw new Error(
      "Paper cannot be empty."
    );
  }

  const {
    data,
    error
  } = await supabase
    .from("papers")
    .upsert(
      {
        room_id: roomId,
        round,
        author_id: playerId,
        content: cleanContent,
        auto_filled: autoFilled,
        submitted_at:
          new Date().toISOString()
      },
      {
        onConflict:
          "room_id,round,author_id"
      }
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/* =========================================================
   CHECK WRITING COMPLETE
========================================================= */

export async function checkRoundComplete(
  roomId,
  round
) {
  const {
    data: players,
    error: playersError
  } = await supabase
    .from("players")
    .select("id")
    .eq("room_id", roomId);

  if (playersError) {
    throw playersError;
  }

  const {
    data: papers,
    error: papersError
  } = await supabase
    .from("papers")
    .select("author_id")
    .eq("room_id", roomId)
    .eq("round", round);

  if (papersError) {
    throw papersError;
  }

  const submittedIds =
    new Set(
      (papers || []).map(
        (paper) =>
          paper.author_id
      )
    );

  return (
    players || []
  ).every(
    (player) =>
      submittedIds.has(
        player.id
      )
  );
}

/* =========================================================
   SUBMIT GUESSES
========================================================= */

export async function submitGuesses({
  roomId,
  round,
  playerId,
  guesses
}) {
  const entries =
    Object.entries(
      guesses || {}
    );

  if (entries.length === 0) {
    throw new Error(
      "You have not made any guesses."
    );
  }

  const rows =
    entries.map(
      ([
        paperId,
        guessedPlayerId
      ]) => ({
        room_id: roomId,
        round,
        paper_id: paperId,
        assigned_to: playerId,
        guessed_player_id:
          guessedPlayerId
      })
    );

  const {
    data,
    error
  } = await supabase
    .from("assignments")
    .upsert(
      rows,
      {
        onConflict:
          "room_id,round,assigned_to,paper_id"
      }
    )
    .select();

  if (error) {
    throw error;
  }

  return data;
}

/* =========================================================
   CHECK GUESSING COMPLETE
========================================================= */

export async function checkGuessingComplete({
  roomId,
  round
}) {
  const {
    data: players,
    error: playersError
  } = await supabase
    .from("players")
    .select("id")
    .eq("room_id", roomId);

  if (playersError) {
    throw playersError;
  }

  const {
    data: papers,
    error: papersError
  } = await supabase
    .from("papers")
    .select("id,author_id")
    .eq("room_id", roomId)
    .eq("round", round);

  if (papersError) {
    throw papersError;
  }

  const playerList =
    players || [];

  // Only papers belonging to players who are still in the room
  // count toward completion. A kicked player's paper must not freeze
  // the remaining players in the guessing phase.
  const paperList =
    (papers || []).filter((paper) =>
      playerList.some((player) => player.id === paper.author_id)
    );

  /*
   * Every active player must guess every active paper except their own.
   */

  const requiredGuesses =
    Math.max(
      0,
      paperList.length - 1
    );

  if (
    playerList.length === 0 ||
    paperList.length === 0
  ) {
    return false;
  }

  const {
    data: assignments,
    error: assignmentsError
  } = await supabase
    .from("assignments")
    .select(
      "assigned_to,paper_id"
    )
    .eq("room_id", roomId)
    .eq("round", round);

  if (assignmentsError) {
    throw assignmentsError;
  }

  const counts = {};

  for (
    const assignment of
    assignments || []
  ) {
    if (
      !counts[
        assignment.assigned_to
      ]
    ) {
      counts[
        assignment.assigned_to
      ] = new Set();
    }

    counts[
      assignment.assigned_to
    ].add(
      assignment.paper_id
    );
  }

  return playerList.every(
    (player) => {
      const guessed =
        counts[player.id]
          ?.size || 0;

      return (
        guessed >=
        requiredGuesses
      );
    }
  );
}

/* =========================================================
   START GUESSING
========================================================= */

export async function startGuessing(
  roomId
) {
  const {
    data,
    error
  } = await supabase
    .from("rooms")
    .update({
      status: "guessing"
    })
    .eq("id", roomId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/* =========================================================
   CALCULATE ROUND SCORES
========================================================= */

/*
 * Kept as an exported helper for compatibility.
 *
 * IMPORTANT:
 *
 * Do NOT call this during the normal
 * guessing → reveal transition.
 *
 * startReveal() now uses the atomic
 * Supabase RPC below.
 */

export async function calculateRoundScores({
  roomId,
  round
}) {
  const {
    data: players,
    error: playersError
  } = await supabase
    .from("players")
    .select("id, score")
    .eq("room_id", roomId);

  if (playersError) {
    throw playersError;
  }

  const {
    data: papers,
    error: papersError
  } = await supabase
    .from("papers")
    .select(
      "id, author_id"
    )
    .eq("room_id", roomId)
    .eq("round", round);

  if (papersError) {
    throw papersError;
  }

  const {
    data: assignments,
    error: assignmentsError
  } = await supabase
    .from("assignments")
    .select(
      "id, assigned_to, paper_id, guessed_player_id"
    )
    .eq("room_id", roomId)
    .eq("round", round);

  if (assignmentsError) {
    throw assignmentsError;
  }

  const paperAuthors = {};

  for (
    const paper of
    papers || []
  ) {
    paperAuthors[
      paper.id
    ] = paper.author_id;
  }

  const points = {};

  for (
    const player of
    players || []
  ) {
    points[player.id] = 0;
  }

  for (
    const assignment of
    assignments || []
  ) {
    const actualAuthor =
      paperAuthors[
        assignment.paper_id
      ];

    const guessedAuthor =
      assignment.guessed_player_id;

    const guesser =
      assignment.assigned_to;

    if (
      actualAuthor &&
      guessedAuthor ===
        actualAuthor
    ) {
      points[guesser] =
        (points[guesser] || 0) +
        1;
    }
  }

  for (
    const player of
    players || []
  ) {
    const earned =
      points[player.id] || 0;

    if (earned === 0) {
      continue;
    }

    const newScore =
      (player.score || 0) +
      earned;

    const {
      error: updateError
    } = await supabase
      .from("players")
      .update({
        score: newScore
      })
      .eq("id", player.id)
      .eq("room_id", roomId);

    if (updateError) {
      throw updateError;
    }
  }

  return points;
}

/* =========================================================
   START REVEAL
========================================================= */

/*
 * IMPORTANT:
 *
 * NEVER calculate the score separately here.
 *
 * The Supabase function:
 *
 *   score_round_and_start_reveal()
 *
 * does ALL of this atomically:
 *
 *   1. Locks the room.
 *   2. Confirms it is still "guessing".
 *   3. Checks every assignment.
 *   4. Gives +1 for correct guesses.
 *   5. Gives +0 for wrong guesses.
 *   6. Updates total player scores.
 *   7. Changes room status to "reveal".
 *   8. Starts the 15-second reveal timer.
 *
 * Therefore Reveal can never appear before
 * the scores have been updated.
 */

export async function startReveal(
  roomId
) {
  const {
    data,
    error
  } = await supabase.rpc(
    "score_round_and_start_reveal",
    {
      p_room_id: roomId
    }
  );

  if (error) {
    throw error;
  }

  if (!data?.room) {
    throw new Error(
      "Could not start the reveal."
    );
  }

  return data.room;
}

/* =========================================================
   START NEXT ROUND
========================================================= */

export async function startNextRound(
  roomId,
  hostPlayerId
) {
  /*
   * Verify host.
   */

  const {
    data: host,
    error: hostError
  } = await supabase
    .from("players")
    .select(
      "id, is_host"
    )
    .eq("id", hostPlayerId)
    .eq("room_id", roomId)
    .eq("is_host", true)
    .maybeSingle();

  if (hostError) {
    throw hostError;
  }

  if (!host) {
    throw new Error(
      "Only the host can start the next round."
    );
  }

  /*
   * Get current room.
   */

  const {
    data: room,
    error: roomError
  } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  if (roomError) {
    throw roomError;
  }

  const currentRound =
    room.round;

  const totalRounds =
    room.rounds || 3;

  /*
   * IMPORTANT:
   *
   * Scores are NOT calculated here.
   *
   * They were already calculated
   * atomically during:
   *
   * guessing → reveal
   */

  /*
   * FINAL ROUND
   */

  if (
    currentRound >=
    totalRounds
  ) {
    const {
      data,
      error
    } = await supabase
      .from("rooms")
      .update({
        status: "ended",
        writing_ends_at: null
      })
      .eq("id", roomId)
      .eq("status", "reveal")
      .select()
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  /*
   * START NEXT ROUND
   */

  const nextRound =
    currentRound + 1;

  const endsAt = new Date(
    Date.now() +
      room.round_seconds * 1000
  ).toISOString();

  const {
    data,
    error
  } = await supabase
    .from("rooms")
    .update({
      round: nextRound,
      status: "writing",
      writing_ends_at: endsAt
    })
    .eq("id", roomId)
    .eq("status", "reveal")
    .select()
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

/* =========================================================
   UPDATE LOBBY SETTINGS
========================================================= */

export async function updateRoomSettings({
  roomId,
  hostPlayerId,
  roundTime,
  rounds,
  topicMode,
}) {
  const { data, error } = await supabase.rpc(
    "update_room_settings",
    {
      p_room_id: roomId,
      p_host_player_id: hostPlayerId,
      p_round_seconds: Number(roundTime),
      p_rounds: Number(rounds),
      p_topic_mode: topicMode,
    }
  );

  if (error) throw error;
  return data;
}


/* =========================================================
   RETURN EVERYONE TO LOBBY
========================================================= */

export async function returnToLobby(roomId, hostPlayerId) {
  const { data, error } = await supabase.rpc(
    "return_room_to_lobby",
    {
      p_room_id: roomId,
      p_host_player_id: hostPlayerId,
    }
  );

  if (error) throw error;

  if (!data?.room) {
    throw new Error("Could not return the room to the lobby.");
  }

  return data.room;
}
