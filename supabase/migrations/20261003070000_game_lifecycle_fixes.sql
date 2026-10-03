-- PAPER.IO game lifecycle and kick fixes
-- Run this migration in the Supabase SQL editor (or deploy with Supabase CLI).

ALTER TABLE public.assignments
  DROP CONSTRAINT IF EXISTS assignments_guessed_player_id_fkey;

ALTER TABLE public.assignments
  ALTER COLUMN guessed_player_id DROP NOT NULL;

ALTER TABLE public.assignments
  ADD CONSTRAINT assignments_guessed_player_id_fkey
  FOREIGN KEY (guessed_player_id)
  REFERENCES public.players(id)
  ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.return_room_to_lobby(
  p_room_id uuid,
  p_host_player_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.rooms%ROWTYPE;
  v_is_host boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.players
    WHERE id = p_host_player_id
      AND room_id = p_room_id
      AND is_host = true
  ) INTO v_is_host;

  IF NOT v_is_host THEN
    RAISE EXCEPTION 'Only the host can return the room to the lobby.';
  END IF;

  SELECT * INTO v_room
  FROM public.rooms
  WHERE id = p_room_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found.';
  END IF;

  DELETE FROM public.assignments WHERE room_id = p_room_id;
  DELETE FROM public.papers WHERE room_id = p_room_id;

  UPDATE public.players
  SET score = 0
  WHERE room_id = p_room_id;

  UPDATE public.rooms
  SET status = 'lobby',
      round = 1,
      writing_ends_at = NULL
  WHERE id = p_room_id
  RETURNING * INTO v_room;

  RETURN jsonb_build_object('room', to_jsonb(v_room));
END;
$$;
