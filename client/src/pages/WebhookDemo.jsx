import React, { useState, useEffect, useRef } from "react";

/**
 * Webhook demo UI.
 * - Connects to SSE: /webhook/sse
 * - Shows backlog and live events
 * - Sends test webhook: POST /webhook/send-test
 * - Also allows sending arbitrary webhook POST /webhook (simulate external sender)
 *
 * If the server runs on a different port, either configure Vite proxy or use absolute URLs.
 */

export default function WebhookDemo() {
  const [sseUrl, setSseUrl] = useState("/webhook/sse");
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState([]);
  const esRef = useRef(null);

  const [testMessage, setTestMessage] = useState("Hello from UI");
  const [sendPayload, setSendPayload] = useState('{"foo":"bar"}');
  const [lastResponse, setLastResponse] = useState(null);

  useEffect(() => {
    return () => {
      if (esRef.current) esRef.current.close();
    };
  }, []);

  function append(ev) {
    setEvents((s) => [ev, ...s].slice(0, 500));
  }

  function connect() {
    if (esRef.current) return;
    const es = new EventSource(sseUrl);
    esRef.current = es;
    es.onopen = () => {
      setConnected(true);
      append({ ts: new Date().toISOString(), type: "open", data: "connected" });
    };
    es.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        if (parsed && parsed.type === "init") {
          // initial backlog
          setEvents(parsed.events.slice().reverse().map((x) => ({ ...x, initial: true })));
        } else {
          append({ ts: new Date().toISOString(), type: "event", data: parsed });
        }
      } catch {
        append({ ts: new Date().toISOString(), type: "message", data: e.data });
      }
    };
    es.onerror = (err) => {
      append({ ts: new Date().toISOString(), type: "error", data: String(err) });
      setConnected(false);
      // don't auto-close; EventSource retries
    };
  }

  function disconnect() {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setConnected(false);
    append({ ts: new Date().toISOString(), type: "closed", data: "client disconnected" });
  }

  async function sendTest() {
    try {
      const res = await fetch("/webhook/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: testMessage }),
      });
      const json = await res.json();
      setLastResponse(json);
    } catch (err) {
      setLastResponse({ error: String(err) });
    }
  }

  async function sendWebhook() {
    try {
      const res = await fetch("/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: sendPayload,
      });
      const json = await res.json();
      setLastResponse(json);
    } catch (err) {
      setLastResponse({ error: String(err) });
    }
  }

  async function refreshEvents() {
    try {
      const res = await fetch("/webhook/events");
      const json = await res.json();
      if (json && json.events) setEvents(json.events.slice().reverse().map((x) => ({ ...x, initial: true })));
    } catch (err) {
      append({ ts: new Date().toISOString(), type: "error", data: String(err) });
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Webhook Demo</h2>

      <div style={{ marginBottom: 12 }}>
        <label>
          SSE URL: <input value={sseUrl} onChange={(e) => setSseUrl(e.target.value)} style={{ width: 360, marginLeft: 8 }} />
        </label>
        <div style={{ marginTop: 8 }}>
          <button onClick={connect} disabled={!!esRef.current}>Connect</button>{" "}
          <button onClick={disconnect} disabled={!esRef.current}>Disconnect</button>{" "}
          <button onClick={refreshEvents}>Refresh (poll)</button>{" "}
          <span style={{ marginLeft: 12 }}>Status: {connected ? "connected" : "disconnected"}</span>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <h4>Send Test Webhook (server will broadcast to connected clients)</h4>
        <input value={testMessage} onChange={(e) => setTestMessage(e.target.value)} style={{ width: 360, marginRight: 8 }} />
        <button onClick={sendTest}>Send Test</button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <h4>Send Arbitrary Webhook (POST /webhook)</h4>
        <textarea value={sendPayload} onChange={(e) => setSendPayload(e.target.value)} rows={4} style={{ width: 640 }} />
        <div>
          <button onClick={sendWebhook}>Send Webhook</button>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <strong>Last response:</strong>
        <pre>{lastResponse ? JSON.stringify(lastResponse, null, 2) : "—"}</pre>
      </div>

      <div style={{ border: "1px solid #ddd", padding: 8, height: 420, overflow: "auto", background: "#fafafa" }}>
        <h4 style={{ marginTop: 0 }}>Received Events (newest first)</h4>
        {events.map((ev, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: "#666" }}>{ev.ts} — {ev.source || ev.type || "event"}</div>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(ev, null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}