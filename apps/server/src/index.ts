import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import {
  applyOperation,
  createGameFromSelection,
  loadAvailableContentPacks,
  recordAppliedOperation,
  type ClientGameState,
  type ContentPackRef,
  type GameOperation,
  type GameSnapshot,
  undoGameSnapshot,
} from "@regelette/shared";

import { createDefaultSnapshot, createGameStore, spinCurrentWheel } from "./store.js";

const app = express();
app.use(express.json());
app.use((request, response, next) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (request.method === "OPTIONS") {
    response.sendStatus(204);
    return;
  }

  next();
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

const store = createGameStore();
const packDirectory = fileURLToPath(new URL("../../../content/packs", import.meta.url));
const availableContentPacks = await loadAvailableContentPacks(packDirectory);

let state = store.loadLatestGame() ?? {
  ...createDefaultSnapshot(),
  game: createGameFromSelection({
    title: "Regelette",
    playerNames: ["Player 1", "Player 2", "Player 3"],
    totalRounds: 15,
    maxRoomRules: 0,
    packRefs: availableContentPacks,
  }),
};

if (!store.loadLatestGame()) {
  store.saveGameSnapshot(state);
}

app.get("/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/api/content-packs", (_request, response) => {
  response.json({ contentPacks: availableContentPacks.map(toPackRef) });
});

app.get("/api/state", (_request, response) => {
  response.json(toClientState(state));
});

function commitMutation(operation: GameOperation, result: ReturnType<typeof applyOperation>) {
  if (!result.ok) {
    return { ok: false as const, reason: result.reason };
  }

  const nextSnapshot = recordAppliedOperation(state, operation, result);
  state = nextSnapshot;
  store.saveGameSnapshot(state);

  const payload = toClientState(state);
  io.emit("game:state", payload);

  return {
    ok: true as const,
    payload,
    events: result.events,
  };
}

app.post("/api/games/new", (request, response) => {
  const body = request.body ?? {};
  const playerNames = Array.isArray(body.playerNames)
    ? body.playerNames.map((value: unknown) => String(value).trim()).filter(Boolean)
    : ["Player 1", "Player 2", "Player 3"];

  const selectedPackIds = Array.isArray(body.packIds)
    ? body.packIds.filter((value: unknown) => typeof value === "string")
    : availableContentPacks.map((pack) => pack.id);

  const selectedPacks = availableContentPacks.filter((pack) =>
    selectedPackIds.includes(pack.id),
  );

  const maxRoomRules = Number.isFinite(Number(body.maxRoomRules))
    ? Math.max(0, Number(body.maxRoomRules))
    : 0;

  state = {
    ...state,
    game: createGameFromSelection({
      title: typeof body.title === "string" && body.title.trim() ? body.title.trim() : "Regelette",
      totalRounds: Number(body.totalRounds ?? 15),
      maxRoomRules,
      playerNames: playerNames.length > 0 ? playerNames : ["Player 1", "Player 2", "Player 3"],
      packRefs: selectedPacks,
    }),
    updatedAt: new Date().toISOString(),
    operationLog: [],
    undoStack: [],
    recentEvents: [],
  };
  store.saveGameSnapshot(state);

  const payload = toClientState(state);
  io.emit("game:state", payload);

  response.status(201).json({
    game: payload.game,
    contentPacks: availableContentPacks.map(toPackRef),
  });
});

app.post("/api/games/spin", async (_request, response) => {
  state = spinCurrentWheel(state, availableContentPacks);
  store.saveGameSnapshot(state);
  const payload = toClientState(state);
  io.emit("game:state", payload);

  response.status(200).json({
    game: payload.game,
    result: state.recentEvents[state.recentEvents.length - 1],
  });
});

app.post("/api/games/score", (request, response) => {
  const body = request.body ?? {};
  const playerId = typeof body.playerId === "string" ? body.playerId : null;
  const delta = Number(body.delta ?? 0);

  if (!playerId) {
    response.status(400).json({ error: "playerId is required" });
    return;
  }

  const result = applyOperation(state.game, {
    type: "score.adjust",
    playerId,
    delta,
  });

  if (!result.ok) {
    response.status(400).json({ error: result.reason });
    return;
  }

  const mutation = commitMutation({ type: "score.adjust", playerId, delta }, result);
  if (!mutation.ok) {
    response.status(400).json({ error: mutation.reason });
    return;
  }

  response.status(200).json({
    game: mutation.payload.game,
    events: mutation.events,
  });
});

app.post("/api/games/rules/assign", (request, response) => {
  const body = request.body ?? {};
  const target = typeof body.target === "object" && body.target !== null ? body.target as Record<string, unknown> : {};
  const kind = target.kind;

  if (kind === "room") {
    const result = applyOperation(state.game, {
      type: "stagedOutcome.assignRule",
      target: { kind: "room" },
    });

    if (!result.ok) {
      response.status(400).json({ error: result.reason });
      return;
    }

    const mutation = commitMutation({ type: "stagedOutcome.assignRule", target: { kind: "room" } }, result);
    if (!mutation.ok) {
      response.status(400).json({ error: mutation.reason });
      return;
    }

    response.status(200).json({ game: mutation.payload.game, events: mutation.events });
    return;
  }

  const playerId = typeof target.playerId === "string" ? target.playerId : null;
  if (!playerId) {
    response.status(400).json({ error: "playerId is required for player assignment" });
    return;
  }

  const result = applyOperation(state.game, {
    type: "stagedOutcome.assignRule",
    target: { kind: "player", playerId },
  });

  if (!result.ok) {
    response.status(400).json({ error: result.reason });
    return;
  }

  const mutation = commitMutation({
    type: "stagedOutcome.assignRule",
    target: { kind: "player", playerId },
  }, result);
  if (!mutation.ok) {
    response.status(400).json({ error: mutation.reason });
    return;
  }

  response.status(200).json({
    game: mutation.payload.game,
    events: mutation.events,
  });
});

app.post("/api/games/rules/action", (request, response) => {
  const body = request.body ?? {};
  const action = typeof body.action === "string" ? body.action : null;
  const ruleId = typeof body.ruleId === "string" ? body.ruleId : null;
  const from = typeof body.from === "object" && body.from !== null ? body.from as Record<string, unknown> : null;
  const target = typeof body.target === "object" && body.target !== null ? body.target as Record<string, unknown> : null;

  if (!action || !ruleId || !from) {
    response.status(400).json({ error: "action, ruleId, and source are required" });
    return;
  }

  if (action === "delete") {
    const result = applyOperation(state.game, {
      type: "rule.delete",
      ruleId,
      from: {
        kind: from.kind === "room" ? "room" : from.kind === "player" ? "player" : "unassigned",
        playerId: typeof from.playerId === "string" ? from.playerId : undefined,
      },
    });

    if (!result.ok) {
      response.status(400).json({ error: result.reason });
      return;
    }

    const mutation = commitMutation({
      type: "rule.delete",
      ruleId,
      from: {
        kind: from.kind === "room" ? "room" : from.kind === "player" ? "player" : "unassigned",
        playerId: typeof from.playerId === "string" ? from.playerId : undefined,
      },
    }, result);

    if (!mutation.ok) {
      response.status(400).json({ error: mutation.reason });
      return;
    }

    response.status(200).json({ game: mutation.payload.game, events: mutation.events });
    return;
  }

  if (action === "duplicate") {
    if (!target) {
      response.status(400).json({ error: "target is required for duplicate" });
      return;
    }

    const sourceRule = (() => {
      const sourcePool = from.kind === "room"
        ? state.game.roomRulePool
        : from.kind === "player"
          ? state.game.players.find((player) => player.id === from.playerId)?.activeRules ?? []
          : state.game.unassignedRulePool;

      return sourcePool.find((candidate) => candidate.id === ruleId) ?? null;
    })();

    if (!sourceRule) {
      response.status(400).json({ error: `Rule not found for duplication: ${ruleId}` });
      return;
    }

    const result = applyOperation(state.game, {
      type: "rule.duplicate",
      ruleId,
      from: {
        kind: from.kind === "room" ? "room" : from.kind === "player" ? "player" : "unassigned",
        playerId: typeof from.playerId === "string" ? from.playerId : undefined,
      },
      duplicateRule: {
        ...sourceRule,
        id: `rule-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      },
      destination: {
        kind: target.kind === "room" ? "room" : target.kind === "player" ? "player" : "unassigned",
        playerId: typeof target.playerId === "string" ? target.playerId : undefined,
      },
    });

    if (!result.ok) {
      response.status(400).json({ error: result.reason });
      return;
    }

    const mutation = commitMutation({
      type: "rule.duplicate",
      ruleId,
      from: {
        kind: from.kind === "room" ? "room" : from.kind === "player" ? "player" : "unassigned",
        playerId: typeof from.playerId === "string" ? from.playerId : undefined,
      },
      duplicateRule: {
        ...sourceRule,
        id: `rule-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      },
      destination: {
        kind: target.kind === "room" ? "room" : target.kind === "player" ? "player" : "unassigned",
        playerId: typeof target.playerId === "string" ? target.playerId : undefined,
      },
    }, result);

    if (!mutation.ok) {
      response.status(400).json({ error: mutation.reason });
      return;
    }

    response.status(200).json({ game: mutation.payload.game, events: mutation.events });
    return;
  }

  if (action === "move") {
    if (!target) {
      response.status(400).json({ error: "target is required for move" });
      return;
    }

    const result = applyOperation(state.game, {
      type: "rule.move",
      ruleId,
      from: {
        kind: from.kind === "room" ? "room" : from.kind === "player" ? "player" : "unassigned",
        playerId: typeof from.playerId === "string" ? from.playerId : undefined,
      },
      to: {
        kind: target.kind === "room" ? "room" : target.kind === "player" ? "player" : "unassigned",
        playerId: typeof target.playerId === "string" ? target.playerId : undefined,
      },
    });

    if (!result.ok) {
      response.status(400).json({ error: result.reason });
      return;
    }

    const mutation = commitMutation({
      type: "rule.move",
      ruleId,
      from: {
        kind: from.kind === "room" ? "room" : from.kind === "player" ? "player" : "unassigned",
        playerId: typeof from.playerId === "string" ? from.playerId : undefined,
      },
      to: {
        kind: target.kind === "room" ? "room" : target.kind === "player" ? "player" : "unassigned",
        playerId: typeof target.playerId === "string" ? target.playerId : undefined,
      },
    }, result);

    if (!mutation.ok) {
      response.status(400).json({ error: mutation.reason });
      return;
    }

    response.status(200).json({ game: mutation.payload.game, events: mutation.events });
    return;
  }

  response.status(400).json({ error: `unsupported action: ${action}` });
});

app.post("/api/games/undo", (request, response) => {
  const rawCount = Number(request.body?.count ?? 1);
  const steps = Number.isFinite(rawCount) ? Math.max(1, Math.floor(rawCount)) : 1;

  const result = undoGameSnapshot(state, steps);
  if (!result.ok) {
    response.status(400).json({ error: result.reason });
    return;
  }

  state = result.snapshot;
  store.saveGameSnapshot(state);

  const payload = toClientState(state);
  io.emit("game:state", payload);

  response.status(200).json({
    game: payload.game,
    undoneCount: result.undoneCount,
  });
});

app.post("/api/games/turn/advance", (_request, response) => {
  const result = applyOperation(state.game, { type: "turn.advance" });

  if (!result.ok) {
    response.status(400).json({ error: result.reason });
    return;
  }

  const mutation = commitMutation({ type: "turn.advance" }, result);
  if (!mutation.ok) {
    response.status(400).json({ error: mutation.reason });
    return;
  }

  response.status(200).json({
    game: mutation.payload.game,
    events: mutation.events,
  });
});

io.on("connection", (socket) => {
  socket.emit("game:state", toClientState(state));
});

const port = Number(process.env.PORT ?? 3001);

httpServer.listen(port, () => {
  console.log(`server listening on http://localhost:${port}`);
});

function toPackRef(pack: { id: string; label: string; source: string; format: string; categories: string[] }): ContentPackRef {
  return {
    id: pack.id,
    label: pack.label,
    source: pack.source,
    format: pack.format as ContentPackRef["format"],
    categories: pack.categories as ContentPackRef["categories"],
  };
}

function toClientState(snapshot: GameSnapshot): ClientGameState {
  return {
    game: snapshot.game,
    updatedAt: snapshot.updatedAt,
  };
}
