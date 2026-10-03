create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  player_name text not null,
  player_avatar text,
  message text not null check (char_length(trim(message)) between 1 and 300),
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_room_created_idx
  on public.chat_messages(room_id, created_at);

alter table public.chat_messages enable row level security;

drop policy if exists "chat messages can be read" on public.chat_messages;
create policy "chat messages can be read"
  on public.chat_messages
  for select
  to anon, authenticated
  using (true);

drop policy if exists "chat messages can be sent" on public.chat_messages;
create policy "chat messages can be sent"
  on public.chat_messages
  for insert
  to anon, authenticated
  with check (
    exists (
      select 1
      from public.players
      where players.id = chat_messages.player_id
        and players.room_id = chat_messages.room_id
    )
  );

do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception
  when duplicate_object then null;
end $$;
