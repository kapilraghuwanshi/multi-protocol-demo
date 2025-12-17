// server/webhook-server.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

// Next Goal:
// Expose your local server publicly (ngrok) so GitHub can POST to it.
// Register a webhook in your GitHub repo pointing to the ngrok URL
// HMAC verification - (compare x-hub-signature-256 to HMAC-SHA256 of raw request body using a secret).

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 5600;

// In-memory store (keep recent events)
const events = []; // newest last
const MAX_EVENTS = 50;

// SSE clients
const sseClients = new Set();

function pushEvent(obj) {
  // store
  events.push(obj);
  if (events.length > MAX_EVENTS) events.shift();
  // broadcast to SSE clients
  const payload = JSON.stringify(obj);
  for (const res of sseClients) {
    try {
      res.write(`data: ${payload}\n\n`);
    } catch (err) {
      try { res.end(); } catch {}
      sseClients.delete(res);
    }
  }
}

// Receive external webhook POST (typical webhook endpoint)
app.post("/webhook", (req, res) => {
  const headers = req.headers;
  const body = req.body;
  const ev = {
    id: Date.now().toString(36) + "-" + Math.floor(Math.random() * 10000),
    source: "external",
    ts: new Date().toISOString(),
    headers,
    body,
  };
  pushEvent(ev);
  console.log("Received webhook:", ev.id);
  // respond 200 to sender
  res.status(200).json({ ok: true, id: ev.id });
});

// Test sender: trigger a webhook event (simulates external sender)
app.post("/webhook/send-test", (req, res) => {
  const { message = "test webhook", meta = {} } = req.body || {};
  const ev = {
    id: Date.now().toString(36) + "-" + Math.floor(Math.random() * 10000),
    source: "test",
    ts: new Date().toISOString(),
    meta,
    body: { message },
  };
  pushEvent(ev);
  console.log("Sent test webhook:", ev.id);
  res.json({ ok: true, id: ev.id });
});

// SSE endpoint for UI clients to receive live events
app.get("/webhook/sse", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  // Send current backlog as initial event
  res.write(`data: ${JSON.stringify({ type: "init", events })}\n\n`);

  // Keep-alive comment
  const keepAlive = setInterval(() => {
    try { res.write(": keepalive\n\n"); } catch {}
  }, 20000);

  sseClients.add(res);
  console.log("SSE client connected. total:", sseClients.size);

  req.on("close", () => {
    clearInterval(keepAlive);
    sseClients.delete(res);
    try { res.end(); } catch {}
    console.log("SSE client disconnected. total:", sseClients.size);
  });
});

// Simple events endpoint (polling)
app.get("/webhook/events", (req, res) => {
  res.json({ ok: true, events });
});

// Health
app.get("/webhook/health", (req, res) => {
  res.json({ ok: true, clients: sseClients.size, events: events.length });
});

app.listen(PORT, () => {
  console.log(`Webhook server listening at http://localhost:${PORT}`);
});