export type WheelCategory = "question" | "challenge" | "rule" | "action";

export type GameStatus = "setup" | "in_progress" | "completed";

export type TurnPhase = "waiting_for_spin" | "after_spin";

export type RuleScope = "player" | "room";

export type ContentFileFormat = "markdown" | "toml" | "json" | "mixed";

export type SelectionMode = "weighted_random" | "director_override" | "manual_pick";

export interface ContentPackRef {
  id: string;
  label: string;
  source: string;
  format: ContentFileFormat;
  categories: WheelCategory[];
}

export interface DirectorScriptRef {
  id: string;
  label: string;
  source: string;
}

export interface ContentAtomRef {
  packId: string;
  itemId: string;
  atomId?: string;
}

export interface SelectedContentItem {
  ref: ContentAtomRef;
  title: string;
  prompt: string;
  answer: string | null;
  notes: string | null;
}

export type StagedOutcomeCategory = "question" | "challenge" | "rule" | "action";

export interface StagedOutcome {
  category: StagedOutcomeCategory;
  item: SelectedContentItem;
  stagedAt: string;
}

export interface ActiveRule {
  id: string;
  label: string;
  scope: RuleScope;
  definitionRef: ContentAtomRef | null;
  sourceCategory: "rule" | "action" | "manual";
  createdAtRound: number;
  expiresAfterRound: number | null;
  notes: string | null;
}

export interface PlayerState {
  id: string;
  name: string;
  score: number;
  activeRules: ActiveRule[];
}

export interface WheelSpinResult {
  id: string;
  category: WheelCategory;
  publicLabel: string;
  selectedItem: SelectedContentItem | null;
  selectionMode: SelectionMode;
  broadcastAt: string;
}

export interface TurnState {
  currentPlayerId: string;
  turnNumber: number;
  phase: TurnPhase;
}

export interface RulePoolAddress {
  kind: "player" | "unassigned" | "room";
  playerId?: string;
}

export interface ScoreSetOperation {
  type: "score.set";
  playerId: string;
  score: number;
}

export interface ScoreAdjustOperation {
  type: "score.adjust";
  playerId: string;
  delta: number;
}

export interface StagedOutcomeSetOperation {
  type: "stagedOutcome.set";
  stagedOutcome: StagedOutcome;
}

export interface StagedOutcomeClearOperation {
  type: "stagedOutcome.clear";
}

export interface StagedOutcomeAssignRuleOperation {
  type: "stagedOutcome.assignRule";
  target: { kind: "player"; playerId: string } | { kind: "room" };
}

export interface RuleMoveOperation {
  type: "rule.move";
  ruleId: string;
  from: RulePoolAddress;
  to: RulePoolAddress;
}

export interface RuleDeleteOperation {
  type: "rule.delete";
  ruleId: string;
  from: RulePoolAddress;
}

export interface RuleDuplicateOperation {
  type: "rule.duplicate";
  ruleId: string;
  from: RulePoolAddress;
  duplicateRule: ActiveRule;
  destination: RulePoolAddress;
}

export interface TurnAdvanceOperation {
  type: "turn.advance";
}

export type GameOperation =
  | ScoreSetOperation
  | ScoreAdjustOperation
  | StagedOutcomeSetOperation
  | StagedOutcomeClearOperation
  | StagedOutcomeAssignRuleOperation
  | RuleMoveOperation
  | RuleDeleteOperation
  | RuleDuplicateOperation
  | TurnAdvanceOperation;

export interface WheelSpinCommand {
  type: "wheel.spin";
  requestedAt: string;
}

export interface ScoreIncrementCommand {
  type: "score.increment";
  playerId: string;
  amount: number;
}

export interface ScoreDecrementCommand {
  type: "score.decrement";
  playerId: string;
  amount: number;
}

export interface TurnAdvanceCommand {
  type: "turn.advance";
}

export type GameCommand =
  | WheelSpinCommand
  | ScoreIncrementCommand
  | ScoreDecrementCommand
  | TurnAdvanceCommand;

export interface WheelResultEvent {
  type: "wheel.result";
  result: WheelSpinResult;
}

export interface ScoreChangedEvent {
  type: "score.changed";
  playerId: string;
  delta: number;
  score: number;
}

