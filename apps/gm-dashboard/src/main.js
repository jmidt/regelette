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
    const [title, setTitle] = React.useState(initialState.game.title);
    const [playersInput, setPlayersInput] = React.useState(initialState.game.players.map((player) => player.name).join(", "));
    const [maxRoomRulesInput, setMaxRoomRulesInput] = React.useState("0");
    const [isBusy, setIsBusy] = React.useState(false);
    const [error, setError] = React.useState(null);
    const activePlayer = state.game.players.find((player) => player.id === state.game.turn.currentPlayerId);
    const stagedOutcome = state.game.stagedOutcome;
    const hasPendingRule = stagedOutcome !== null && stagedOutcome.category === "rule";
    const canAssignStagedRule = stagedOutcome !== null && stagedOutcome.category === "rule";
    const latestWheelResult = React.useMemo(() => {
        const recentEvents = state.recentEvents ?? [];
        for (let index = recentEvents.length - 1; index >= 0; index -= 1) {
            const event = recentEvents[index];
            if (event?.type === "wheel.result") {
                return event.result ?? null;
            }
        }
        return null;
    }, [state]);
    const currentWheelResult = state.game.turn.phase === "after_spin"
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
    const handleRuleAction = async (action, ruleId, from, target) => {
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
        }
        catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "The rule action could not be completed.");
        }
        finally {
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
        socket.on("game:state", (nextState) => {
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
        }
        catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "The wheel could not be spun.");
        }
        finally {
            setIsBusy(false);
        }
    };
    const handleScoreAdjust = async (playerId, delta) => {
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
        }
        catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "The score could not be updated.");
        }
        finally {
            setIsBusy(false);
        }
    };
    const handleAssignRule = async (target) => {
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
        }
        catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "The rule could not be assigned.");
        }
        finally {
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
        }
        catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "The turn could not be advanced.");
        }
        finally {
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
        }
        catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "The game could not be rewound.");
        }
        finally {
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
        }
        catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "The game could not be created.");
        }
        finally {
            setIsBusy(false);
        }
    };
    return (_jsxs("main", { className: "layout", children: [_jsxs("section", { className: "hero", children: [_jsx("p", { className: "eyebrow", children: "Game Master Dashboard" }), _jsx("h1", { children: state.game.title }), _jsxs("p", { children: ["Round ", state.game.roundNumber, " / ", state.game.totalRounds] }), _jsxs("p", { children: ["Current player: ", activePlayer?.name ?? "Unassigned"] }), _jsxs("p", { children: ["Turn phase: ", state.game.turn.phase] }), _jsxs("p", { children: ["Room rules: ", state.game.maxRoomRules] }), _jsxs("p", { children: ["Latest update: ", new Date(state.updatedAt).toLocaleString()] })] }), _jsxs("section", { className: "panel", children: [_jsx("h2", { children: "New game" }), _jsxs("label", { children: ["Title", _jsx("input", { value: title, onChange: (event) => setTitle(event.target.value) })] }), _jsxs("label", { children: ["Players", _jsx("input", { value: playersInput, onChange: (event) => setPlayersInput(event.target.value), placeholder: "Player 1, Player 2, Player 3" })] }), _jsxs("label", { children: ["Max room rules", _jsx("input", { type: "number", min: 0, step: 1, value: maxRoomRulesInput, onChange: (event) => setMaxRoomRulesInput(event.target.value) })] }), _jsx("div", { className: "row-actions", children: _jsx("button", { type: "button", onClick: handleNewGame, disabled: isBusy, children: "Start new game" }) })] }), _jsxs("section", { className: "panel", children: [_jsx("h2", { children: "Contestants" }), _jsx("div", { className: "player-grid", children: state.game.players.map((player) => (_jsxs("div", { className: `player-card ${activePlayer?.id === player.id ? "player-card--active" : ""}`, children: [_jsxs("div", { className: "player-card__header", children: [_jsxs("div", { children: [_jsx("p", { className: "player-card__name", children: player.name }), _jsxs("p", { className: "player-card__score", children: [player.score, " pts"] })] }), _jsxs("div", { className: "score-buttons", children: [_jsx("button", { type: "button", onClick: () => void handleScoreAdjust(player.id, -1), disabled: isBusy, children: "-1" }), _jsx("button", { type: "button", onClick: () => void handleScoreAdjust(player.id, 1), disabled: isBusy, children: "+1" })] })] }), _jsx("div", { className: "rule-list", children: player.activeRules.length > 0 ? (player.activeRules.map((rule) => (_jsxs("div", { className: "rule-pill rule-pill--actionable", children: [_jsx("span", { children: rule.label }), _jsxs("div", { className: "rule-actions", children: [_jsx("button", { type: "button", onClick: () => void handleRuleAction("delete", rule.id, { kind: "player", playerId: player.id }), disabled: isBusy, children: "Delete" }), _jsxs("select", { value: "duplicate", onChange: (event) => {
                                                            const next = event.target.value;
                                                            if (next === "room") {
                                                                void handleRuleAction("duplicate", rule.id, { kind: "player", playerId: player.id }, { kind: "room" });
                                                                event.target.value = "duplicate";
                                                            }
                                                            else if (next !== "duplicate") {
                                                                void handleRuleAction("duplicate", rule.id, { kind: "player", playerId: player.id }, { kind: "player", playerId: next });
                                                                event.target.value = "duplicate";
                                                            }
                                                        }, "aria-label": `Duplicate ${rule.label}`, children: [_jsx("option", { value: "duplicate", children: "Duplicate to..." }), state.game.players.map((candidate) => (_jsx("option", { value: candidate.id, children: candidate.name }, candidate.id))), _jsx("option", { value: "room", children: "Room" })] }), _jsxs("select", { value: "move", onChange: (event) => {
                                                            const next = event.target.value;
                                                            if (next === "room") {
                                                                void handleRuleAction("move", rule.id, { kind: "player", playerId: player.id }, { kind: "room" });
                                                                event.target.value = "move";
                                                            }
                                                            else if (next !== "move") {
                                                                void handleRuleAction("move", rule.id, { kind: "player", playerId: player.id }, { kind: "player", playerId: next });
                                                                event.target.value = "move";
                                                            }
                                                        }, "aria-label": `Move ${rule.label}`, children: [_jsx("option", { value: "move", children: "Move to..." }), state.game.players.filter((candidate) => candidate.id !== player.id).map((candidate) => (_jsx("option", { value: candidate.id, children: candidate.name }, candidate.id))), _jsx("option", { value: "room", children: "Room" })] })] })] }, rule.id)))) : (_jsx("span", { className: "rule-empty", children: "No active rules" })) })] }, player.id))) })] }), _jsxs("section", { className: "panel", children: [_jsx("h2", { children: "Game-wide rules" }), _jsx("div", { className: "rule-list", children: state.game.roomRulePool.length > 0 ? (state.game.roomRulePool.map((rule) => (_jsxs("div", { className: "rule-pill rule-pill--gamewide rule-pill--actionable", children: [_jsx("span", { children: rule.label }), _jsxs("div", { className: "rule-actions", children: [_jsx("button", { type: "button", onClick: () => void handleRuleAction("delete", rule.id, { kind: "room" }), disabled: isBusy, children: "Delete" }), _jsxs("select", { value: "duplicate", onChange: (event) => {
                                                const next = event.target.value;
                                                if (next !== "duplicate") {
                                                    void handleRuleAction("duplicate", rule.id, { kind: "room" }, { kind: "player", playerId: next });
                                                    event.target.value = "duplicate";
                                                }
                                            }, "aria-label": `Duplicate ${rule.label}`, children: [_jsx("option", { value: "duplicate", children: "Duplicate to..." }), state.game.players.map((candidate) => (_jsx("option", { value: candidate.id, children: candidate.name }, candidate.id)))] }), _jsxs("select", { value: "move", onChange: (event) => {
                                                const next = event.target.value;
                                                if (next === "room") {
                                                    event.target.value = "move";
                                                    return;
                                                }
                                                if (next !== "move") {
                                                    void handleRuleAction("move", rule.id, { kind: "room" }, { kind: "player", playerId: next });
                                                    event.target.value = "move";
                                                }
                                            }, "aria-label": `Move ${rule.label}`, children: [_jsx("option", { value: "move", children: "Move to..." }), state.game.players.map((candidate) => (_jsx("option", { value: candidate.id, children: candidate.name }, candidate.id)))] })] })] }, rule.id)))) : (_jsx("span", { className: "rule-empty", children: "No active game-wide rules" })) })] }), _jsxs("section", { className: "panel", children: [_jsx("h2", { children: "Current result" }), currentWheelResult ? (_jsxs(_Fragment, { children: [_jsx("p", { className: "outcome-label", children: currentWheelResult.category }), _jsx("p", { className: "outcome-title", children: currentWheelResult.title }), _jsx("p", { children: currentWheelResult.prompt }), currentWheelResult.answer ? (_jsxs("p", { className: "outcome-answer", children: ["Answer: ", currentWheelResult.answer] })) : null, canAssignStagedRule ? (_jsxs("div", { className: "result-actions", children: [_jsx("button", { type: "button", onClick: () => {
                                            if (activePlayer) {
                                                void handleAssignRule({ kind: "player", playerId: activePlayer.id });
                                            }
                                        }, disabled: isBusy || !activePlayer, children: "Assign to current player" }), _jsx("button", { type: "button", onClick: () => void handleAssignRule({ kind: "room" }), disabled: isBusy, children: "Assign to room" })] })) : null] })) : (_jsx("p", { children: "No current result. Spin the wheel to begin the next turn." }))] }), _jsxs("section", { className: "panel panel--actions", children: [_jsx("h2", { children: "Controls" }), _jsxs("div", { className: "action-row", children: [_jsx("button", { type: "button", onClick: handleUndo, disabled: isBusy, children: "Undo" }), _jsx("button", { type: "button", onClick: handleSpin, disabled: isBusy || state.game.turn.phase !== "waiting_for_spin", children: isBusy ? "Working..." : "Spin the wheel" }), _jsx("button", { type: "button", onClick: () => void handleAdvanceTurn(), disabled: isBusy || state.game.turn.phase !== "after_spin" || hasPendingRule, children: "Advance turn" })] }), error ? _jsx("p", { className: "error", children: error }) : null] })] }));
}
ReactDOM.createRoot(document.getElementById("root")).render(_jsx(React.StrictMode, { children: _jsx(App, {}) }));
