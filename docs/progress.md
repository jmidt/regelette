# Progress

## 2026-10-18

### Completed

- Chose the initial stack: TypeScript, Node.js, React, Vite, and SQLite
- Chose a monorepo layout with separate server, TV client, GM dashboard, and shared package boundaries
- Captured MVP assumptions for local-network play and crash-safe persistence
- Captured MVP content and session constraints: mixed prompt types, one active game, and open GM access on a trusted LAN
- Captured the first-pass product loop: active-player turns, wheel-driven outcomes, player-specific rules, and fixed-round scoring
- Captured the director model, informal GM adjudication, category-first wheel design, and round-based rule expiry semantics
- Replaced the placeholder shared model with a serializable game-state shape covering players, turns, round counts, rule pools, content/director references, wheel state, and undo-oriented operation history
- Simplified the shared model by removing persisted wheel state and collapsing unnecessary public/private state duplication
- Added a simple shared staging slot for question and challenge results outside the rule pools
- Defined the first command, event, and durable-operation boundaries for wheel, scoring, staged outcomes, rules, and turn advancement
- Created baseline project documentation and working-agent guidance
- Scaffolded initial application shells and workspace configuration

## 2026-10-19

### Completed

- Implemented the shared game-operation reducer layer for score changes, staged outcomes, rule move/delete/duplicate flows, and turn advancement
- Added command-to-operation mapping for score increments/decrements and turn advances, including their emitted events
- Added behavioral regression tests covering score changes, staged outcomes, and multi-player turn wrapping
- Added a simple markdown demo content pack with question, challenge, rule, and action entries
- Added shared content-pack loading utilities and a new-game factory for creating a game from selected packs
- Added a server-side new-game API and content-pack listing endpoint
- Added SQLite-backed snapshot persistence for the current game object
- Added server-side wheel spin behavior that selects a weighted category and stages a question, challenge, rule, or action outcome
- Added a pending-rule result flow so rule and action spins remain in the result box until the GM resolves them
- Locked turn advancement while a pending rule or action remains unresolved in the staged result slot
- Corrected the turn model to the intended two-phase loop: waiting_for_spin and after_spin
- Wired both browser clients to read the live game state over HTTP and Socket.IO
- Added a GM dashboard flow for creating a new game, spinning, scoring, assigning rule outcomes, and advancing turns
- Verified the monorepo builds and the server + clients boot together

### Current State

The app is now at an early playable MVP state: the server owns the authoritative game state, SQLite persists the active session, the TV client mirrors that state, and the GM dashboard can start a game and drive the basic loop. The remaining gap is polish and deeper gameplay features rather than the foundational engine itself.

## 2026-10-25

### Completed

- Added a `maxRoomRules` game setting to the shared state model and defaulted it to `0` so the room-wide rule pool starts empty unless the GM enables it
- Enforced room-wide rule capacity as a FIFO queue: adding a new rule evicts the oldest active room rule once the configured cap is reached
- Wired the room-rule cap through the server new-game endpoint and the GM dashboard’s new-game form
- Added a regression test covering the FIFO eviction and cap-guard behavior for room rules

### Design Note

Room-wide rules are now created and configured from the new-game flow instead of being implicitly unlimited. This keeps the default state safe and predictable while letting the GM opt into a capped rule pool with deterministic eviction.

### Pending Decisions

- Prompt authoring workflow and storage format for richer game content packs
- Whether and when to add a GM lock screen
- Host-machine setup guidance for a real room deployment
- Timing and adjudication model for challenge resolution and off-turn rule breaks
- Whether to add a dedicated “load old game” restore UI once the save/resume flow becomes a first-class feature
