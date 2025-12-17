// server/connectionpool-server.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 5800;
const POOL_SIZE = Number(process.env.POOL_SIZE || 3);

let availableWorkers = POOL_SIZE;
const queue = []; // queued tasks: { id, payload, createdAt }
const history = []; // completed tasks: { id, payload, startedAt, finishedAt, durationMs }

let nextId = 1;

function now() { return new Date().toISOString(); }

function startProcessing(task) {
  const startedAt = now();
  const durationMs = Number(task.payload.durationMs || (Math.random() * 2000 + 1000));
  // mark worker busy
  availableWorkers--;
  const id = task.id;

  // simulate work
  setTimeout(() => {
    const finishedAt = now();
    history.push({
      id,
      payload: task.payload,
      startedAt,
      finishedAt,
      durationMs,
    });
    // free worker
    availableWorkers++;
    // try to dequeue next
    if (queue.length > 0) {
      const next = queue.shift();
      // start next asynchronously
      setImmediate(() => startProcessing(next));
    }
  }, durationMs);

  return { id, status: "processing", startedAt, expectedMs: durationMs };
}

app.post("/pool/task", (req, res) => {
  const payload = req.body || {};
  const id = String(nextId++);
  const task = { id, payload, createdAt: now() };

  // If a worker available, start immediately
  if (availableWorkers > 0) {
    const info = startProcessing(task);
    return res.json({ ok: true, id, status: info.status, startedAt: info.startedAt, expectedMs: info.expectedMs });
  }

  // otherwise queue and return position
  queue.push(task);
  return res.json({ ok: true, id, status: "queued", position: queue.length });
});

app.get("/pool/status", (req, res) => {
  res.json({
    ok: true,
    poolSize: POOL_SIZE,
    available: availableWorkers,
    busy: POOL_SIZE - availableWorkers,
    queueLength: queue.length,
  });
});

app.get("/pool/history", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 500);
  // return newest-first
  const slice = history.slice(-limit).reverse();
  res.json({ ok: true, history: slice });
});

app.get("/pool/health", (req, res) => {
  res.json({
    ok: true,
    poolSize: POOL_SIZE,
    available: availableWorkers,
    queueLength: queue.length,
    processed: history.length,
  });
});

app.listen(PORT, () => {
  console.log(`Connection pool demo server listening at http://localhost:${PORT}`);
  console.log(`Pool size: ${POOL_SIZE}`);
});