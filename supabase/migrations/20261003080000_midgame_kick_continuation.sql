-- Continue an active game when the host kicks a player mid-round.
-- Apply this migration in Supabase SQL editor / CLI.

DROP FUNCTION IF EXISTS public.kick_player(uuid, uuid);

CREATE OR REPLACE FUNCTION public.kick_player(
  target_player_id uuid,
  host_player_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id uuid;
  v_status text;
  v_is_host boolean;
  v_target_exists boolean;
BEGIN
  SELECT p.room_id
    INTO v_room_id
  FROM public.players p
  WHERE p.id = host_player_id
    AND p.is_host = true;

  IF v_room_id IS NULL THEN
    RAISE EXCEPTION 'Only the host can kick players.';
  END IF;

  SELECT r.status
    INTO v_status
  FROM public.rooms r
  WHERE r.id = v_room_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Room not found.';
  END IF;

  IF target_player_id = host_player_id THEN
    RAISE EXCEPTION 'The host cannot kick themselves.';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.players
    WHERE id = target_player_id
      AND room_id = v_room_id
  )
  INTO v_target_exists;

  IF NOT v_target_exists THEN
    RAISE EXCEPTION 'Player is no longer in the room.';
  END IF;

  /*
   * During writing/guessing, remove the kicked player's paper and
   * assignments connected to it. Otherwise the remaining players
   * could be forced to guess a paper whose author no longer exists.
   *
   * We deliberately keep reveal/results data intact so a late kick
   * cannot corrupt an already-calculated round or final results.
   */
  IF v_status IN ('writing', 'guessing') THEN
    DELETE FROM public.assignments
    WHERE room_id = v_room_id
      AND paper_id IN (
        SELECT id
        FROM public.papers
        WHERE room_id = v_room_id
          AND author_id = target_player_id
      );

    DELETE FROM public.papers
    WHERE room_id = v_room_id
      AND author_id = target_player_id;
  END IF;

  /* Remove assignments owned by the kicked player. */
  DELETE FROM public.assignments
  WHERE room_id = v_room_id
    AND assigned_to = target_player_id;

  DELETE FROM public.players
  WHERE id = target_player_id
    AND room_id = v_room_id;

  RETURN FOUND;
END;
$$;
