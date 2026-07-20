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

alter table public.rooms enable row level security;
