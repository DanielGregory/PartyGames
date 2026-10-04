# PartyGames

Mobile-friendly multiplayer party games. No accounts — a host creates a room,
gets a 4-letter code (and QR code), and everyone else joins from their own
phone. It's a single Next.js (App Router) app deployed to Vercel — no
separate real-time server to run or deploy. Room state lives in a Supabase
Postgres table, and [Supabase Realtime](https://supabase.com/docs/guides/realtime)
Broadcast channels push live updates to each player's browser.

**[Play it →](https://party-games-ruby.vercel.app)**

19 game modes, each with host-adjustable settings and a shared cross-game scoreboard:

- **Party:** Spyfall, Fibbing It, Trivia, Most Likely To, Quiz Master, Pictionary
- **Word:** Wordle, Boggle, Word Search, Hangman
- **Board and cards:** Uno, Sorry!, Yahtzee, War, Blackjack, Texas Hold'em
- **2-player:** Connect Four, Battleship, Guess Who

## Architecture

- `server/room.ts` — the authoritative room/lobby/player/score logic, called
  from Next.js API routes (`app/api/rooms/[code]/...`). Loads a room's state
  from Postgres, applies a message, saves it back, then pushes the result to
  every player.
- `server/games/` — each game mode is an isolated module implementing the
  `GameModule` interface (`server/types.ts`): `next()` to start a round,
  `action()` to apply a player move, and `redact()` to produce the per-player
  view (so secrets like a Spyfall role or a Fibbing It author never reach the
  wrong client). Adding a new mode means adding one module and registering it
  in `server/games/registry.ts` — the shared lobby, scoreboard, and
  round-advance UI need no changes.
- **Realtime transport**: each player gets a random, unguessable
  `privateToken` when they join (returned only to them, never broadcast to
  others) and subscribes to a Supabase Realtime channel named
  `room-{code}-{privateToken}`. After every action, the server computes each
  player's own redacted view and broadcasts it to their private channel —
  this is how hidden information (who's the spy, who wrote which fake answer)
  stays hidden even though the whole app runs through one shared Postgres row.
- **Liveness**: there's no persistent connection to "the server" the way a
  websocket would give you, so each client pings a lightweight heartbeat
  endpoint every 8s; a player is considered connected if we've heard from
  them (heartbeat or any action) in the last 20s.
- `app/`, `components/` — the Next.js client. `components/GameShell.tsx`
  renders the active game module's component and a shared scoreboard/"next
  round" panel whenever `game.roundOver` is true.
- `lib/gameMeta.ts` — a client-safe list of game names/descriptions, kept
  separate from `server/games/registry.ts` so prompt/answer banks never end
  up in the browser bundle.
- `supabase/schema.sql` — the one table this app needs (`rooms`). Row Level
  Security is on with zero policies, so only the service-role key (used
  exclusively by the server-side API routes) can read or write it; the
  public anon key can't touch it directly.

## One-time Supabase setup

No CLI required — everything below is clicking through the Supabase
dashboard.

1. Create a project at [supabase.com](https://supabase.com) (free tier is
   plenty for this).
2. Open **SQL Editor** → **New query**, paste the contents of
   `supabase/schema.sql`, and run it.
3. Open **Settings → API** and copy three values: the **Project URL**, the
   **anon public** key, and the **service_role** key.

## Local development

Requires Node 20.9+.

```bash
npm install
cp .env.example .env.local   # paste in the 3 Supabase values from above
npm run dev
```

Open `http://localhost:3000`, create a room, and open the room link in
another tab (or on your phone, once both are on the same network and you
swap `localhost` for your machine's LAN IP) to join as a second player.
Realtime and the database are both the real hosted Supabase project — there's
nothing to run locally besides `next dev`.

## Deploying

```bash
npx vercel
```

In the Vercel project's environment variables, set the same three values
from `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Redeploy. That's it — one app, one deploy target, no separate real-time
server to stand up.

## Adding a new game mode

1. Add a server module in `server/games/<mode>.ts` implementing `GameModule`
   (see `server/games/trivia.ts` for the simplest example).
2. Register it in `server/games/registry.ts`.
3. Add its metadata to `lib/gameMeta.ts` (id, label, description, min players).
4. Add a `components/games/<Mode>Game.tsx` view component and wire it into
   `components/GameShell.tsx`.

The room/lobby/join flow, score tracking, and the round-over scoreboard panel
are all shared — no other file needs to change.

### Note on high-frequency modes (Pictionary)

The message envelope (`{ type: "game_action", payload }`) is opaque to the
core router, so Pictionary's stroke events (`start_stroke`, `add_points`,
`clear_canvas`) needed no changes to the room/lobby code. It batches stroke
points so each action carries several. If drawing ever needs to be smoother,
the adjustment worth making: right now every action does a full
load-reduce-persist-broadcast-to-everyone cycle, which is fine at
"someone voted" frequency but wasteful at "30 messages/second per drawer."
Give that mode's high-frequency events a pass-through broadcast path (relay
directly via Supabase Realtime, skip the Postgres round-trip) rather than
running them through `server/room.ts`'s reducer.
