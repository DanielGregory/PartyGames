-- Run this once in your Supabase project's SQL Editor (Dashboard -> SQL Editor -> New query -> Run).
-- One row per room. Clients never query this table directly — only the
-- Next.js API routes do, using the service-role key, which bypasses RLS.
-- Row Level Security is enabled with zero policies, so the anon/public key
-- (used by the browser for Realtime) has no read/write access to it at all.

create table if not exists public.rooms (
  code text primary key,
  host_id text,
  status text not null default 'lobby',
  selected_game text,
  game_id text,
  round int not null default 0,
  game_state jsonb,
  players jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Added for games with a maxPlayers cap (2-player board games): the subset
-- of the room actually playing, when the host had to pick out of a bigger
-- group. Null means everyone in the room is playing. Safe to re-run this
-- file on a database that already has the table from before this column
-- existed - `add column if not exists` only adds what's missing.
alter table public.rooms add column if not exists active_players jsonb;

alter table public.rooms enable row level security;