export interface TurnAdvancedEvent {
  type: "turn.advanced";
  previousPlayerId: string;
  currentPlayerId: string;
  roundNumber: number;
  turnNumber: number;
}

export type GameEvent = WheelResultEvent | ScoreChangedEvent | TurnAdvancedEvent;

export interface AppliedGameOperation {
  id: string;
  appliedAt: string;
  operation: GameOperation;
  inverseOperations: GameOperation[];
  previousState: GameState;
}

export interface GameState {
  id: string;
  title: string;
  status: GameStatus;
  roundNumber: number;
  totalRounds: number;
  maxRoomRules: number;
  players: PlayerState[];
  turn: TurnState;
  stagedOutcome: StagedOutcome | null;
  unassignedRulePool: ActiveRule[];
  roomRulePool: ActiveRule[];
  contentPacks: ContentPackRef[];
  directorScript: DirectorScriptRef | null;
}

export interface GameSnapshot {
  game: GameState;
  updatedAt: string;
  operationLog: AppliedGameOperation[];
  undoStack: AppliedGameOperation[];
  recentEvents: GameEvent[];
}

export interface ClientGameState {
  game: GameState;
  updatedAt: string;
}

export interface ContentPackItem {
  id: string;
  category: WheelCategory;
  title: string;
  prompt: string;
  answer: string | null;
  notes: string | null;
}

export interface LoadedContentPack extends ContentPackRef {
  items: ContentPackItem[];
}

export interface CreateGameFromSelectionOptions {
  title?: string;
  totalRounds?: number;
  maxRoomRules?: number;
  playerNames?: string[];
  packRefs?: ContentPackRef[];
}

export interface CreateInitialGameStateOptions {
  title?: string;
  totalRounds?: number;
  maxRoomRules?: number;
  playerNames?: string[];
  contentPacks?: ContentPackRef[];
  directorScript?: DirectorScriptRef | null;
}

export function createInitialGameState(
  options: CreateInitialGameStateOptions = {},
): GameState {
  const playerNames = options.playerNames ?? [
    "Contestant 1",
    "Contestant 2",
    "Contestant 3",
  ];
  const players = playerNames.map<PlayerState>((name, index) => ({
    id: `p${index + 1}`,
    name,
    score: 0,
    activeRules: [],
  }));

  const maxRoomRules = Math.max(0, Number(options.maxRoomRules ?? 0) || 0);

  return {
    id: "default-game",
    title: options.title ?? "Regelette",
    status: "setup",
    roundNumber: 1,
    totalRounds: options.totalRounds ?? 15,
    maxRoomRules,
    players,
    turn: {
      currentPlayerId: players[0]?.id ?? "p1",
      turnNumber: 1,
      phase: "waiting_for_spin",
    },
    stagedOutcome: null,
    unassignedRulePool: [],
    roomRulePool: [],
    contentPacks: options.contentPacks ?? [],
    directorScript: options.directorScript ?? null,
  };
}

export interface GameMutationResult {
  ok: true;
  state: GameState;
  events: GameEvent[];
}

export interface GameMutationFailure {
  ok: false;
  state: GameState;
  reason: string;
  events: [];
}

export type GameMutation = GameMutationResult | GameMutationFailure;

function failMutation(state: GameState, reason: string): GameMutationFailure {
  return { ok: false, state, reason, events: [] };
}

function successMutation(state: GameState, events: GameEvent[] = []): GameMutationResult {
  return { ok: true, state, events };
}

