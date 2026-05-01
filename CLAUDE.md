# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`lizard-flap` — a Flappy Bird–style HTML5 canvas game (the player is a propeller-hat lizard) built with Vite + TypeScript. No game framework; rendering is hand-rolled 2D canvas, audio is synthesized via WebAudio. Targets a 360×640 virtual playfield that is letterboxed to the window via integer scaling.

## Commands

- `npm run dev` — runs both the Vite dev server (5173) and the leaderboard API server (3001) under `concurrently`. `/api/*` requests are proxied from Vite to the API.
- `npm run dev:web` / `npm run server` — start the two halves separately when you need to inspect logs.
- `npm run build` — type-check (`tsc`) then `vite build`. Type errors fail the build.
- `npm run preview` — serve the production frontend build (start `npm run server` alongside it for the API).
- `npm run lint` — ESLint over `.ts` files.
- `npm run format` — Prettier write on `src/**/*.{ts,css,html}`.
- `npm test` — Vitest in watch mode. Run a single file with `npx vitest run src/game/Clock.test.ts` or filter by name with `npx vitest -t "fixed-dt"`.

Cloudflare deploy (one-time):

1. `wrangler d1 create lizard-flap-leaderboard` → paste the printed `database_id` into `wrangler.toml`.
2. `wrangler d1 migrations apply lizard-flap-leaderboard --remote` to create the `players` table.
3. Push to the connected branch — Cloudflare auto-runs `npm run build`, serves `dist/` via the `[assets]` binding, and routes everything else through `worker/index.js` with `env.DB` (D1) bound.

`?debug` in the URL (or any `import.meta.env.DEV` build) enables `DebugOverlay` (FPS + clicks-per-second HUD).

## Architecture

### Entry → game loop

`src/main.ts` grabs `#game` and constructs `Game`. `Game` (`src/game/Game.ts`) owns every subsystem and runs a single `requestAnimationFrame` loop. The loop is **fixed-timestep with rendering interpolation**:

- `Clock.step(frameDt)` (`src/game/Clock.ts`) accumulates real time and emits N discrete `1/60s` updates plus a fractional `alpha` for interpolation. `frameDt` is clamped to `MAX_FRAME_DT` to prevent the spiral of death.
- The loop calls `scenes.update(1/60)` exactly `steps` times, then renders once with `alpha`. Anything in entities that needs smooth motion (e.g. `Lizard`) keeps a `prevY/prevRot` and lerps in `render()`.
- `visibilitychange` resets the clock and pauses, so a backgrounded tab does not produce a giant catch-up batch on return.

Tunables live in `src/config.ts` (gravity, flap impulse, scroll speed, pipe geometry, difficulty ramp, localStorage keys). Prefer adding constants there over magic numbers in scene/entity code.

### Scenes

`SceneManager` holds one active `Scene` (`src/game/scenes/Scene.ts`). Scenes are full-screen states: `MenuScene`, `PlayScene`, `PauseScene`, `GameOverScene`, `LeaderboardScene`. Transitions go through `GameContext.goTo(new SomeScene(ctx, …))`. Each scene receives the same `GameContext` (audio, effects, score, settings, buttons, leaderboard, renderer, `promptForName()`), so scene code never reaches into `Game` directly.

Input is event-driven, not polled: `Input` exposes `onFlap`, `onPress(x, y)`, `onPauseToggle`, `onToggleMute`, `onAction`. `Game` wires `onPress` into `ButtonLayer` first, and only fires flap if no button consumed the event. Scenes register their on-screen buttons in `enter()` via `ctxMgr.buttons.set([...])` and clear them in `exit()`.

### Entities and systems

- **Entities** (`src/game/entities/`) — own state and `update(dt)`/`render(ctx)` for one visible thing: `Lizard`, `Pipe`, `PipePool` (object-pooled, fixed-size 6), `Background`, `Ground`, `KiwiFlock`, `FlyFlock`, `Hawks`. Pipes are spawned at `nextSpawnX` and recycled when off-screen.
- **Systems** (`src/game/systems/`) — cross-cutting services: `Collision` (circle/rect, circle/circle), `Difficulty` (linear ramp from `SCROLL_SPEED`/`PIPE_GAP` toward `DIFFICULTY_MAX_SCROLL`/`DIFFICULTY_MIN_GAP` over `DIFFICULTY_RAMP_SCORES`), `Effects` (screen shake, hit-stop, white flash; respects `prefers-reduced-motion`), `Particles`, `Score`, `Settings`, `Leaderboard`, `Audio`/`Music`, `Buttons`, `AssetLoader`.
- All randomness for gameplay goes through `utils/rng.ts` (seedable xorshift) so behavior can be made deterministic in tests.

