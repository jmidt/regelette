import test from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtempSync } from "node:fs";

import { createGameStore, spinCurrentWheel } from "./store.js";
import { createGameFromSelection } from "@regelette/shared";

test("game store round-trips a snapshot to sqlite", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "regelette-store-"));
  const store = createGameStore(join(tempDir, "regelette.sqlite3"));

  const snapshot = {
    game: createGameFromSelection({
      title: "Persistence Test",
      playerNames: ["Ana", "Ben"],
      totalRounds: 7,
      packRefs: [{
        id: "demo-party-pack",
        label: "Demo Party Pack",
        source: "content/packs/demo-party-pack.md",
        format: "markdown",
        categories: ["question", "challenge", "rule", "action"],
      }],
    }),
    updatedAt: new Date().toISOString(),
    operationLog: [],
    undoStack: [],
    recentEvents: [],
  };

  store.saveGameSnapshot(snapshot);
  const loaded = store.loadLatestGame();

  assert.ok(loaded);
  assert.equal(loaded?.game.title, "Persistence Test");
  assert.equal(loaded?.game.players.length, 2);
  assert.equal(loaded?.game.contentPacks[0]?.id, "demo-party-pack");
});

test("spinCurrentWheel randomizes a category and stages a selected item", () => {
  const snapshot = {
    game: createGameFromSelection({
      title: "Wheel Test",
      playerNames: ["Ana", "Ben"],
      totalRounds: 10,
      packRefs: [{
        id: "demo-party-pack",
        label: "Demo Party Pack",
        source: "content/packs/demo-party-pack.md",
        format: "markdown",
        categories: ["question", "challenge", "rule", "action"],
      }],
    }),
    updatedAt: new Date().toISOString(),
    operationLog: [],
    undoStack: [],
    recentEvents: [],
  };

  const result = spinCurrentWheel(snapshot, [{
    id: "demo-party-pack",
    label: "Demo Party Pack",
    source: "content/packs/demo-party-pack.md",
    format: "markdown",
    categories: ["question", "challenge", "rule", "action"],
    items: [
      { id: "q-1", category: "question", title: "Capital of France", prompt: "Name the capital of France.", answer: "Paris", notes: null },
      { id: "c-1", category: "challenge", title: "Mime", prompt: "Mime a cat.", answer: null, notes: null },
      { id: "r-1", category: "rule", title: "No like", prompt: "No use of like.", answer: null, notes: null },
      { id: "m-1", category: "action", title: "Double points", prompt: "Double points next time.", answer: null, notes: null },
    ],
  }]);

  assert.equal(result.game.turn.phase, "after_spin");
  assert.ok(result.recentEvents.length >= 1);
  assert.equal(result.recentEvents[0]?.type, "wheel.result");
  assert.ok(
    result.game.stagedOutcome === null
    || result.game.stagedOutcome.category === "question"
    || result.game.stagedOutcome.category === "challenge"
    || result.game.stagedOutcome.category === "rule"
    || result.game.stagedOutcome.category === "action",
  );
});
