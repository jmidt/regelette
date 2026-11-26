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
  const activePlayer = state.game.players.find(
    (player) => player.id === state.game.turn.currentPlayerId,
  );
  const stagedOutcome = state.game.stagedOutcome;
  const currentWheelResult =
    state.game.turn.phase === "after_spin"
      ? stagedOutcome
        ? {
            category: stagedOutcome.category,
            title: stagedOutcome.item.title,
            prompt: stagedOutcome.item.prompt,
            answer: stagedOutcome.item.answer,
          }
        : null
      : null;

  React.useEffect(() => {
    void loadState().then(setState).catch(() => undefined);

    socket.on("game:state", setState);

    return () => {
      socket.off("game:state", setState);
    };
  }, []);

  return (
    <main className="screen">
      <section className="panel panel--hero">
        <p className="eyebrow">TV Display</p>
        <h1>{state.game.title}</h1>
        <p className="status">
          Round {state.game.roundNumber} / {state.game.totalRounds}
        </p>
        <p className="meta">
          Current player: {activePlayer?.name ?? "Unassigned"}
        </p>
        <p className="meta">Phase: {state.game.turn.phase}</p>
        <p className="meta">Status: {state.game.status}</p>
      </section>

      <section className="panel panel--prompt">
        <h2>Current result</h2>
        {currentWheelResult ? (
          <>
            <p className="prompt-tag">{currentWheelResult.category}</p>
            <p className="prompt-title">{currentWheelResult.title}</p>
            <p className="prompt-copy">{currentWheelResult.prompt}</p>
            {currentWheelResult.answer ? (
              <p className="prompt-answer">Answer: {currentWheelResult.answer}</p>
            ) : null}
          </>
        ) : (
          <p className="empty-state">No current result. Waiting for the next spin.</p>
        )}
      </section>

      <section className="panel panel--scores">
        <h2>Contestants</h2>
        <div className="player-grid">
          {state.game.players.map((player) => (
            <div
              key={player.id}
              className={`player-card ${activePlayer?.id === player.id ? "player-card--active" : ""}`}
            >
              <div className="player-card__header">
                <span>{player.name}</span>
                <strong>{player.score}</strong>
              </div>

              <div className="rule-list">
                {player.activeRules.length > 0 ? (
                  player.activeRules.map((rule) => (
                    <span key={rule.id} className="rule-pill">
                      {rule.label}
                    </span>
                  ))
                ) : (
                  <span className="rule-empty">No active rules</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel panel--rules">
        <h2>Game-wide rules</h2>
        <div className="rule-list">
          {state.game.roomRulePool.length > 0 ? (
            state.game.roomRulePool.map((rule) => (
              <span key={rule.id} className="rule-pill rule-pill--gamewide">
                {rule.label}
              </span>
            ))
          ) : (
            <span className="rule-empty">No active game-wide rules</span>
          )}
        </div>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
