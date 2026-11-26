import React from "react";
import ReactDOM from "react-dom/client";
import { io } from "socket.io-client";
import { type ClientGameState, createInitialGameState } from "@regelette/shared";
import "./styles.css";

const API_BASE = "http://localhost:3001";
const socket = io(API_BASE);

const initialState: ClientGameState = {
  game: createInitialGameState(),
  updatedAt: new Date(0).toISOString(),
};

async function loadState(): Promise<ClientGameState> {
  const response = await fetch(`${API_BASE}/api/state`);
  if (!response.ok) {
    throw new Error(`state request failed: ${response.status}`);
  }

  return (await response.json()) as ClientGameState;
}

function App() {
  const [state, setState] = React.useState<ClientGameState>(initialState);
  const [title, setTitle] = React.useState(initialState.game.title);
  const [playersInput, setPlayersInput] = React.useState(
    initialState.game.players.map((player) => player.name).join(", "),
  );
  const [maxRoomRulesInput, setMaxRoomRulesInput] = React.useState("0");
  const [isBusy, setIsBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const activePlayer = state.game.players.find(
    (player) => player.id === state.game.turn.currentPlayerId,
  );
  const stagedOutcome = state.game.stagedOutcome;
  const hasPendingRule =
    stagedOutcome !== null && stagedOutcome.category === "rule";
  const canAssignStagedRule = stagedOutcome !== null && stagedOutcome.category === "rule";
  const latestWheelResult = React.useMemo(() => {
    const recentEvents = (state as unknown as { recentEvents?: Array<{ type: string; result?: { category?: string; selectedItem?: { title: string; prompt: string; answer: string | null } } }> }).recentEvents ?? [];

    for (let index = recentEvents.length - 1; index >= 0; index -= 1) {
      const event = recentEvents[index];
      if (event?.type === "wheel.result") {
        return event.result ?? null;
      }
    }

    return null;
  }, [state]);

  const currentWheelResult =
    state.game.turn.phase === "after_spin"
      ? (stagedOutcome
        ? {
            category: stagedOutcome.category,
            title: stagedOutcome.item.title,
            prompt: stagedOutcome.item.prompt,
            answer: stagedOutcome.item.answer,
          }
        : latestWheelResult?.selectedItem
          ? {
              category: latestWheelResult.category,
              title: latestWheelResult.selectedItem.title,
              prompt: latestWheelResult.selectedItem.prompt,
              answer: latestWheelResult.selectedItem.answer,
            }
          : null)
      : null;

  const handleRuleAction = async (
    action: "delete" | "duplicate" | "move",
    ruleId: string,
    from: { kind: "player"; playerId: string } | { kind: "room" },
    target?: { kind: "player"; playerId: string } | { kind: "room" },
  ) => {
    setIsBusy(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/games/rules/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, ruleId, from, target }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "rule action failed");
      }

      const payload = await response.json();
      setState({
        game: payload.game,
        updatedAt: new Date().toISOString(),
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "The rule action could not be completed.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  React.useEffect(() => {
    void loadState()
      .then((nextState) => {
        setState(nextState);
        setTitle(nextState.game.title);
        setPlayersInput(nextState.game.players.map((player) => player.name).join(", "));
      })
      .catch(() => undefined);

    socket.on("game:state", (nextState: ClientGameState) => {
      setState(nextState);
      setTitle(nextState.game.title);
      setPlayersInput(nextState.game.players.map((player) => player.name).join(", "));
    });

    return () => {
      socket.off("game:state");
    };
  }, []);

  const handleSpin = async () => {
    setIsBusy(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/games/spin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`spin request failed: ${response.status}`);
      }

      const payload = await response.json();
      setState({
        game: payload.game,
        updatedAt: new Date().toISOString(),
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "The wheel could not be spun.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleScoreAdjust = async (playerId: string, delta: number) => {
    setIsBusy(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/games/score`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ playerId, delta }),
      });

      if (!response.ok) {
        throw new Error(`score request failed: ${response.status}`);
      }

      const payload = await response.json();
      setState({
        game: payload.game,
        updatedAt: new Date().toISOString(),
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "The score could not be updated.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleAssignRule = async (target: { kind: "player"; playerId: string } | { kind: "room" }) => {
    setIsBusy(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/games/rules/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ target }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "rule assignment failed");
      }

      const payload = await response.json();
      setState({
        game: payload.game,
        updatedAt: new Date().toISOString(),
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "The rule could not be assigned.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleAdvanceTurn = async () => {
    setIsBusy(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/games/turn/advance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? `turn advance request failed: ${response.status}`);
      }

      const payload = await response.json();
      setState({
        game: payload.game,
        updatedAt: new Date().toISOString(),
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "The turn could not be advanced.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleUndo = async () => {
    setIsBusy(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/games/undo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ count: 1 }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? `undo request failed: ${response.status}`);
      }

      const payload = await response.json();
      setState({
        game: payload.game,
        updatedAt: new Date().toISOString(),
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "The game could not be rewound.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleNewGame = async () => {
    setIsBusy(true);
    setError(null);

    const playerNames = playersInput
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const maxRoomRules = Math.max(0, Number(maxRoomRulesInput) || 0);

    try {
      const response = await fetch(`${API_BASE}/api/games/new`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim() || "Regelette",
          playerNames: playerNames.length > 0 ? playerNames : ["Player 1", "Player 2", "Player 3"],
          totalRounds: 15,
          maxRoomRules,
        }),
      });

      if (!response.ok) {
        throw new Error(`new-game request failed: ${response.status}`);
      }

      const payload = await response.json();
      setState({
        game: payload.game,
        updatedAt: new Date().toISOString(),
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "The game could not be created.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <main className="layout">
      <section className="hero">
        <p className="eyebrow">Game Master Dashboard</p>
        <h1>{state.game.title}</h1>
        <p>
          Round {state.game.roundNumber} / {state.game.totalRounds}
        </p>
        <p>Current player: {activePlayer?.name ?? "Unassigned"}</p>
        <p>Turn phase: {state.game.turn.phase}</p>
        <p>Room rules: {state.game.maxRoomRules}</p>
        <p>Latest update: {new Date(state.updatedAt).toLocaleString()}</p>
      </section>

      <section className="panel">
        <h2>New game</h2>
        <label>
          Title
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>
          Players
          <input
            value={playersInput}
            onChange={(event) => setPlayersInput(event.target.value)}
            placeholder="Player 1, Player 2, Player 3"
          />
        </label>
        <label>
          Max room rules
          <input
            type="number"
            min={0}
            step={1}
            value={maxRoomRulesInput}
            onChange={(event) => setMaxRoomRulesInput(event.target.value)}
          />
        </label>
        <div className="row-actions">
          <button type="button" onClick={handleNewGame} disabled={isBusy}>
            Start new game
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Contestants</h2>
        <div className="player-grid">
          {state.game.players.map((player) => (
            <div key={player.id} className={`player-card ${activePlayer?.id === player.id ? "player-card--active" : ""}`}>
              <div className="player-card__header">
                <div>
                  <p className="player-card__name">{player.name}</p>
                  <p className="player-card__score">{player.score} pts</p>
                </div>
                <div className="score-buttons">
                  <button type="button" onClick={() => void handleScoreAdjust(player.id, -1)} disabled={isBusy}>
                    -1
                  </button>
                  <button type="button" onClick={() => void handleScoreAdjust(player.id, 1)} disabled={isBusy}>
                    +1
                  </button>
                </div>
              </div>

              <div className="rule-list">
                {player.activeRules.length > 0 ? (
                  player.activeRules.map((rule) => (
                    <div key={rule.id} className="rule-pill rule-pill--actionable">
                      <span>{rule.label}</span>
                      <div className="rule-actions">
                        <button type="button" onClick={() => void handleRuleAction("delete", rule.id, { kind: "player", playerId: player.id })} disabled={isBusy}>Delete</button>
                        <select
                          value="duplicate"
                          onChange={(event) => {
                            const next = event.target.value;
                            if (next === "room") {
                              void handleRuleAction("duplicate", rule.id, { kind: "player", playerId: player.id }, { kind: "room" });
                              event.target.value = "duplicate";
                            } else if (next !== "duplicate") {
                              void handleRuleAction("duplicate", rule.id, { kind: "player", playerId: player.id }, { kind: "player", playerId: next });
                              event.target.value = "duplicate";
                            }
                          }}
                          aria-label={`Duplicate ${rule.label}`}
                        >
                          <option value="duplicate">Duplicate to...</option>
                          {state.game.players.map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
                          ))}
                          <option value="room">Room</option>
                        </select>
                        <select
                          value="move"
                          onChange={(event) => {
                            const next = event.target.value;
                            if (next === "room") {
                              void handleRuleAction("move", rule.id, { kind: "player", playerId: player.id }, { kind: "room" });
                              event.target.value = "move";
                            } else if (next !== "move") {
                              void handleRuleAction("move", rule.id, { kind: "player", playerId: player.id }, { kind: "player", playerId: next });
                              event.target.value = "move";
                            }
                          }}
                          aria-label={`Move ${rule.label}`}
                        >
                          <option value="move">Move to...</option>
                          {state.game.players.filter((candidate) => candidate.id !== player.id).map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
                          ))}
                          <option value="room">Room</option>
                        </select>
                      </div>
                    </div>
                  ))
                ) : (
                  <span className="rule-empty">No active rules</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Game-wide rules</h2>
        <div className="rule-list">
          {state.game.roomRulePool.length > 0 ? (
            state.game.roomRulePool.map((rule) => (
              <div key={rule.id} className="rule-pill rule-pill--gamewide rule-pill--actionable">
                <span>{rule.label}</span>
                <div className="rule-actions">
                  <button type="button" onClick={() => void handleRuleAction("delete", rule.id, { kind: "room" })} disabled={isBusy}>Delete</button>
                  <select
                    value="duplicate"
                    onChange={(event) => {
                      const next = event.target.value;
                      if (next !== "duplicate") {
                        void handleRuleAction("duplicate", rule.id, { kind: "room" }, { kind: "player", playerId: next });
                        event.target.value = "duplicate";
                      }
                    }}
                    aria-label={`Duplicate ${rule.label}`}
                  >
                    <option value="duplicate">Duplicate to...</option>
                    {state.game.players.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
                    ))}
                  </select>
                  <select
                    value="move"
                    onChange={(event) => {
                      const next = event.target.value;
                      if (next === "room") {
                        event.target.value = "move";
                        return;
                      }
                      if (next !== "move") {
                        void handleRuleAction("move", rule.id, { kind: "room" }, { kind: "player", playerId: next });
                        event.target.value = "move";
                      }
                    }}
                    aria-label={`Move ${rule.label}`}
                  >
                    <option value="move">Move to...</option>
                    {state.game.players.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))
          ) : (
            <span className="rule-empty">No active game-wide rules</span>
          )}
        </div>
      </section>

      <section className="panel">
        <h2>Current result</h2>
        {currentWheelResult ? (
          <>
            <p className="outcome-label">{currentWheelResult.category}</p>
            <p className="outcome-title">{currentWheelResult.title}</p>
            <p>{currentWheelResult.prompt}</p>
            {currentWheelResult.answer ? (
              <p className="outcome-answer">Answer: {currentWheelResult.answer}</p>
            ) : null}

            {canAssignStagedRule ? (
              <div className="result-actions">
                <button
                  type="button"
                  onClick={() => {
                    if (activePlayer) {
                      void handleAssignRule({ kind: "player", playerId: activePlayer.id });
                    }
                  }}
                  disabled={isBusy || !activePlayer}
                >
                  Assign to current player
                </button>
                <button type="button" onClick={() => void handleAssignRule({ kind: "room" })} disabled={isBusy}>
                  Assign to room
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <p>No current result. Spin the wheel to begin the next turn.</p>
        )}
      </section>

      <section className="panel panel--actions">
        <h2>Controls</h2>
        <div className="action-row">
          <button type="button" onClick={handleUndo} disabled={isBusy}>
            Undo
          </button>
          <button type="button" onClick={handleSpin} disabled={isBusy || state.game.turn.phase !== "waiting_for_spin"}>
            {isBusy ? "Working..." : "Spin the wheel"}
          </button>
          <button
            type="button"
            onClick={() => void handleAdvanceTurn()}
            disabled={isBusy || state.game.turn.phase !== "after_spin" || hasPendingRule}
          >
            Advance turn
          </button>
        </div>
        {error ? <p className="error">{error}</p> : null}
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