### Audio

`Audio` is fully synthesized — no audio files. SFX (`flap`/`score`/`hit`/`die`/`lick`) are short oscillator/noise bursts. `Music` is a step sequencer that schedules notes ~120ms ahead via `setInterval` + `AudioContext` time; it has two modes (`jazz`/`rock`) selected by `PlayScene` based on score crossing `NIGHT_THRESHOLD`. The `AudioContext` is created lazily on first user interaction (`audio.resume()` is called from `onFlap`) to satisfy browser autoplay policies.

### Persistence

Local (browser, in `config.ts`):

- `STORAGE_KEY` — high score (`Score`)
- `SETTINGS_KEY` — `{ muted, playerName }` (`Settings`)

Both wrap reads/writes in try/catch so privacy mode / quota errors don't crash the game.

Global, two interchangeable backends with the **same schema and same API contract**:

- **Local dev** — `server/index.mjs` (Express + `node:sqlite`, file at `server/leaderboard.db`, override with `LB_DB_PATH`). Started by `npm run dev`; Vite proxies `/api/*` to it on `:3001`.
- **Production on Cloudflare Workers + Static Assets** — `worker/index.js` is the Worker entry. It dispatches `/api/*` to the handlers under `functions/api/*.js` (still written in the Pages Functions handler shape so the same files are reusable from either deploy model) and falls through to the static `[assets]` binding for everything else. `not_found_handling = "single-page-application"` in `wrangler.toml` covers SPA fallback. The D1 binding is `env.DB`; helpers shared between handlers live in `functions/_lib/`. Schema migration in `migrations/0001_init.sql` is applied with `wrangler d1 migrations apply lizard-flap-leaderboard --remote`.

Both back the same single `players` table whose primary key is `name TEXT COLLATE NOCASE`, so name uniqueness is enforced atomically by the DB itself — there's no second-check race. The API surface:

- `GET  /api/leaderboard` — sorted entries with `score > 0 OR flies > 0`.
- `POST /api/players { name }` — `INSERT OR IGNORE`. Returns `201` on first claim, `409 name_taken` if anyone (case-insensitively) already owns it, `400 invalid_name` if format is wrong.
- `POST /api/runs { name, score, flies }` — updates the row only if the name has been claimed (`404 name_not_claimed` otherwise) and only if the new run beats the stored one. Returns the player's rank plus a fresh leaderboard snapshot.
- `GET  /api/players/:name` — existence check.

Names must match `^[A-Za-z0-9 _-]+$` (English letters/digits + space/`-`/`_`), 1–14 chars after trimming. The same regex lives in `src/utils/name.ts` so the client can pre-validate before round-tripping.

The frontend `Leaderboard` (`src/game/systems/Leaderboard.ts`) is a thin async API client. It keeps a synchronous `entries[]` cache so `LeaderboardScene.render()` can stay frame-driven; `refresh()` is fired on `MenuScene.enter()` and at game start, and `submit()` updates the cache from its own response. `GameOverScene` submits asynchronously and patches its `rank` field when the response lands. `Game.promptForName()` is async and uses `leaderboard.claimName()` — name picking is a server-reserve operation, not just a local string write.

### Rendering and scaling

`Renderer` sets the canvas backing-store to `VIRTUAL_WIDTH × VIRTUAL_HEIGHT` and resizes the CSS box to an integer multiple of that (computed from `window.innerWidth/innerHeight`). Pointer coords are mapped back to virtual space via `Renderer.clientToCanvas(clientX, clientY)` — never use raw `clientX/Y` for hit-testing buttons or the playfield. `imageSmoothingEnabled = false` for crisp pixels.

## TypeScript / lint conventions

`tsconfig.json` is strict and adds `noUnusedLocals`, `noUnusedParameters`, `exactOptionalPropertyTypes`, `noImplicitOverride`, and `noFallthroughCasesInSwitch`. ESLint allows unused params prefixed `_`. Prettier: 2-space, double quotes, trailing commas, 100-col.

## Tests

Vitest with the default Node environment. Tests live next to the code as `*.test.ts`. They focus on pure logic that doesn't need DOM/canvas/audio: `Clock`, `Difficulty`, `Score`, `Collision`, `Particles`, `PipePool`, `Lizard`. When adding behavior to those modules, extend the colocated test rather than introducing a new harness.
