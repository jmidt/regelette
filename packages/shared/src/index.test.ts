import test from "node:test";
import assert from "node:assert/strict";

import {
  type ActiveRule,
  type GameOperation,
  type GameSnapshot,
  type GameState,
  type StagedOutcome,
  createInitialGameState,
  applyOperation,
  applyCommand,
  createGameFromSelection,
  loadMarkdownContentPack,
  recordAppliedOperation,
  undoGameSnapshot,
} from "./index.js";

test("score.adjust updates a player score", () => {
  const state = createInitialGameState({ playerNames: ["A", "B"] });
  const result = applyOperation(state, {
    type: "score.adjust",
    playerId: "p1",
    delta: 3,
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("expected success");
  }
  assert.equal(result.state.players[0]?.score, 3);
});

test("turn.advance wraps to next round and next player", () => {
  const state = createInitialGameState({ playerNames: ["A", "B"], totalRounds: 3 });
  const withTurn = {
    ...state,
    turn: {
      ...state.turn,
      currentPlayerId: "p2",
      turnNumber: 2,
      phase: "after_spin" as const,
    },
  };

  const result = applyOperation(withTurn, { type: "turn.advance" });

  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("expected success");
  }
  assert.equal(result.state.turn.currentPlayerId, "p1");
  assert.equal(result.state.roundNumber, 3);
  assert.equal(result.state.turn.phase, "waiting_for_spin");
});

test("stagedOutcome.set and clear work as an atomic then clearable state", () => {
  const state = createInitialGameState({ playerNames: ["A"] });
  const outcome: StagedOutcome = {
    category: "question",
    item: {
      ref: { packId: "pack-1", itemId: "q-1" },
      title: "Capital of France",
      prompt: "Name the capital of France.",
      answer: "Paris",
      notes: null,
    },
    stagedAt: "2026-10-19T00:00:00.000Z",
  };

  const setResult = applyOperation(state, {
    type: "stagedOutcome.set",
    stagedOutcome: outcome,
  });
  assert.equal(setResult.ok, true);
  if (!setResult.ok) {
    throw new Error("expected success");
  }

  const clearResult = applyOperation(setResult.state, { type: "stagedOutcome.clear" });
  assert.equal(clearResult.ok, true);
  if (!clearResult.ok) {
    throw new Error("expected success");
  }
  assert.equal(clearResult.state.stagedOutcome, null);
});

test("turn.advance clears any staged wheel outcome before the next player begins", () => {
  const state = createInitialGameState({ playerNames: ["A", "B"], totalRounds: 3 });
  const stagedState = {
    ...state,
    stagedOutcome: {
      category: "question" as const,
      stagedAt: "2026-10-19T00:00:00.000Z",
      item: {
        ref: { packId: "pack-1", itemId: "q-1" },
        title: "Capital of France",
        prompt: "Name the capital of France.",
        answer: "Paris",
        notes: null,
      },
    },
    turn: {
      ...state.turn,
      phase: "after_spin" as const,
    },
  };

  const result = applyOperation(stagedState, { type: "turn.advance" });
  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("expected success");
  }

  assert.equal(result.state.stagedOutcome, null);
  assert.equal(result.state.turn.phase, "waiting_for_spin");
});

test("turn.advance refuses to move on while a pending rule is still in the result box", () => {
  const state = createInitialGameState({ playerNames: ["A", "B"], totalRounds: 3 });
  const stagedRuleState = {
    ...state,
    stagedOutcome: {
      category: "rule" as const,
      stagedAt: "2026-10-19T00:00:00.000Z",
      item: {
        ref: { packId: "pack-1", itemId: "r-1" },
        title: "No talking while eating",
        prompt: "This rule has to be assigned before the turn can continue.",
        answer: null,
        notes: null,
      },
    },
    turn: {
      ...state.turn,
      phase: "after_spin" as const,
    },
  };

  const result = applyOperation(stagedRuleState, { type: "turn.advance" });
  assert.equal(result.ok, false);
  if (result.ok) {
    throw new Error("expected failure");
  }
  assert.match(result.reason, /pending rule|result box|rule/i);
});

test("turn.advance allows an action result to clear without blocking the next player", () => {
  const state = createInitialGameState({ playerNames: ["A", "B"], totalRounds: 3 });
  const stagedActionState = {
    ...state,
    stagedOutcome: {
      category: "action" as const,
      stagedAt: "2026-10-19T00:00:00.000Z",
      item: {
        ref: { packId: "pack-1", itemId: "a-1" },
        title: "Double points",
        prompt: "Resolve this action before the room moves on.",
        answer: null,
        notes: null,
      },
    },
    turn: {
      ...state.turn,
      phase: "after_spin" as const,
    },
  };

  const result = applyOperation(stagedActionState, { type: "turn.advance" });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("expected action to allow turn advance");
  assert.equal(result.state.stagedOutcome, null);
  assert.equal(result.state.turn.currentPlayerId, "p2");
});

