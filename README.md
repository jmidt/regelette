# Regelette

Regelette is a local-network party game inspired by the escalating-rule energy of a roulette-driven quiz and challenge show. It runs a central game server, a TV-facing browser client for the public display, and a game-master dashboard that controls the flow of play.

For the fuller product pitch and gameplay intent, see `PRODUCT.md`.

## Current Stack

- Monorepo with `npm` workspaces
- TypeScript across server and clients
- Node.js game server
- React + Vite for the TV client
- React + Vite for the game-master dashboard
- SQLite for crash-safe persistence of current game state
- Shared package for event contracts and game models

## Planned Workspace Layout

```text
apps/
  server/
  tv-client/
  gm-dashboard/
packages/
  shared/
docs/
```

## MVP Direction

The first milestone is centered on a configurable contestant count with a single host machine serving the application over a local network.

The first content model should support a mixed set of trivia, prompts, and challenge-style actions.

The core loop is turn-based: the active contestant spins the wheel, resolves the resulting question, prompt, rule, or action, and then play moves to the next contestant.

Game content and director behavior are expected to come from human-editable files loaded before play rather than being hard-coded into the app.

Included in the current MVP definition:

- Live TV display synchronized to game-master actions
- Crash-safe persistence for the full current game state
- Score tracking
- One active game session at a time
- Open GM dashboard access on a trusted local network

Persistence should preserve at least:

- Current game and round state
- Turn order and active contestant
- Wheel contents and used prompts
- Loaded content set and director configuration
- Scores and penalties
- Current player rules

## Development Model

One machine hosts the server and both web clients. Other devices on the same LAN should be able to open the TV display or game-master dashboard in a browser.

## Next Build Targets

1. Establish the shared game model and event protocol.
2. Bring up a persistent game server with SQLite-backed snapshots.
3. Render a basic TV display connected to live state.
4. Render a basic GM dashboard that can mutate state.
5. Add wheel/spin mechanics, active-player turn flow, and player-specific rule escalation.

## Open Questions

- Do you want the README to include installation and run instructions for specific deployment hardware yet, or keep it developer-focused for now?

## Getting Started

Install dependencies:

```bash
npm install
```

Run all three services in development:

```bash
npm run dev
```

Run individual services:

```bash
npm run dev:server
npm run dev:tv
npm run dev:gm
```

## Status

This repository is now at an early playable MVP stage. The server owns the authoritative game state, SQLite persists the active game snapshot, the TV client mirrors that state, and the GM dashboard can create a new game, spin the wheel, adjust scores, and advance turns.

The remaining work is focused on polish and deeper gameplay behaviors rather than the foundational server/client synchronization and persistence model.
