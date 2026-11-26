# Roadmap

## Phase 0: Foundation

- Scaffold monorepo for server, TV client, GM dashboard, and shared package
- Establish documentation and durable working notes
- Define local development workflow

## Phase 1: Shared Model And Transport

- Define game domain types in `packages/shared`
- Define socket event contracts for state sync, turn progression, and GM actions
- Establish a stable shape for persisted game state

## Phase 2: Persistent Game Server

- Added server runtime and WebSocket layer
- Added SQLite persistence for the current game state snapshot
- Added restore-on-start behavior from the latest saved snapshot
- Added active turn, score, and staged-outcome state management
- Kept scope to one active saved game session for the first release
- Added a content-pack registry and a new-game creation API for selecting packs and player names

## Phase 3: TV Client

- Added live game-state display for the title, contestant list, scores, current round, and active player
- Added prompt rendering for the staged wheel outcome
- Reflect rule escalation visibly and clearly for the room as the game model evolves

## Phase 4: GM Dashboard

- Added game session creation with custom title and player list
- Added live state view for round, turn, scores, and current outcome
- Added wheel-spin action, score adjustment controls, and turn-advance controls
- Added a basic GM flow for real-time session operations

## Phase 5: Core Game Mechanics

- Implement roulette or equivalent selection UI and turn-resolution logic
- Track mixed trivia, prompt, challenge, rule, and action outcomes with escalating rule effects
- Support configurable contestant counts
- Apply higher scoring to contestants carrying more active rules

## Phase 6: Director TOML And Advanced Wheel Rules

- Add a TOML-based director file to configure weighted categories and future override logic
- Revisit manually controlled spin outcomes after the persistence and basic game loop are stable
- Keep the MVP wheel fully random while the director system remains queued for later work

## Phase 7: Polish And Reliability

- Improve reconnect handling across clients
- Add test coverage for game state transitions
- Improve LAN setup documentation and operator workflow

## Known Open Questions

- Prompt authoring format and content management workflow
- Timing for adding a GM lock screen or passcode gate
- Whether the first operator guide should target a specific hardware setup
- Whether off-turn rule breaks should be adjudicated manually or with explicit GM controls