test("stagedOutcome.assignRule moves a rule result to the chosen player or room", () => {
  const state = createInitialGameState({ playerNames: ["A", "B"], totalRounds: 3 });
  const stagedRuleState = {
    ...state,
    stagedOutcome: {
      category: "rule" as const,
      stagedAt: "2026-10-19T00:00:00.000Z",
      item: {
        ref: { packId: "pack-1", itemId: "r-1" },
        title: "No talking while eating",
        prompt: "This rule will be assigned shortly.",
        answer: null,
        notes: null,
      },
    },
    turn: {
      ...state.turn,
      phase: "after_spin" as const,
    },
  };

  const result = applyOperation(stagedRuleState, {
    type: "stagedOutcome.assignRule",
    target: { kind: "player", playerId: "p1" },
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("expected success");
  }

  assert.equal(result.state.stagedOutcome, null);
  assert.equal(result.state.players[0]?.activeRules[0]?.label, "No talking while eating");
  assert.equal(result.state.players[0]?.activeRules[0]?.sourceCategory, "rule");
});

test("applyCommand maps score.increment and turn.advance into durable mutations", () => {
  const state = createInitialGameState({ playerNames: ["A", "B"], totalRounds: 2 });
  const afterSpin = {
    ...state,
    turn: {
      ...state.turn,
      currentPlayerId: "p1",
      phase: "after_spin" as const,
    },
  };

  const commandResult = applyCommand(afterSpin, { type: "score.increment", playerId: "p1", amount: 5 });
  assert.equal(commandResult.ok, true);
  if (!commandResult.ok) throw new Error("expected success");
  assert.equal(commandResult.state.players[0]?.score, 5);
  assert.equal(commandResult.events.length, 1);

  const advanceResult = applyCommand(commandResult.state, { type: "turn.advance" });
  assert.equal(advanceResult.ok, true);
  if (!advanceResult.ok) throw new Error("expected success");
  assert.equal(advanceResult.state.turn.currentPlayerId, "p2");
});

test("loadMarkdownContentPack reads a simple markdown pack into catalog entries", async () => {
  const pack = await loadMarkdownContentPack(
    new URL("../../../content/packs/demo-party-pack.md", import.meta.url),
  );

  assert.equal(pack.id, "demo-party-pack");
  assert.equal(pack.categories.includes("question"), true);
  assert.equal(pack.items.length >= 2, true);
  assert.equal(pack.items[0]?.title.length > 0, true);
});

test("createGameFromSelection builds a game state from player names and pack refs", () => {
  const state = createGameFromSelection({
    title: "Demo Night",
    playerNames: ["Ada", "Lin"],
    totalRounds: 12,
    packRefs: [{
      id: "demo-party-pack",
      label: "Demo Party Pack",
      source: "content/packs/demo-party-pack.md",
      format: "markdown",
      categories: ["question", "challenge", "rule", "action"],
    }],
  });

  assert.equal(state.title, "Demo Night");
  assert.equal(state.players.length, 2);
  assert.equal(state.contentPacks.length, 1);
  assert.equal(state.turn.currentPlayerId, "p1");
});

test("rule.duplicate can copy a rule into a different destination box", () => {
  const state = createInitialGameState({
    playerNames: ["Ada", "Lin"],
    totalRounds: 2,
    maxRoomRules: 5,
  });
  const sourceRule: ActiveRule = {
    id: "rule-1",
    label: "No like",
    scope: "player",
    definitionRef: null,
    sourceCategory: "rule",
    createdAtRound: 1,
    expiresAfterRound: null,
    notes: null,
  };

  const withRule: GameState = {
    ...state,
    players: state.players.map((player, index) =>
      index === 0
        ? { ...player, activeRules: [sourceRule] }
        : player,
    ),
  };

  const result = applyOperation(withRule, {
    type: "rule.duplicate",
    ruleId: "rule-1",
    from: { kind: "player", playerId: "p1" },
    duplicateRule: {
      id: "rule-1-copy",
      label: "No like",
      scope: "player",
      definitionRef: null,
      sourceCategory: "rule",
      createdAtRound: 1,
      expiresAfterRound: null,
      notes: null,
    },
    destination: { kind: "room" },
  });

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("expected duplicate success");
  assert.equal(result.state.players[0]?.activeRules.length, 1);
  assert.equal(result.state.roomRulePool.length, 1);
  assert.equal(result.state.roomRulePool[0]?.label, "No like");
});

test("room rule pool respects maxRoomRules and FIFO eviction", () => {
  const state = createInitialGameState({
    playerNames: ["Ada", "Lin"],
    totalRounds: 2,
    maxRoomRules: 2,
  });

  const withRoomRules: GameState = {
    ...state,
    roomRulePool: [
      { id: "rule-a", label: "A", scope: "room", definitionRef: null, sourceCategory: "rule", createdAtRound: 1, expiresAfterRound: null, notes: null },
      { id: "rule-b", label: "B", scope: "room", definitionRef: null, sourceCategory: "rule", createdAtRound: 1, expiresAfterRound: null, notes: null },
    ],
  };

  const result = applyOperation(withRoomRules, {
    type: "rule.move",
    ruleId: "rule-b",
    from: { kind: "player", playerId: "p1" },
    to: { kind: "room" },
  });

  assert.equal(result.ok, false);
  if (result.ok) throw new Error("expected move to room to be rejected when target is full");

  const nextState = applyOperation(withRoomRules, {
    type: "rule.move",
    ruleId: "rule-c",
    from: { kind: "player", playerId: "p1" },
    to: { kind: "room" },
  });

  assert.equal(nextState.ok, false);
  if (nextState.ok) throw new Error("expected move to room to fail when source rule missing");

  const roomWithNewRule: GameState = {
    ...withRoomRules,
    roomRulePool: [
      { id: "rule-a", label: "A", scope: "room", definitionRef: null, sourceCategory: "rule", createdAtRound: 1, expiresAfterRound: null, notes: null },
      { id: "rule-b", label: "B", scope: "room", definitionRef: null, sourceCategory: "rule", createdAtRound: 1, expiresAfterRound: null, notes: null },
    ],
    players: withRoomRules.players.map((player, index) =>
      index === 0
        ? {
            ...player,
            activeRules: [{
              id: "rule-c",
              label: "C",
              scope: "player",
              definitionRef: null,
              sourceCategory: "rule",
              createdAtRound: 1,
              expiresAfterRound: null,
              notes: null,
            }],
          }
        : player,
    ),
  };

  const moveToRoom = applyOperation(roomWithNewRule, {
    type: "rule.move",
    ruleId: "rule-c",
    from: { kind: "player", playerId: "p1" },
    to: { kind: "room" },
  });

  assert.equal(moveToRoom.ok, true);
  if (!moveToRoom.ok) throw new Error("expected move to room success");
  assert.equal(moveToRoom.state.roomRulePool.length, 2);
  assert.equal(moveToRoom.state.roomRulePool[0]?.id, "rule-b");
  assert.equal(moveToRoom.state.roomRulePool[1]?.id, "rule-c");
});

test("undoGameSnapshot rewinds a game through recorded prior states", () => {
  const baseState = createInitialGameState({ playerNames: ["A", "B"], totalRounds: 2 });

  const scoreResult = applyOperation(baseState, {
    type: "score.adjust",
    playerId: "p1",
    delta: 5,
  });
  assert.equal(scoreResult.ok, true);
  if (!scoreResult.ok) throw new Error("expected score update to succeed");

  let snapshot: GameSnapshot = {
    game: baseState,
    updatedAt: "2026-10-25T00:00:00.000Z",
    operationLog: [],
    undoStack: [],
    recentEvents: [],
  };

  snapshot = recordAppliedOperation(snapshot, {
    type: "score.adjust",
    playerId: "p1",
    delta: 5,
  }, scoreResult);

  const turnResult = applyOperation(snapshot.game, { type: "turn.advance" });
  assert.equal(turnResult.ok, true);
  if (!turnResult.ok) throw new Error("expected turn advance to succeed");

  snapshot = recordAppliedOperation(snapshot, { type: "turn.advance" }, turnResult);

  const undoResult = undoGameSnapshot(snapshot, 1);
  assert.equal(undoResult.ok, true);
  if (!undoResult.ok) throw new Error("expected undo to succeed");

  assert.equal(undoResult.snapshot.game.players[0]?.score, 5);
  assert.equal(undoResult.snapshot.game.turn.currentPlayerId, "p1");

  const secondUndo = undoGameSnapshot(snapshot, 2);
  assert.equal(secondUndo.ok, true);
  if (!secondUndo.ok) throw new Error("expected second undo to succeed");

  assert.equal(secondUndo.snapshot.game.players[0]?.score, 0);
  assert.equal(secondUndo.snapshot.game.turn.currentPlayerId, "p1");
});

const knownOps: GameOperation[] = [];
assert.deepEqual(knownOps, []);
