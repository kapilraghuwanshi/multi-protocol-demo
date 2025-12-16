import React, { useState, useRef, useEffect } from "react";

// open duplicate Browser tabs, or in Postman or CLI wscat -c ws://localhost:4050
// Check socket - Network tab in devtools - ws, send messages and test
// Client side - Browser native WebSocket API
export default function WebSocketDemo() {
    const [url, setUrl] = useState("ws://localhost:4050");
    const [status, setStatus] = useState("closed");
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const wsRef = useRef(null);

    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    const append = (m) => setMessages((s) => [...s, m]);

    function connect() {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
        try {
            const ws = new WebSocket(url);
            wsRef.current = ws;
            setStatus("connecting");

            ws.addEventListener("open", () => {
                setStatus("open");
                append({ direction: "system", text: `Connected to ${url}` });
            });

            ws.addEventListener("message", (evt) => {
                let text = evt.data;
                try {
                    const parsed = JSON.parse(text);
                    append({ direction: "in", text: JSON.stringify(parsed, null, 2) });
                } catch {
                    append({ direction: "in", text });
                }
            });

            ws.addEventListener("close", () => {
                setStatus("closed");
                append({ direction: "system", text: "Connection closed" });
            });

            ws.addEventListener("error", (err) => {
                console.error("WebSocket error", err);
                append({ direction: "system", text: "Connection error" });
            });
        } catch (err) {
            append({ direction: "system", text: "Failed to connect" });
            console.error(err);
        }
    }

    function disconnect() {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
            setStatus("closed");
        }
    }

    function sendText() {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            append({ direction: "system", text: "Not connected" });
            return;
        }
        // send a text broadcast (server will wrap into JSON)
        try {
            // We'll send JSON with type 'broadcast' for nicer handling by server
            const payload = { type: "broadcast", from: "browser-user", payload: input };
            wsRef.current.send(JSON.stringify(payload));
            append({ direction: "out", text: JSON.stringify(payload) });
            setInput("");
        } catch (err) {
            console.error(err);
            append({ direction: "system", text: "Send failed" });
        }
    }

    function sendEcho() {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        const payload = { type: "echo", payload: input };
        wsRef.current.send(JSON.stringify(payload));
        append({ direction: "out", text: JSON.stringify(payload) });
        setInput("");
    }

    return (
        <div style={{ padding: 16 }}>
            <h2>WebSocket Demo</h2>
            <div style={{ marginBottom: 12 }}>
                <label>
                    Server URL:{" "}
                    <input value={url} onChange={(e) => setUrl(e.target.value)} style={{ width: 320 }} />
                </label>
                <div style={{ marginTop: 8 }}>
                    <button onClick={connect} disabled={status === "open" || status === "connecting"}>
                        Connect
                    </button>{" "}
                    <button onClick={disconnect} disabled={status !== "open"}>
                        Disconnect
                    </button>
                    <span style={{ marginLeft: 12 }}>Status: {status}</span>
                </div>
            </div>

            <div style={{ marginBottom: 12 }}>
                <input
                    placeholder="Message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    style={{ width: 400, marginRight: 8 }}
                />
                <button onClick={sendText}>Send Broadcast</button>{" "}
                <button onClick={sendEcho}>Send Echo</button>
            </div>

            <div style={{ border: "1px solid #ddd", padding: 12, height: 300, overflow: "auto" }}>
                {messages.map((m, i) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 12, color: "#666" }}>{m.direction}</div>
                        <pre style={{ margin: 0 }}>{m.text}</pre>
                    </div>
                ))}
            </div>
        </div>
    );
}