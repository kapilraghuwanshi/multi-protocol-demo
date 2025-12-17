import React, { useState, useRef, useEffect } from "react";

/**
 * Simple SSE demo UI
 * - Connect / Disconnect to EventSource (GET /sse/stream)
 * - Show incoming events (connected, tick, message, etc)
 * - Push a message to the server (POST /sse/push)
 *
 * If you run the server on a different port, either configure Vite proxy
 * to forward `/sse` to the server, or change the fetch/EventSource URLs
 * to the full origin (e.g. http://localhost:5400/sse/stream).
 */

export default function SSEdemo() {
  const [url, setUrl] = useState("/sse/stream");
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState([]);
  const [pushMsg, setPushMsg] = useState("");
  const esRef = useRef(null);

  useEffect(() => {
    return () => {
      if (esRef.current) esRef.current.close();
    };
  }, []);

  function append(e) {
    setEvents((s) => [{ ts: new Date().toISOString(), ...e }, ...s].slice(0, 200));
  }

  function connect() {
    if (esRef.current) return;
    try {
      const es = new EventSource(url);
      esRef.current = es;
      es.onopen = () => {
        setConnected(true);
        append({ type: "open", data: "connected" });
      };
      es.onmessage = (ev) => {
        append({ type: "message", data: ev.data });
      };
      // handle named events
      es.addEventListener("connected", (ev) => append({ type: "connected", data: ev.data }));
      es.addEventListener("tick", (ev) => append({ type: "tick", data: ev.data }));
      es.addEventListener("message", (ev) => append({ type: "server-message", data: ev.data }));
      es.onerror = (err) => {
        append({ type: "error", data: String(err) });
        // leave it open; EventSource retries by default
        setConnected(false);
      };
    } catch (err) {
      append({ type: "error", data: String(err) });
    }
  }

  function disconnect() {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setConnected(false);
    append({ type: "closed", data: "disconnected client" });
  }

  async function push() {
    try {
      const res = await fetch("/sse/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: pushMsg }),
      });
      const json = await res.json();
      append({ type: "push-response", data: JSON.stringify(json) });
      setPushMsg("");
    } catch (err) {
      append({ type: "error", data: String(err) });
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>SSE Demo</h2>

      <div style={{ marginBottom: 12 }}>
        <label>
          Stream URL:
          <input value={url} onChange={(e) => setUrl(e.target.value)} style={{ width: 360, marginLeft: 8 }} />
        </label>
        <div style={{ marginTop: 8 }}>
          <button onClick={connect} disabled={!!esRef.current}>Connect</button>{" "}
          <button onClick={disconnect} disabled={!esRef.current}>Disconnect</button>{" "}
          <span style={{ marginLeft: 8 }}>Status: {esRef.current ? "connected" : "disconnected"}</span>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <input value={pushMsg} onChange={(e) => setPushMsg(e.target.value)} placeholder="Message to push" style={{ width: 340, marginRight: 8 }} />
        <button onClick={push}>Push to server</button>
      </div>

      <div style={{ border: "1px solid #ddd", padding: 8, height: 420, overflow: "auto", background: "#fafafa" }}>
        <h4 style={{ marginTop: 0 }}>Events (newest first)</h4>
        {events.map((ev, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: "#666" }}>{ev.ts} — {ev.type}</div>
            <pre style={{ margin: 0 }}>{typeof ev.data === "string" ? ev.data : JSON.stringify(ev.data, null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}