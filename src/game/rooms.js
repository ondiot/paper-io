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