export function recordAppliedOperation(
  snapshot: GameSnapshot,
  operation: GameOperation,
  result: GameMutationResult,
): GameSnapshot {
  const appliedOperation: AppliedGameOperation = {
    id: `op-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    appliedAt: new Date().toISOString(),
    operation,
    inverseOperations: [],
    previousState: structuredClone(snapshot.game),
  };

  return {
    ...snapshot,
    game: result.state,
    updatedAt: new Date().toISOString(),
    operationLog: [...snapshot.operationLog, appliedOperation],
    undoStack: [...snapshot.undoStack, appliedOperation],
    recentEvents: [...snapshot.recentEvents, ...result.events].slice(-25),
  };
}

export function undoGameSnapshot(
  snapshot: GameSnapshot,
  steps: number = 1,
): { ok: true; snapshot: GameSnapshot; undoneCount: number } | { ok: false; snapshot: GameSnapshot; reason: string } {
  if (steps <= 0) {
    return { ok: true, snapshot, undoneCount: 0 };
  }

  let nextSnapshot = snapshot;
  let undoneCount = 0;

  for (let index = 0; index < steps; index += 1) {
    const lastOperation = nextSnapshot.undoStack[nextSnapshot.undoStack.length - 1];
    if (!lastOperation) {
      return {
        ok: false,
        snapshot: nextSnapshot,
        reason: "Nothing to undo.",
      };
    }

    nextSnapshot = {
      ...nextSnapshot,
      game: structuredClone(lastOperation.previousState),
      updatedAt: new Date().toISOString(),
      undoStack: nextSnapshot.undoStack.slice(0, -1),
    };
    undoneCount += 1;
  }

  return {
    ok: true,
    snapshot: nextSnapshot,
    undoneCount,
  };
}

function getPlayerIndex(state: GameState, playerId: string): number {
  return state.players.findIndex((player) => player.id === playerId);
}

function getRulePool(state: GameState, address: RulePoolAddress): ActiveRule[] {
  if (address.kind === "unassigned") {
    return state.unassignedRulePool;
  }

  if (address.kind === "room") {
    return state.roomRulePool;
  }

  const owner = state.players.find((player) => player.id === address.playerId);
  return owner?.activeRules ?? [];
}

function removeRuleFromPool(state: GameState, address: RulePoolAddress, ruleId: string): GameState {
  if (address.kind === "unassigned") {
    return {
      ...state,
      unassignedRulePool: state.unassignedRulePool.filter((rule) => rule.id !== ruleId),
    };
  }

  if (address.kind === "room") {
    return {
      ...state,
      roomRulePool: state.roomRulePool.filter((rule) => rule.id !== ruleId),
    };
  }

  const ownerIndex = state.players.findIndex((player) => player.id === address.playerId);
  if (ownerIndex === -1) {
    return state;
  }

  const players = state.players.map((player, index) => {
    if (index !== ownerIndex) {
      return player;
    }

    return {
      ...player,
      activeRules: player.activeRules.filter((rule) => rule.id !== ruleId),
    };
  });

  return {
    ...state,
    players,
  };
}

function enforceRoomRuleLimit(state: GameState, rules: ActiveRule[]): ActiveRule[] {
  const maxRoomRules = Math.max(0, Number(state.maxRoomRules ?? 0) || 0);
  if (maxRoomRules <= 0) {
    return [];
  }

  if (rules.length <= maxRoomRules) {
    return rules;
  }

  return rules.slice(rules.length - maxRoomRules);
}

function addRuleToPool(state: GameState, address: RulePoolAddress, rule: ActiveRule): GameState {
  if (address.kind === "unassigned") {
    return {
      ...state,
      unassignedRulePool: [...state.unassignedRulePool, rule],
    };
  }

  if (address.kind === "room") {
    return {
      ...state,
      roomRulePool: enforceRoomRuleLimit(state, [...state.roomRulePool, rule]),
    };
  }

  const ownerIndex = state.players.findIndex((player) => player.id === address.playerId);
  if (ownerIndex === -1) {
    return state;
  }

  const players = state.players.map((player, index) => {
    if (index !== ownerIndex) {
      return player;
    }

    return {
      ...player,
      activeRules: [...player.activeRules, rule],
    };
  });

  return {
    ...state,
    players,
  };
}

function scoreChangedEvent(playerId: string, previousScore: number, nextScore: number): ScoreChangedEvent {
  return {
    type: "score.changed",
    playerId,
    delta: nextScore - previousScore,
    score: nextScore,
  };
}

export function createGameFromSelection(
  options: CreateGameFromSelectionOptions = {},
): GameState {
  const playerNames = options.playerNames ?? ["Contestant 1", "Contestant 2", "Contestant 3"];

  return createInitialGameState({
    title: options.title ?? "Regelette",
    totalRounds: options.totalRounds ?? 15,
    maxRoomRules: options.maxRoomRules ?? 0,
    playerNames,
    contentPacks: options.packRefs ?? [],
    directorScript: null,
  });
}

function parseMarkdownContentPack(content: string, source: string): LoadedContentPack {
  const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---\n?/);
  const frontMatter = frontMatterMatch?.[1] ?? "";
  const body = frontMatterMatch ? content.slice(frontMatterMatch[0].length) : content;

  const metadata = new Map<string, string[]>();
  let activeKey: string | null = null;
  for (const line of frontMatter.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    if (trimmed.startsWith("- ")) {
      if (!activeKey) {
        continue;
      }

      const value = trimmed.slice(2).trim().replace(/^['"]|['"]$/g, "");
      metadata.set(activeKey, [...(metadata.get(activeKey) ?? []), value]);
      continue;
    }

    const separatorIndex = trimmed.indexOf(":");
    if (separatorIndex > 0) {
      activeKey = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();
      metadata.set(activeKey, value ? [value.replace(/^['"]|['"]$/g, "")] : []);
      continue;
    }

    activeKey = null;
  }

  const rawCategories = metadata.get("categories") ?? ["question"];
  const categories = rawCategories
    .flatMap((entry) => entry.split(/\s*,\s*/))
    .map((entry) => entry.replace(/^["'\[]|["'\]]$/g, "").trim())
    .filter(Boolean) as WheelCategory[];

  const normalizedCategories = (categories.length > 0 ? categories : ["question"]).map((category) =>
    category === "modifier" ? "action" : category,
  );
  const validCategories: WheelCategory[] = ["question", "challenge", "rule", "action"];
  const uniqueCategories =
    normalizedCategories.filter(
      (category): category is WheelCategory => validCategories.includes(category as WheelCategory),
    );
  const items: ContentPackItem[] = [];
  const sectionPattern = /^##\s+([a-zA-Z_-]+)\s*$/gm;
  const matches = [...body.matchAll(sectionPattern)];

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const category = match[1].trim().toLowerCase() as WheelCategory;
    const sectionStart = match.index ?? 0;
    const sectionEnd = matches[index + 1]?.index ?? body.length;
    const sectionBody = body.slice(sectionStart, sectionEnd).split(/\r?\n/);

    let currentItem: Partial<ContentPackItem> | null = null;

    for (const line of sectionBody) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      if (trimmed.startsWith("### ")) {
        if (currentItem && currentItem.id && currentItem.title && currentItem.prompt) {
          items.push({
            id: currentItem.id,
            category,
            title: currentItem.title,
            prompt: currentItem.prompt,
            answer: currentItem.answer ?? null,
            notes: currentItem.notes ?? null,
          });
        }

        currentItem = {
          id: trimmed.slice(4).trim(),
        };
        continue;
      }

      if (!currentItem) {
        continue;
      }

      const colonIndex = trimmed.indexOf(":");
      if (colonIndex <= 0) {
        continue;
      }

      const key = trimmed.slice(0, colonIndex).trim().toLowerCase();
      const value = trimmed.slice(colonIndex + 1).trim();

      switch (key) {
        case "title":
          currentItem.title = value;
          break;
        case "prompt":
        case "guest prompt":
        case "question":
          currentItem.prompt = value;
          break;
        case "answer":
          currentItem.answer = value === "null" ? null : value;
          break;
        case "notes":
          currentItem.notes = value;
          break;
        default:
          break;
      }
    }

    if (currentItem && currentItem.id && currentItem.title && currentItem.prompt) {
      items.push({
        id: currentItem.id,
        category,
        title: currentItem.title,
        prompt: currentItem.prompt,
        answer: currentItem.answer ?? null,
        notes: currentItem.notes ?? null,
      });
    }
  }

  const packId = metadata.get("id")?.[0] ?? "demo-pack";
  const label = metadata.get("label")?.[0] ?? packId;

  return {
    id: packId,
    label,
    source,
    format: ((metadata.get("format")?.[0] as ContentFileFormat) ?? "markdown"),
    categories: uniqueCategories,
    items,
  };
}

export async function loadMarkdownContentPack(
  source: string | URL,
): Promise<LoadedContentPack> {
  const fs = await import("node:fs/promises");
  const file = await fs.readFile(source, "utf8");
  return parseMarkdownContentPack(file, source.toString());
}

export async function loadAvailableContentPacks(
  directory: string | URL,
): Promise<LoadedContentPack[]> {
  const fs = await import("node:fs/promises");
  const dirPath = typeof directory === "string" ? directory : directory.toString();
  const dir = await fs.readdir(dirPath, { withFileTypes: true });
  const basePath = typeof directory === "string"
    ? new URL(`file://${directory.replace(/\\/g, "/")}/`)
    : new URL("./", directory);

  const files = dir
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => new URL(entry.name, basePath));

  const packs: LoadedContentPack[] = [];
  for (const file of files) {
    packs.push(await loadMarkdownContentPack(file));
  }

  return packs;
}

