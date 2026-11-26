# AGENTS.md

This repository is structured so coding agents can make progress with minimal re-discovery between prompts.

## Project Intent

Build a local-network party game application with three primary surfaces:

- A Node.js game server as the source of truth
- A TV client for the audience-facing display
- A game-master dashboard for control and orchestration

The product direction is a roulette-driven game with escalating rules, prompts, and contestant state that persists safely through crashes or restarts.

## Source Of Truth Files

When continuing work, check these files first:

- `README.md` for product framing and environment assumptions
- `PRODUCT.md` for the detailed game pitch, loop, and product rules
- `docs/roadmap.md` for planned milestones
- `docs/progress.md` for completed work and latest status
- `docs/context-log.md` for durable design notes and unresolved questions
- `docs/decisions.md` for architectural choices

## Working Rules

- Prefer minimal, vertical slices over broad speculative infrastructure.
- Keep shared game models in `packages/shared`.
- Keep persistence concerns behind the server boundary.
- Assume local-network use first unless the docs say otherwise.
- Preserve crash recovery behavior when changing game state flows.

## Expected Near-Term Priorities

1. Define the shared game state and event protocol.
2. Implement server state persistence with SQLite.
3. Connect the TV client to read-only live state.
4. Connect the GM dashboard to mutation actions.
5. Add active-turn, wheel outcome, scoring, and rule-escalation mechanics.

## Update Protocol

After meaningful changes:

- Update `docs/progress.md` with what changed.
- Update `docs/decisions.md` if an architectural choice was made.
- Update `docs/context-log.md` with unresolved questions or assumptions that matter later.

## Open Questions To Resolve Early

- Prompt taxonomy details and authoring workflow
- Whether the open GM dashboard model needs a lightweight lock screen later
- When to add hardware-specific setup guidance for the host machine
- Whether players should have any explicit challenge timers or judge-confirmed resolutions
- Whether contestants eventually need personal device interactions
