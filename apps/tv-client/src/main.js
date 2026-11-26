import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from "react";
import ReactDOM from "react-dom/client";
import { io } from "socket.io-client";
import { createInitialGameState } from "@regelette/shared";
import "./styles.css";
const API_BASE = "http://localhost:3001";
const socket = io(API_BASE);
const initialState = {
    game: createInitialGameState(),
    updatedAt: new Date(0).toISOString(),
};
async function loadState() {
    const response = await fetch(`${API_BASE}/api/state`);
    if (!response.ok) {
        throw new Error(`state request failed: ${response.status}`);
    }
    return (await response.json());
}
function App() {
    const [state, setState] = React.useState(initialState);
    const activePlayer = state.game.players.find((player) => player.id === state.game.turn.currentPlayerId);
    const stagedOutcome = state.game.stagedOutcome;
    const currentWheelResult = state.game.turn.phase === "after_spin"
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
    return (_jsxs("main", { className: "screen", children: [_jsxs("section", { className: "panel panel--hero", children: [_jsx("p", { className: "eyebrow", children: "TV Display" }), _jsx("h1", { children: state.game.title }), _jsxs("p", { className: "status", children: ["Round ", state.game.roundNumber, " / ", state.game.totalRounds] }), _jsxs("p", { className: "meta", children: ["Current player: ", activePlayer?.name ?? "Unassigned"] }), _jsxs("p", { className: "meta", children: ["Phase: ", state.game.turn.phase] }), _jsxs("p", { className: "meta", children: ["Status: ", state.game.status] })] }), _jsxs("section", { className: "panel panel--prompt", children: [_jsx("h2", { children: "Current result" }), currentWheelResult ? (_jsxs(_Fragment, { children: [_jsx("p", { className: "prompt-tag", children: currentWheelResult.category }), _jsx("p", { className: "prompt-title", children: currentWheelResult.title }), _jsx("p", { className: "prompt-copy", children: currentWheelResult.prompt }), currentWheelResult.answer ? (_jsxs("p", { className: "prompt-answer", children: ["Answer: ", currentWheelResult.answer] })) : null] })) : (_jsx("p", { className: "empty-state", children: "No current result. Waiting for the next spin." }))] }), _jsxs("section", { className: "panel panel--scores", children: [_jsx("h2", { children: "Contestants" }), _jsx("div", { className: "player-grid", children: state.game.players.map((player) => (_jsxs("div", { className: `player-card ${activePlayer?.id === player.id ? "player-card--active" : ""}`, children: [_jsxs("div", { className: "player-card__header", children: [_jsx("span", { children: player.name }), _jsx("strong", { children: player.score })] }), _jsx("div", { className: "rule-list", children: player.activeRules.length > 0 ? (player.activeRules.map((rule) => (_jsx("span", { className: "rule-pill", children: rule.label }, rule.id)))) : (_jsx("span", { className: "rule-empty", children: "No active rules" })) })] }, player.id))) })] }), _jsxs("section", { className: "panel panel--rules", children: [_jsx("h2", { children: "Game-wide rules" }), _jsx("div", { className: "rule-list", children: state.game.roomRulePool.length > 0 ? (state.game.roomRulePool.map((rule) => (_jsx("span", { className: "rule-pill rule-pill--gamewide", children: rule.label }, rule.id)))) : (_jsx("span", { className: "rule-empty", children: "No active game-wide rules" })) })] })] }));
}
ReactDOM.createRoot(document.getElementById("root")).render(_jsx(React.StrictMode, { children: _jsx(App, {}) }));
