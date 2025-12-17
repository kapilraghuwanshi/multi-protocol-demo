// server/polling-server.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 5700;

// In-memory event store
const events = []; // newest last
const MAX_EVENTS = 500;
let nextId = 1;

// Pending long-poll responses: Set of {res, sinceId, timeout}
const pending = new Set();

function addEvent(payload) {
  const ev = {
    id: String(nextId++),
    ts: new Date().toISOString(),
    payload,
  };
  events.push(ev);
  if (events.length > MAX_EVENTS) events.shift();
  // notify all pending clients that have sinceId < ev.id
  for (const entry of Array.from(pending)) {
    const { res, sinceId, timer } = entry;
    const available = events.filter((e) => Number(e.id) > Number(sinceId));
    if (available.length > 0) {
      try {
        clearTimeout(timer);
        res.json({ ok: true, events: available });
      } catch (err) {
        // ignore
      }
      pending.delete(entry);
    }
  }
  return ev;
}

// Long-poll endpoint
// client provides ?since=<id> (last event id seen) ; server holds up to 30s
app.get("/poll/updates", (req, res) => {
  const sinceId = req.query.since || "0";
  const timeoutMs = 10_000; // 10s
  // check immediately
  const available = events.filter((e) => Number(e.id) > Number(sinceId));
  if (available.length > 0) {
    return res.json({ ok: true, events: available });
  }

  // otherwise hold connection
  // set headers for JSON long-poll response
  res.setHeader("Cache-Control", "no-cache, no-transform");
  const timer = setTimeout(() => {
    try {
      res.json({ ok: true, events: [] }); // empty response on timeout
    } catch (err) {}
    pending.delete(entry);
  }, timeoutMs);

  const entry = { res, sinceId, timer };
  pending.add(entry);

  // cleanup on client close
  req.on("close", () => {
    clearTimeout(timer);
    pending.delete(entry);
  });
});

// Push endpoint: clients or test code POST here to create an event
app.post("/poll/push", (req, res) => {
  const payload = req.body || {};
  const ev = addEvent(payload);
  res.json({ ok: true, id: ev.id });
});

// Polling history endpoint (short)
app.get("/poll/history", (req, res) => {
  // return last N events (default 50)
  const limit = Math.min(Number(req.query.limit) || 50, 500);
  const slice = events.slice(-limit);
  res.json({ ok: true, events: slice });
});

// health
app.get("/poll/health", (req, res) => {
  res.json({ ok: true, events: events.length, pending: pending.size });
});

app.listen(PORT, () => {
  console.log(`Polling server listening at http://localhost:${PORT}`);
});