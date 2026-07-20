# PartyGames

Mobile-friendly multiplayer party games. No accounts — a host creates a room,
gets a 4-letter code (and QR code), and everyone else joins from their own
phone. Next.js (App Router) renders the UI; a [PartyKit](https://www.partykit.io)
server holds the authoritative room state and pushes live updates over
WebSockets.

Game modes: **Spyfall**, **Fibbing It**, **Trivia**, **Most Likely To**.

## Architecture

- `party/` — the PartyKit server. `party/main.ts` owns the room/lobby/player/
  score state and message routing. Each game mode is an isolated module under
  `party/games/` implementing the `GameModule` interface (`party/types.ts`):
  `next()` to start a round, `action()` to apply a player move, and `redact()`
  to produce the per-player view (so secrets like a Spyfall role or a Fibbing
  It author never reach the wrong client). Adding a new mode means adding one
  module and registering it in `party/games/registry.ts` — the shared lobby,
  scoreboard, and round-advance UI need no changes.
- `app/`, `components/` — the Next.js client. `components/GameShell.tsx`
  renders the active game module's component and a shared scoreboard/"next
  round" panel whenever `game.roundOver` is true.
- `lib/gameMeta.ts` — a client-safe list of game names/descriptions, kept
  separate from `party/games/registry.ts` so prompt/answer banks never end up
  in the browser bundle.

## Local development

Requires Node 20.9+.

```bash
npm install
cp .env.example .env.local   # NEXT_PUBLIC_PARTYKIT_HOST=localhost:1999

npx partykit dev              # terminal 1 — the room server, port 1999
npm run dev                    # terminal 2 — the Next.js app, port 3000
```

Open `http://localhost:3000`, create a room, and open the room link in
another tab (or on your phone, once both are on the same network and you
swap `localhost` for your machine's LAN IP) to join as a second player.

## Deploying

**1. Deploy the PartyKit server:**

```bash
npx partykit login
npx partykit deploy
```

This publishes `party/main.ts` (per `partykit.json`) to something like
`https://partygames.<your-partykit-username>.partykit.dev`.

**2. Deploy the Next.js app to Vercel:**

```bash
vercel
```

In the Vercel project's environment variables, set:

```
NEXT_PUBLIC_PARTYKIT_HOST=partygames.<your-partykit-username>.partykit.dev
```

(no `https://`, no trailing slash) and redeploy. That's the only environment
variable the app needs — there's no database and no auth to configure.

## Adding a new game mode

1. Add a server module in `party/games/<mode>.ts` implementing `GameModule`
   (see `party/games/trivia.ts` for the simplest example).
2. Register it in `party/games/registry.ts`.
3. Add its metadata to `lib/gameMeta.ts` (id, label, description, min players).
4. Add a `components/games/<Mode>Game.tsx` view component and wire it into
   `components/GameShell.tsx`.

The room/lobby/join flow, score tracking, and the round-over scoreboard panel
are all shared — no other file needs to change.
