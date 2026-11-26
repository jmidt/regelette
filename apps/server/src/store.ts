import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

import {
  createGameFromSelection,
  type GameEvent,
  type GameSnapshot,
  type GameState,
  type LoadedContentPack,
  type WheelCategory,
  type WheelResultEvent,
  type WheelSpinResult,
} from "@regelette/shared";

const DEFAULT_DB_PATH = fileURLToPath(new URL("../data/regelette.sqlite3", import.meta.url));

export function getDefaultDatabasePath(): string {
  return DEFAULT_DB_PATH;
}

export function createGameStore(dbPath: string = DEFAULT_DB_PATH) {
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      game_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  return {
    saveGameSnapshot(snapshot: GameSnapshot): GameSnapshot {
      db.prepare(
        `
          INSERT INTO games (id, game_json, updated_at)
          VALUES (1, @gameJson, @updatedAt)
          ON CONFLICT(id) DO UPDATE SET
            game_json = excluded.game_json,
            updated_at = excluded.updated_at
        `,
      ).run({
        gameJson: JSON.stringify(snapshot),
        updatedAt: snapshot.updatedAt,
      });

      return snapshot;
    },

    loadLatestGame(): GameSnapshot | null {
      const row = db
        .prepare("SELECT game_json FROM games WHERE id = 1")
        .get() as { game_json?: string } | undefined;

      if (!row?.game_json) {
        return null;
      }

      return JSON.parse(row.game_json) as GameSnapshot;
    },

    clearGame(): void {
      db.prepare("DELETE FROM games WHERE id = 1").run();
    },
  };
}

export function createDefaultSnapshot(): GameSnapshot {
  return {
    game: createGameFromSelection({
      title: "Regelette",
      playerNames: ["Player 1", "Player 2", "Player 3"],
      totalRounds: 15,
      maxRoomRules: 0,
      packRefs: [],
    }),
    updatedAt: new Date().toISOString(),
    operationLog: [],
    undoStack: [],
    recentEvents: [],
  };
}

export function spinCurrentWheel(
  snapshot: GameSnapshot,
  contentPacks: LoadedContentPack[] = [],
): GameSnapshot {
  const selectedPackRefs = snapshot.game.contentPacks.length > 0
    ? snapshot.game.contentPacks
    : [];

  const packPool = selectedPackRefs.length > 0
    ? contentPacks.filter((pack) => selectedPackRefs.some((ref) => ref.id === pack.id))
    : contentPacks;

  const categoryOrder: WheelCategory[] = ["question", "challenge", "rule", "action"];
  const categoryWeights: Array<{ category: WheelCategory; weight: number }> = categoryOrder
    .map((category) => ({
      category,
      weight: packPool.reduce(
        (total, pack) => total + pack.items.filter((item) => item.category === category).length,
        0,
      ),
    }))
    .filter((entry) => entry.weight > 0);

  const totalWeight = categoryWeights.reduce((total, entry) => total + entry.weight, 0);
  const roll = totalWeight === 0 ? 0 : Math.random() * totalWeight;

  let weightedIndex = 0;
  let selectedCategory: WheelCategory = "question";

  for (const entry of categoryWeights) {
    weightedIndex += entry.weight;
    if (roll <= weightedIndex || categoryWeights.indexOf(entry) === categoryWeights.length - 1) {
      selectedCategory = entry.category;
      break;
    }
  }

  const itemPool = packPool.flatMap((pack) =>
    pack.items
      .filter((item) => item.category === selectedCategory)
      .map((item) => ({ packId: pack.id, item })),
  );

  const selectedEntry = itemPool[Math.floor(Math.random() * itemPool.length)] ?? null;
  const selectedItem = selectedEntry
    ? {
        ref: {
          packId: selectedEntry.packId,
          itemId: selectedEntry.item.id,
        },
        title: selectedEntry.item.title,
        prompt: selectedEntry.item.prompt,
        answer: selectedEntry.item.answer,
        notes: selectedEntry.item.notes,
      }
    : null;

  const result: WheelSpinResult = {
    id: `wheel-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    category: selectedCategory,
    publicLabel: selectedCategory,
    selectedItem,
    selectionMode: "weighted_random",
    broadcastAt: new Date().toISOString(),
  };

  const nextState: GameState = {
    ...snapshot.game,
    status: snapshot.game.status === "setup" ? "in_progress" : snapshot.game.status,
    turn: {
      ...snapshot.game.turn,
      phase: "after_spin",
    },
    stagedOutcome: selectedItem && (
      selectedCategory === "question"
      || selectedCategory === "challenge"
      || selectedCategory === "rule"
      || selectedCategory === "action"
    )
      ? {
          category: selectedCategory,
          item: selectedItem,
          stagedAt: new Date().toISOString(),
        }
      : null,
  };

  const event: WheelResultEvent = {
    type: "wheel.result",
    result,
  };

  return {
    ...snapshot,
    game: nextState,
    updatedAt: new Date().toISOString(),
    recentEvents: [...snapshot.recentEvents, event as GameEvent].slice(-25),
  };
}
