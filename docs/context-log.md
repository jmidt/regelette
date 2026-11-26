# Context Log

## Product Summary

Regelette is a party game with escalating rules, trivia, and challenge turns controlled by a game master and displayed on a TV client.

## Confirmed Assumptions

- Contestant count should be configurable
- Initial runtime model is one host machine on a local network
- MVP should include crash-safe persistence of the full current game state
- MVP should include live TV sync and score tracking
- Initial content should mix trivia, prompts, and challenges
- MVP should support one active saved game session at a time
- GM dashboard can be open on a trusted LAN for the first release
- The game is turn-based, with the active contestant spinning the wheel
- The game runs for a fixed number of full-table rounds, for example 15
- Wheel outcomes are modeled as four public categories: question, challenge, rule, and action
- The wheel should reveal category publicly while the GM sees the specific item payload
- Contestants with more active rules should be worth more points when they succeed
- Other players can gain or lose points off-turn by following or breaking their own rules and by calling out failures
- Turn resolution stays open until the GM explicitly advances to the next player
- Contestants are fixed for the duration of a game
- Rule management and point awards can stay manual in the GM dashboard
- Rules may be player-bound or room-wide
- Expiring rules should count down in full-table rounds, not per-player turns
- Director logic should support weighted outcomes and full override when needed
- Content repositories should stay human-editable and file-backed
- MVP content packs will use simple Markdown files with a small item catalog per category
- Director behavior is intentionally deferred to a later phase and should come from a TOML file loaded before game start
- New rules can enter a temporary pool before manual assignment by the GM
- Shared state should be fully serializable for persistence
- Shared state should keep players ordered, track current turn explicitly, and separate unassigned and room-wide rule pools
- Shared state should include a single staging area for the latest unresolved question or challenge
- Shared state should exclude transient wheel visualization state and keep wheel outcomes in operations or events instead
- Operation history should support undo by storing reversible applied operations
- Commands, events, and durable operations should be separate layers
- Wheel spins should be commands, wheel results should be broadcast events, and only resulting mutations should enter the durable operation log

## Unresolved Questions

- Which lightweight authoring format should content repositories use first?
- When should GM access protection be introduced?
- Should host-machine setup docs target a specific room or hardware package?
- Should turn actions be immediate one-shot effects, persistent state, or both?
- How much of the director system should be declarative configuration versus explicit scripted overrides?
- How should the temporary rule-pool assignment UX work on the GM dashboard?
- How much of the operation log should be exposed in the GM dashboard versus kept as persistence-only history?
- Should there be a later UX for editing the room-rule limit mid-game, or is this intentionally a setup-time configuration?

## Notes For Future Work

- Keep persistence model simple until the game flow stabilizes.
- Favor explicit state snapshots and event logs over hidden in-memory derived state.
- Preserve recoverability whenever adding wheel or rule progression logic.
- Model off-turn scoring and rule-break events explicitly rather than burying them in UI-only state.
- Separate public wheel-category presentation from private GM-only payload details.
- Keep content repositories and director files editable outside the app by non-programmers when practical.
- Keep active rules as concrete instances so duplicated or split rules can coexist even when they point to the same content definition.
- Avoid parallel public and private game-state types unless the persisted model genuinely contains secrets.
- Do not require staged question or challenge outcomes to be cleared before advancing to the next turn.
- Keep score changes ergonomic for the GM with increment and decrement command shapes even if durable mutations remain generic.
- Treat room-wide rule capacity as a setup-time constraint and enforce it in the shared reducer so all entry points honor the same queue semantics.
