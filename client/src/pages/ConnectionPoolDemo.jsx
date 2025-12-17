import React, { useEffect, useState, useRef } from "react";

/**
 * Connection Pool Demo client page
 * - polls /pool/status and /pool/history
 * - posts tasks to /pool/task
 *
 * Uses relative URLs so Vite proxy should forward `/pool` -> server (see instructions).
 */

const TASK_URL = "/pool/task";
const STATUS_URL = "/pool/status";
const HISTORY_URL = "/pool/history";

export default function ConnectionPoolDemo() {
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [taskDuration, setTaskDuration] = useState(1500);
  const [burstCount, setBurstCount] = useState(8);
  const [polling, setPolling] = useState(true);
  const pollRef = useRef(null);

  useEffect(() => {
    // poll status & history periodically
    async function poll() {
      try {
        const s = await fetch(STATUS_URL).then((r) => r.json());
        setStatus(s);
        const h = await fetch(`${HISTORY_URL}?limit=20`).then((r) => r.json());
        if (h && h.history) setHistory(h.history);
      } catch (err) {
        console.error("poll error", err);
      }
    }
    poll(); // initial
    pollRef.current = setInterval(() => {
      if (polling) poll();
    }, 1000);
    return () => clearInterval(pollRef.current);
  }, [polling]);

  async function sendTask() {
    try {
      const payload = { durationMs: Number(taskDuration) };
      const res = await fetch(TASK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      console.log("task response", json);
    } catch (err) {
      console.error("sendTask error", err);
    }
  }

  async function sendBurst() {
    for (let i = 0; i < burstCount; i++) {
      // small stagger to avoid insane spikes in UI
      sendTask();
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Connection Pool Demo</h2>

      <div style={{ marginBottom: 12 }}>
        <label>
          Task duration ms:
          <input
            type="number"
            value={taskDuration}
            onChange={(e) => setTaskDuration(Number(e.target.value))}
            style={{ width: 120, marginLeft: 8 }}
          />
        </label>
        <label style={{ marginLeft: 12 }}>
          Burst count:
          <input
            type="number"
            value={burstCount}
            onChange={(e) => setBurstCount(Number(e.target.value))}
            style={{ width: 80, marginLeft: 8 }}
          />
        </label>
      </div>

      <div style={{ marginBottom: 12 }}>
        <button onClick={sendTask}>Send One Task</button>{" "}
        <button onClick={sendBurst}>Send Burst</button>{" "}
        <label style={{ marginLeft: 12 }}>
          Polling:
          <input type="checkbox" checked={polling} onChange={(e) => setPolling(e.target.checked)} style={{ marginLeft: 8 }} />
        </label>
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ minWidth: 260 }}>
          <h4>Pool Status</h4>
          <pre style={{ background: "#f7f7f7", padding: 8 }}>{status ? JSON.stringify(status, null, 2) : "loading..."}</pre>
        </div>

        <div style={{ flex: 1 }}>
          <h4>Processed History (newest first)</h4>
          <div style={{ border: "1px solid #ddd", padding: 8, height: 320, overflow: "auto", background: "#fff" }}>
            {history.length === 0 && <div style={{ color: "#666" }}>No processed tasks yet</div>}
            {history.map((h, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: "#666" }}>{h.startedAt} → {h.finishedAt} (id: {h.id})</div>
                <pre style={{ margin: 0 }}>{JSON.stringify(h.payload)}</pre>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}