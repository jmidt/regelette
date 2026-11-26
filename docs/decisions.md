# Decisions

## 2026-10-18

### Repository Shape

- Use a monorepo with `apps/` and `packages/`
- Keep shared contracts and domain models in `packages/shared`
- Keep SQLite access in the server layer

### Stack

- Node.js + TypeScript for the game server
- React + Vite for both browser clients
- SQLite for local persistence

### Initial Runtime Assumption

- One machine hosts the server and serves browser clients over a local network

### MVP Product Constraints

- Support mixed trivia, prompts, and challenge content
- Support one active saved game session in the first release
- Assume open GM dashboard access on a trusted LAN for MVP

### Gameplay Direction

- Use a turn-based structure where the active contestant spins the wheel
- Use four wheel categories: question, challenge, rule, and action
- Treat wheel results as category selection followed by item selection from the relevant repository
- Reveal only the category publicly at first while the GM sees the specific item and answer details
- Keep scoring round-based with the winner determined by highest score after fixed full-table rounds
- Increase point value based on the number of active rules affecting a contestant
- Keep rule enforcement and point allocation under GM control rather than hard-coding adjudication into the engine
- Support room-wide rules and rule allocation beyond the active contestant
- Count expiring rules in full-table rounds
- Allow new rules to enter a temporary pool before GM assignment

### Director Model

- Support category weighting to shape pacing across the game
- Allow complete override of random outcomes when the GM needs a scripted result
- Keep director behavior flexible enough to enforce beats such as early-question rounds or delayed action introduction
- Load director behavior from a predetermined file before a game starts

### Content Authoring Direction

- Keep question, challenge, rule, and action repositories in simple human-editable files
- Prefer lightweight text formats such as Markdown or TOML over hard-coded content

### Shared State Direction

- Keep player order directly in the shared state and track the active player explicitly
- Represent assigned rules as concrete active-rule instances so duplicates and split rules can coexist
- Keep a single staging slot for the latest unresolved question or challenge result
- Keep separate rule pools for unassigned rules and room-wide rules
- Store loaded content-pack references and an optional loaded director reference in the game state
- Keep wheel results out of the persisted game state and treat them as operation or event data instead
- Track reversible applied operations in serializable history structures so undo remains possible

### Command And Event Direction

- Treat `wheel.spin` as a command rather than a durable state mutation
- Broadcast `wheel.result` as an event that clients such as the TV can visualize
- Keep the operation log limited to applied durable mutations only
- Favor mutation-shaped operations such as score changes, staged-outcome changes, rule moves, and turn advance
- Support GM-friendly score increment and decrement commands in addition to lower-level score mutations
- Let `turn.advance` follow fixed player order and perform round rollover automatically
- Keep rule duplication constrained to creating a copy in the unassigned pool
- Do not support arbitrary rule creation or rule field updates as shared operations

## 2026-10-19

### Live MVP Turn Model

- Use exactly two turn phases for the playable loop: waiting_for_spin and after_spin
- Do not keep intermediate or transitory phases in the durable model; they create stale UI state and muddy the GM flow
- Treat a spin as a mutating state action that immediately advances the game to the post-spin state with the selected staged outcome visible
- Require the GM to resolve a staged outcome and explicitly advance the turn before the next player becomes active
- If the staged outcome is a rule or action, leave it in the result box until the GM resolves it; advancing the turn is rejected while that slot remains occupied

### Client Flow

- Keep the TV client read-only and state-driven from the server snapshot
- Keep the GM dashboard as the write surface for spin, scoring, and turn resolution actions
- Allow a new game reset by entering a title and player list, then re-seeding the shared state from the server
- Expose a `maxRoomRules` option during new-game setup so the GM controls the room-wide rule cap at creation time

### Room Rule Capacity

- Default the room-wide rule cap to `0` so a new game starts with no active room rules unless configured otherwise
- Enforce FIFO eviction when a new room rule is added beyond the configured cap
- Keep the queue behavior deterministic and server-authoritative so both GM and TV clients show the same state

### Persistence Assumption

- The app persists only one active game snapshot at a time, matching the MVP requirement for a single local-network session
- In startup, the app restores the latest saved snapshot if one exists; otherwise it creates a fresh default game state

### Package Manager Choice

- Use `npm` workspaces for now because `pnpm` is not installed in the current environment
- Revisit `pnpm` later only if workspace performance or ergonomics justify the switch
