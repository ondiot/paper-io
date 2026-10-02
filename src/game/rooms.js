import { supabase } from "../lib/supabase";

function generateRoomCode() {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < 6; i++) {
    code += characters.charAt(
      Math.floor(Math.random() * characters.length)
    );
  }

  return code;
}

export async function createRoom({
  name,
  avatar,
  roundTime,
  rounds,
  topicMode
}) {
  let room = null;

  // Generate a unique room code
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateRoomCode();

    const { data, error } = await supabase
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
    throw new Error("Could not create a unique room.");
  }

  // Add host as the first player
  const { data: player, error: playerError } =
    await supabase
      .from("players")
      .insert({
        room_id: room.id,
        name: name.trim(),
        avatar,
        is_host: true,
        score: 0
      })
      .select()
      .single();

  if (playerError) {
    // Clean up the room if player creation fails
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

