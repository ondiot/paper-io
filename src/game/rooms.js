import { supabase } from "../lib/supabase";

function generateRoomCode() {
  const characters =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  for (let i = 0; i < 6; i++) {
    code += characters.charAt(
      Math.floor(
        Math.random() * characters.length
      )
    );
  }

  return code;
}


// ========================================
// CREATE ROOM
// ========================================

export async function createRoom({
  name,
  avatar,
  roundTime,
  rounds,
  topicMode
}) {
  let room = null;

  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateRoomCode();

    const {
      data,
      error
    } = await supabase
      .from("rooms")
      .insert({
        code,
        status: "lobby",
        round: 1,
        round_seconds: roundTime,
        rounds,
        topic_mode: topicMode
      })
      .select()
      .single();

    if (!error) {
      room = data;
      break;
    }
  }

  if (!room) {
    throw new Error(
      "Could not create a unique room."
    );
  }

  const {
    data: player,
    error: playerError
  } = await supabase
    .from("players")
    .insert({
      room_id: room.id,
      name: name.trim(),
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


// ========================================
// JOIN ROOM
// ========================================

export async function joinRoom({
  code,
  name,
  avatar
}) {
  const cleanCode = code
    .trim()
    .toUpperCase();

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
    throw new Error("Room not found.");
  }

  if (room.status !== "lobby") {
    throw new Error(
      "This game has already started."
    );
  }

  const {
    data: player,
    error: playerError
  } = await supabase
    .from("players")
    .insert({
      room_id: room.id,
      name: name.trim(),
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


// ========================================
// GET ROOM + PLAYER SESSION
// ========================================

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
    room,
    player
  };
}


// ========================================
// HEARTBEAT
// ========================================

export async function updateHeartbeat(
  playerId
) {
  const {
    error
  } = await supabase
    .from("players")
    .update({
      last_seen:
        new Date().toISOString()
    })
    .eq("id", playerId);

  if (error) {
    console.error(
      "Heartbeat failed:",
      error
    );

    return false;
  }

  return true;
}


// ========================================
// LEAVE ROOM
// ========================================

export async function leaveRoom(
  playerId
) {
  if (!playerId) return;

  const {
    error
  } = await supabase
    .from("players")
    .delete()
    .eq("id", playerId);

  if (error) {
    console.error(
      "Leave room failed:",
      error
    );
  }
}


// ========================================
// KICK PLAYER
// ========================================

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
      "You do not have permission to kick this player."
    );
  }

  return true;
}

// START GAME
export async function startGame(
  roomId,
  hostPlayerId
) {
  // Check that the player is actually
  // the host of this room.

  const {
    data: host,
    error: hostError
  } = await supabase
    .from("players")
    .select("id, room_id, is_host")
    .eq("id", hostPlayerId)
    .eq("room_id", roomId)
    .maybeSingle();

  if (hostError) {
    throw hostError;
  }

  if (!host) {
    throw new Error(
      "Player not found."
    );
  }

  if (!host.is_host) {
    throw new Error(
      "Only the host can start the game."
    );
  }


  // Get players in the room.

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


  // Require at least 2 players.

  if (
    !players ||
    players.length < 2
  ) {
    throw new Error(
      "At least 2 players are required to start."
    );
  }


  // Get the room first.

  const {
    data: currentRoom,
    error: currentRoomError
  } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();

  if (currentRoomError) {
    throw currentRoomError;
  }

  if (!currentRoom) {
    throw new Error(
      "Room not found."
    );
  }


  // Make sure the room is still in
  // the lobby.

  if (
    currentRoom.status !==
    "lobby"
  ) {
    throw new Error(
      "This game has already started."
    );
  }


  // Calculate writing end time
  // using the room's actual setting.

  const writingEndsAt =
    new Date(
      Date.now() +
      currentRoom.round_seconds *
        1000
    ).toISOString();


  // Update the room.

  const {
    data: updatedRooms,
    error: updateError
  } = await supabase
    .from("rooms")
    .update({
      status: "writing",
      round: 1,
      writing_ends_at:
        writingEndsAt
    })
    .eq("id", roomId)
    .eq("status", "lobby")
    .select("*");

  if (updateError) {
    throw updateError;
  }


  // Make sure the update actually
  // changed a room.

  if (
    !updatedRooms ||
    updatedRooms.length === 0
  ) {
    throw new Error(
      "Could not start the game. The room may have already started."
    );
  }


  return updatedRooms[0];
}

// SUBMIT PAPER
export async function submitPaper({
  roomId,
  playerId,
  round,
  content,
  autoFilled = false
}) {
  const cleanContent = content.trim();

  if (!cleanContent) {
    throw new Error("Your writing cannot be empty.");
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
        submitted_at: new Date().toISOString()
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


// CHECK WHETHER EVERYONE SUBMITTED
export async function checkRoundComplete(roomId, round) {
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

  const submittedIds = new Set(
    (papers || []).map(
      (paper) => paper.author_id
    )
  );

  return (
    players &&
    players.length > 0 &&
    players.every((player) =>
      submittedIds.has(player.id)
    )
  );
}
