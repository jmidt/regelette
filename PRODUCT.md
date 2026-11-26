# Product

## Pitch

Regelette is a local-network party game where contestants answer trivia questions and complete simple challenges while accumulating personal rules that make every later turn harder. A contestant might have to speak like a pirate, avoid a common word, or obey some other persistent constraint, and breaking a rule costs points. The chaos escalates over time, but the pressure is balanced by a higher point payout for contestants who succeed while carrying more active rules.

The experience is designed for a game master running the room, a TV showing the public state, and contestants playing in person. The tone should stay silly and family-and-friends friendly while still feeling increasingly chaotic.

The game runs for a fixed number of full-table rounds, for example 15 rounds, where one full round means every contestant has taken one turn.

## Core Loop

1. The active contestant starts their turn.
2. They spin the wheel.
3. The wheel publicly shows a category outcome.
4. The game master resolves the specific item, points, and any rule changes needed for that outcome.
5. The turn stays open until the game master advances to the next player.
6. Play advances to the next contestant and the wheel is ready again.

Other contestants are still live during someone else’s turn. They may gain or lose points by maintaining their own active rules or by catching competitors who break theirs.

## Gameplay Principles

- The game should escalate in complexity and social pressure over time.
- Rules should be persistent enough to shape later turns, not just one-off gimmicks.
- The game master should be able to adjudicate ambiguous outcomes quickly and manually.
- The TV should show the room-facing truth clearly: whose turn it is, what rules are active, what the wheel produced, and how scores changed.
- The dashboard should keep the operator ahead of the room rather than buried in controls.
- Rules and scoring should stay flexible enough that the GM can put a finger on the scale when needed.

## Wheel Outcome Types

- Question: a trivia item selected from a question repository
- Challenge: a simple prompt or in-person task selected from a challenge repository
- Rule: a rule item selected from a rule repository
- Action: an effect that changes rules or scoring state under GM control

The audience-facing wheel should initially reveal only the category. The specific question, challenge, rule, or action should be available to the game master and revealed deliberately as needed.

The implementation should treat this as category selection first, then content selection within the chosen category. The category choice may be weighted or fully overridden by a director or manuscript system when the game master needs pacing control.

Content repositories should stay simple for humans to write and maintain. The first implementation should prefer file-backed content in a lightweight authoring format such as Markdown or TOML rather than burying prompts inside application code.

## Rule Model

- Basic rules are persistent until removed.
- Some rules may expire after a number of full-table rounds.
- Some rules may spawn multiple smaller rules for later allocation.
- New rules may enter a temporary pool before being assigned.
- Rule allocation is not limited to the active contestant.
- Room-wide rules should be supported as an option.
- Rule management may remain fully manual in the GM dashboard.
- Even ordinary rules may flow through the temporary pool before the GM assigns them to a contestant.

## Scoring Direction

- Breaking an active rule should cost points.
- Succeeding on a question or challenge should be worth 1 point plus 1 additional point per active rule affecting that contestant.
- Breaking an active rule should cost 1 point.
- The contestant who calls out a broken rule should gain 1 point.
- Other contestants may score through off-turn catches or lose points for their own rule failures.
- Scoring remains manually awarded by the GM, even when the default model is binary.
- The initial win condition is highest score after a fixed number of full-table rounds.
- Ties should result in shared winners.

## Control Model

- Contestants are fixed for the duration of a game.
- The GM advances play manually with an explicit next-player action.
- Rule enforcement and callouts should stay informal rather than becoming a rigid engine workflow.
- Question answers should be visible to the GM but hidden from the TV audience.
- The system should support both weighted randomness and complete manual override of wheel outcomes.

## Director And Manuscript

The game should support a lightweight director layer that can influence or override category outcomes in order to shape pacing. This should make it possible to:

- Ensure early rounds emphasize questions before heavier rule chaos begins
- Increase the likelihood of rules in specific stretches of the game
- Delay actions until the game is underway
- Keep rule distribution roughly fair across contestants when desired
- Fully override the random result when the GM wants a scripted beat

The director should be defined as a file loaded into a game before that game starts. It is intended to be predetermined configuration rather than something the game engine invents on the fly.

## MVP Product Boundaries

- Configurable contestant count
- Single active saved game session
- Host machine on a local network
- Open GM dashboard on a trusted LAN
- SQLite-backed recovery of the current game state after a crash or restart

## Product Questions Still Open

- What exact rule categories should exist at launch?
- How should actions be categorized: one-shot, persistent, or both?
- Which concrete file format should content repositories use first: Markdown, TOML, or another lightweight text format?
- How much of the director file should be declarative configuration versus explicit scripted overrides?
- Whether contestants eventually need personal device interactions