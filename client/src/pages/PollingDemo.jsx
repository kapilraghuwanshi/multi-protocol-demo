import React, { useState, useEffect, useRef } from "react";

/**
 * PollingDemo.jsx (fixed)
 * - Starts a continuous long-poll loop to /poll/updates?since=<lastId>
 * - Uses refs to avoid stale-closure issues
 */

const UPDATES_URL = "/poll/updates";
const PUSH_URL = "/poll/push";
const HISTORY_URL = "/poll/history";

export default function PollingDemo() {
  const [events, setEvents] = useState([]);
  const [lastId, setLastId] = useState("0");
  const lastIdRef = useRef("0");

  const [running, setRunning] = useState(false);
  const runningRef = useRef(false);

  const [pushPayload, setPushPayload] = useState('{"message":"hello"}');
  const abortRef = useRef(null);

  useEffect(() => {
    return () => stopLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep refs in sync with state
  useEffect(() => {
    lastIdRef.current = lastId;
  }, [lastId]);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  async function pollOnce() {
    const url = `${UPDATES_URL}?since=${encodeURIComponent(lastIdRef.current)}`;
    try {
      const controller = new AbortController();
      abortRef.current = controller;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        await new Promise((r) => setTimeout(r, 1000));
        return;
      }
      const json = await res.json();
      if (json && Array.isArray(json.events) && json.events.length > 0) {
        // server returns events with oldest-first (server stores newest last)
        // we want newest-first in UI
        const newEvents = json.events.slice().reverse();
        setEvents((prev) => {
          const merged = [...newEvents, ...prev];
          return merged.slice(0, 1000);
        });
        // update lastId to the greatest id received
        const maxId = json.events.reduce((m, e) => (Number(e.id) > Number(m) ? e.id : m), lastIdRef.current);
        setLastId(String(maxId));
      }
    } catch (err) {
      // network or abort
      await new Promise((r) => setTimeout(r, 1000));
    } finally {
      abortRef.current = null;
    }
  }

  // continuous loop reading runningRef.current
  async function startLoop() {
    if (runningRef.current) return;
    setRunning(true);
    runningRef.current = true;

    (async function run() {
      while (runningRef.current) {
        await pollOnce();
        // small backoff to avoid tight loop on immediate empty responses
        await new Promise((r) => setTimeout(r, 50));
      }
    })();
  }

  function stopLoop() {
    setRunning(false);
    runningRef.current = false;
    if (abortRef.current) abortRef.current.abort();
  }

  async function pushEvent() {
    try {
      const payload = JSON.parse(pushPayload);
      const res = await fetch(PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json && json.ok) {
        // fetch recent history to show result immediately
        await loadHistory();
      }
    } catch (err) {
      console.error("push error", err);
    }
  }

  async function loadHistory() {
    try {
      const res = await fetch(`${HISTORY_URL}?limit=50`);
      const json = await res.json();
      if (json && Array.isArray(json.events)) {
        // server returns oldest-first (events[]), show newest-first
        const newestFirst = json.events.slice().reverse();
        setEvents(newestFirst);
        setLastId(json.events.length ? String(json.events[json.events.length - 1].id) : "0");
      }
    } catch (err) {
      console.error("history error", err);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Long Polling Demo</h2>

      <div style={{ marginBottom: 12 }}>
        <button onClick={loadHistory}>Load History</button>{" "}
        <button onClick={startLoop} disabled={running}>Start Long-Poll Loop</button>{" "}
        <button onClick={stopLoop} disabled={!running}>Stop</button>
        <span style={{ marginLeft: 12 }}>Status: {running ? "running" : "stopped"}</span>
      </div>

      <div style={{ marginBottom: 12 }}>
        <h4>Push Event</h4>
        <textarea value={pushPayload} onChange={(e) => setPushPayload(e.target.value)} rows={3} style={{ width: 640 }} />
        <div style={{ marginTop: 8 }}>
          <button onClick={pushEvent}>Push</button>
        </div>
      </div>

      <div style={{ border: "1px solid #ddd", padding: 8, height: 420, overflow: "auto", background: "#fff" }}>
        <h4 style={{ marginTop: 0 }}>Received Events (newest first)</h4>
        {events.map((ev, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: "#666" }}>{ev.ts} — id:{ev.id}</div>
            <pre style={{ margin: 0 }}>{JSON.stringify(ev.payload || ev, null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}