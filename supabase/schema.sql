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

-- Curated word lists: small, hand-picked pools (Wordle's answer pool, Word
-- Search's themed word sets) as opposed to server/wordbank/words.txt's
-- ~274k-word dictionary used only for validating freeform guesses/submissions.
-- Edit this table directly in the Supabase dashboard's Table Editor to add
-- more words or themes later - no code deploy needed, per getWordList() in
-- server/wordbank/curated.ts.
create table if not exists public.word_bank (
  id bigint generated always as identity primary key,
  word text not null,
  category text not null,
  length int not null,
  difficulty text not null default 'medium',
  created_at timestamptz not null default now(),
  unique (word, category)
);

create index if not exists word_bank_category_length_idx on public.word_bank (category, length);

alter table public.word_bank enable row level security;

-- Seed data. Safe to re-run - the unique(word, category) constraint above
-- makes this idempotent.
insert into public.word_bank (word, category, length, difficulty) values
  ('about','wordle',5,'easy'),('above','wordle',5,'easy'),('adult','wordle',5,'medium'),('after','wordle',5,'easy'),
  ('again','wordle',5,'easy'),('agent','wordle',5,'medium'),('anger','wordle',5,'medium'),('angle','wordle',5,'medium'),
  ('angry','wordle',5,'medium'),('apple','wordle',5,'easy'),('apply','wordle',5,'medium'),('arena','wordle',5,'medium'),
  ('argue','wordle',5,'medium'),('arise','wordle',5,'medium'),('array','wordle',5,'hard'),('asset','wordle',5,'medium'),
  ('audio','wordle',5,'medium'),('award','wordle',5,'medium'),('badly','wordle',5,'medium'),('baker','wordle',5,'medium'),
  ('basic','wordle',5,'easy'),('beach','wordle',5,'easy'),('began','wordle',5,'easy'),('begin','wordle',5,'easy'),
  ('being','wordle',5,'easy'),('below','wordle',5,'easy'),('bench','wordle',5,'medium'),('birth','wordle',5,'medium'),
  ('black','wordle',5,'easy'),('blame','wordle',5,'medium'),('blank','wordle',5,'medium'),('blind','wordle',5,'medium'),
  ('block','wordle',5,'easy'),('blood','wordle',5,'easy'),('board','wordle',5,'easy'),('boast','wordle',5,'hard'),
  ('bonus','wordle',5,'medium'),('brain','wordle',5,'easy'),('brand','wordle',5,'medium'),('bread','wordle',5,'easy'),
  ('break','wordle',5,'easy'),('brick','wordle',5,'medium'),('brief','wordle',5,'medium'),('bring','wordle',5,'easy'),
  ('broad','wordle',5,'medium'),('brown','wordle',5,'easy'),('brush','wordle',5,'medium'),('build','wordle',5,'easy'),
  ('buyer','wordle',5,'medium'),('cable','wordle',5,'medium'),('candy','wordle',5,'easy'),('cargo','wordle',5,'medium'),
  ('carry','wordle',5,'easy'),('catch','wordle',5,'easy'),('cause','wordle',5,'easy'),('chain','wordle',5,'easy'),
  ('chair','wordle',5,'easy'),('chalk','wordle',5,'medium'),('chaos','wordle',5,'hard'),('charm','wordle',5,'medium'),
  ('chart','wordle',5,'medium'),('chase','wordle',5,'medium'),('cheap','wordle',5,'medium'),('check','wordle',5,'easy'),
  ('chess','wordle',5,'medium'),('chest','wordle',5,'medium'),('chief','wordle',5,'medium'),('child','wordle',5,'easy'),
  ('chose','wordle',5,'medium'),('civil','wordle',5,'medium'),('claim','wordle',5,'easy'),('class','wordle',5,'easy'),
  ('clean','wordle',5,'easy'),('clear','wordle',5,'easy'),('click','wordle',5,'easy'),('cliff','wordle',5,'medium'),
  ('climb','wordle',5,'medium'),('clock','wordle',5,'easy'),('close','wordle',5,'easy'),('cloud','wordle',5,'easy'),
  ('coach','wordle',5,'medium'),('coast','wordle',5,'medium'),('cover','wordle',5,'easy'),('crack','wordle',5,'medium'),
  ('craft','wordle',5,'medium'),('crash','wordle',5,'medium'),('crazy','wordle',5,'medium'),('cream','wordle',5,'medium'),
  ('crime','wordle',5,'medium'),('cross','wordle',5,'easy'),('crowd','wordle',5,'medium'),('crown','wordle',5,'medium'),
  ('curve','wordle',5,'medium'),('cycle','wordle',5,'medium'),('daily','wordle',5,'easy'),('dance','wordle',5,'easy'),
  ('death','wordle',5,'easy'),('delay','wordle',5,'medium'),('depth','wordle',5,'medium'),('dirty','wordle',5,'easy'),
  ('doubt','wordle',5,'medium'),('dozen','wordle',5,'medium'),('draft','wordle',5,'medium'),('drama','wordle',5,'medium'),
  ('dream','wordle',5,'easy'),('dress','wordle',5,'easy'),('drink','wordle',5,'easy'),('drive','wordle',5,'easy'),
  ('early','wordle',5,'easy'),('earth','wordle',5,'easy'),('eight','wordle',5,'easy'),('elite','wordle',5,'hard'),
  ('empty','wordle',5,'easy'),('enemy','wordle',5,'medium'),('enjoy','wordle',5,'easy'),('enter','wordle',5,'easy'),
  ('equal','wordle',5,'medium'),('error','wordle',5,'medium'),('event','wordle',5,'easy'),('exact','wordle',5,'medium'),
  ('exist','wordle',5,'medium'),('extra','wordle',5,'easy'),('faith','wordle',5,'medium'),('false','wordle',5,'medium'),
  ('fault','wordle',5,'medium'),('field','wordle',5,'easy'),('fifth','wordle',5,'medium'),('fifty','wordle',5,'medium'),
  ('fight','wordle',5,'easy'),('final','wordle',5,'easy'),('first','wordle',5,'easy'),('flash','wordle',5,'medium'),
  ('fleet','wordle',5,'medium'),('floor','wordle',5,'easy'),('fluid','wordle',5,'hard'),('focus','wordle',5,'easy'),
  ('force','wordle',5,'easy'),('forth','wordle',5,'medium'),('forty','wordle',5,'medium'),('forum','wordle',5,'medium'),
  ('found','wordle',5,'easy'),('frame','wordle',5,'medium'),('fresh','wordle',5,'easy'),('front','wordle',5,'easy'),
  ('frost','wordle',5,'medium'),('fruit','wordle',5,'easy'),('funny','wordle',5,'easy')
on conflict (word, category) do nothing;

insert into public.word_bank (word, category, length, difficulty) values
  ('tiger','animals',5,'easy'),('zebra','animals',5,'easy'),('rabbit','animals',6,'easy'),('giraffe','animals',7,'medium'),
  ('elephant','animals',8,'easy'),('monkey','animals',6,'easy'),('dolphin','animals',7,'medium'),('penguin','animals',7,'easy'),
  ('cheetah','animals',7,'medium'),('koala','animals',5,'easy'),('panda','animals',5,'easy'),('otter','animals',5,'medium'),
  ('eagle','animals',5,'medium'),('falcon','animals',6,'medium'),('lizard','animals',6,'medium')
on conflict (word, category) do nothing;

insert into public.word_bank (word, category, length, difficulty) values
  ('apple','fruits',5,'easy'),('mango','fruits',5,'easy'),('grape','fruits',5,'easy'),('lemon','fruits',5,'easy'),
  ('banana','fruits',6,'easy'),('orange','fruits',6,'easy'),('cherry','fruits',6,'medium'),('papaya','fruits',6,'medium'),
  ('coconut','fruits',7,'medium'),('peach','fruits',5,'easy'),('melon','fruits',5,'easy'),('guava','fruits',5,'hard'),
  ('kiwi','fruits',4,'medium'),('plum','fruits',4,'easy'),('apricot','fruits',7,'medium')
on conflict (word, category) do nothing;

insert into public.word_bank (word, category, length, difficulty) values
  ('planet','space',6,'easy'),('galaxy','space',6,'easy'),('comet','space',5,'medium'),('meteor','space',6,'medium'),
  ('rocket','space',6,'easy'),('orbit','space',5,'medium'),('nebula','space',6,'hard'),('asteroid','space',8,'medium'),
  ('saturn','space',6,'easy'),('jupiter','space',7,'easy'),('venus','space',5,'easy'),('mars','space',4,'easy'),
  ('moon','space',4,'easy'),('star','space',4,'easy'),('shuttle','space',7,'medium')
on conflict (word, category) do nothing;

insert into public.word_bank (word, category, length, difficulty) values
  ('shark','ocean',5,'easy'),('whale','ocean',5,'easy'),('coral','ocean',5,'medium'),('octopus','ocean',7,'medium'),
  ('jellyfish','ocean',9,'hard'),('starfish','ocean',8,'medium'),('lobster','ocean',7,'medium'),('turtle','ocean',6,'easy'),
  ('seaweed','ocean',7,'medium'),('anchor','ocean',6,'medium'),('harbor','ocean',6,'medium'),('island','ocean',6,'easy'),
  ('wave','ocean',4,'easy'),('tide','ocean',4,'medium'),('current','ocean',7,'medium')
on conflict (word, category) do nothing;