export function applyOperation(
  state: GameState,
  operation: GameOperation,
): GameMutation {
  switch (operation.type) {
    case "score.set": {
      const playerIndex = getPlayerIndex(state, operation.playerId);
      if (playerIndex === -1) {
        return failMutation(state, `Unknown player: ${operation.playerId}`);
      }

      const nextPlayers = state.players.map((player, index) =>
        index === playerIndex ? { ...player, score: operation.score } : player,
      );

      return successMutation(
        {
          ...state,
          players: nextPlayers,
        },
        [scoreChangedEvent(operation.playerId, state.players[playerIndex]?.score ?? 0, operation.score)],
      );
    }

    case "score.adjust": {
      const playerIndex = getPlayerIndex(state, operation.playerId);
      if (playerIndex === -1) {
        return failMutation(state, `Unknown player: ${operation.playerId}`);
      }

      const previousScore = state.players[playerIndex]?.score ?? 0;
      const nextScore = previousScore + operation.delta;
      const nextPlayers = state.players.map((player, index) =>
        index === playerIndex ? { ...player, score: nextScore } : player,
      );

      return successMutation(
        {
          ...state,
          players: nextPlayers,
        },
        [scoreChangedEvent(operation.playerId, previousScore, nextScore)],
      );
    }

    case "stagedOutcome.set": {
      return successMutation({
        ...state,
        stagedOutcome: operation.stagedOutcome,
      });
    }

    case "stagedOutcome.clear": {
      return successMutation({
        ...state,
        stagedOutcome: null,
      });
    }

    case "stagedOutcome.assignRule": {
      if (!state.stagedOutcome) {
        return failMutation(state, "There is no pending rule result to assign.");
      }

      if (state.stagedOutcome.category !== "rule") {
        return failMutation(state, "Only rule results can be assigned to a player or room.");
      }

      const target = operation.target;
      if (target.kind === "player") {
        const playerIndex = getPlayerIndex(state, target.playerId);
        if (playerIndex === -1) {
          return failMutation(state, `Unknown player: ${target.playerId}`);
        }
      }

      if (target.kind === "room" && state.maxRoomRules <= 0) {
        return failMutation(state, "This game is configured with no room-rule slots.");
      }

      const rule: ActiveRule = {
        id: `rule-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        label: state.stagedOutcome.item.title,
        scope: target.kind === "room" ? "room" : "player",
        definitionRef: state.stagedOutcome.item.ref,
        sourceCategory: "rule",
        createdAtRound: state.roundNumber,
        expiresAfterRound: null,
        notes: state.stagedOutcome.item.notes ?? null,
      };

      const assignedState = target.kind === "room"
        ? {
            ...state,
            stagedOutcome: null,
            roomRulePool: enforceRoomRuleLimit(state, [...state.roomRulePool, rule]),
          }
        : {
            ...state,
            stagedOutcome: null,
            players: state.players.map((player) =>
              player.id === target.playerId
                ? { ...player, activeRules: [...player.activeRules, rule] }
                : player,
            ),
          };

      return successMutation(assignedState);
    }

    case "rule.move": {
      if (operation.to.kind === "room" && state.maxRoomRules <= 0) {
        return failMutation(state, "This game is configured with no room-rule slots.");
      }

      const fromRules = getRulePool(state, operation.from);
      const rule = fromRules.find((candidate) => candidate.id === operation.ruleId);
      if (!rule) {
        return failMutation(state, `Rule not found in source pool: ${operation.ruleId}`);
      }

      const withoutRule = removeRuleFromPool(state, operation.from, operation.ruleId);
      const movedState = addRuleToPool(withoutRule, operation.to, rule);

      return successMutation(movedState);
    }

    case "rule.delete": {
      const fromRules = getRulePool(state, operation.from);
      if (!fromRules.some((candidate) => candidate.id === operation.ruleId)) {
        return failMutation(state, `Rule not found for deletion: ${operation.ruleId}`);
      }

      return successMutation(removeRuleFromPool(state, operation.from, operation.ruleId));
    }

    case "rule.duplicate": {
      if (operation.destination.kind === "room" && state.maxRoomRules <= 0) {
        return failMutation(state, "This game is configured with no room-rule slots.");
      }

      const sourceRules = getRulePool(state, operation.from);
      const sourceRule = sourceRules.find((candidate) => candidate.id === operation.ruleId);
      if (!sourceRule) {
        return failMutation(state, `Rule not found for duplication: ${operation.ruleId}`);
      }

      const duplicate = {
        ...operation.duplicateRule,
        id: operation.duplicateRule.id || `${operation.ruleId}-copy-${Date.now()}`,
      };

      return successMutation(addRuleToPool(state, operation.destination, duplicate));
    }

    case "turn.advance": {
      if (state.stagedOutcome && state.stagedOutcome.category === "rule") {
        return failMutation(state, "Resolve the pending rule before advancing the turn.");
      }

      if (state.players.length === 0) {
        return failMutation(state, "Game has no players");
      }

      const { currentPlayerId } = state.turn;
      const currentIndex = getPlayerIndex(state, currentPlayerId);
      if (currentIndex === -1) {
        return failMutation(state, `Unknown current player: ${currentPlayerId}`);
      }

      const nextIndex = (currentIndex + 1) % state.players.length;
      const nextPlayerId = state.players[nextIndex]?.id ?? currentPlayerId;
      const sameRoundTurnNumber = state.turn.turnNumber + 1;
      const nextRoundNumber =
        nextIndex === 0 ? Math.max(state.roundNumber, state.turn.turnNumber + 1) : state.roundNumber;
      const nextTurnNumber = nextIndex === 0 ? nextRoundNumber : sameRoundTurnNumber;
      const completed = nextRoundNumber > state.totalRounds;

      return successMutation(
        {
          ...state,
          status: completed ? "completed" : state.status === "setup" ? "in_progress" : state.status,
          roundNumber: nextRoundNumber,
          stagedOutcome: null,
          turn: {
            currentPlayerId: nextPlayerId,
            turnNumber: nextTurnNumber,
            phase: "waiting_for_spin",
          },
        },
      );
    }

    default: {
      const exhaustive: never = operation;
      return failMutation(state, `Unsupported operation: ${(exhaustive as { type: string }).type}`);
    }
  }
}

export function applyCommand(
  state: GameState,
  command: GameCommand,
): GameMutation {
  switch (command.type) {
    case "score.increment": {
      return applyOperation(state, {
        type: "score.adjust",
        playerId: command.playerId,
        delta: command.amount,
      });
    }

    case "score.decrement": {
      return applyOperation(state, {
        type: "score.adjust",
        playerId: command.playerId,
        delta: -Math.abs(command.amount),
      });
    }

    case "turn.advance": {
      const result = applyOperation(state, { type: "turn.advance" });
      if (!result.ok) {
        return result;
      }

      const previousPlayerId = state.turn.currentPlayerId;
      const currentPlayerId = result.state.turn.currentPlayerId;
      return {
        ok: true,
        state: result.state,
        events: [
          {
            type: "turn.advanced",
            previousPlayerId,
            currentPlayerId,
            roundNumber: result.state.roundNumber,
            turnNumber: result.state.turn.turnNumber,
          },
        ],
      };
    }

    case "wheel.spin": {
      const nextState: GameState = {
        ...state,
        turn: {
          ...state.turn,
          phase: "after_spin",
        },
      };

      return {
        ok: true,
        state: nextState,
        events: [
          {
            type: "wheel.result",
            result: {
              id: `spin-${Date.now()}`,
              category: "question",
              publicLabel: "Question",
              selectedItem: null,
              selectionMode: "weighted_random",
              broadcastAt: new Date().toISOString(),
            },
          },
        ],
      };
    }

    default: {
      const exhaustive: never = command;
      return failMutation(state, `Unsupported command: ${(exhaustive as { type: string }).type}`);
    }
  }
}
