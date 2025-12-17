// server/sse-server.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 5400;

// Keep track of connected clients
const clients = new Set();

// helper: send an SSE message to a response
function sendEvent(res, event, data) {
  if (event) res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// SSE endpoint: clients connect here to receive events
app.get("/sse/stream", (req, res) => {
  // Required headers for SSE
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  // Send an initial event
  sendEvent(res, "connected", { ts: new Date().toISOString() });

  // Add to clients set
  clients.add(res);
  console.log("SSE client connected (total):", clients.size);

  // Keep connection alive with comment/ping every 20s
  const keepAlive = setInterval(() => {
    try {
      res.write(": keepalive\n\n");
    } catch (err) {
      // ignore
    }
  }, 20000);

  // On close, cleanup
  req.on("close", () => {
    clearInterval(keepAlive);
    clients.delete(res);
    try {
      res.end();
    } catch {}
    console.log("SSE client disconnected (total):", clients.size);
  });
});

// Broadcast helper
function broadcast(event, payload) {
  for (const res of clients) {
    try {
      sendEvent(res, event, payload);
    } catch (err) {
      console.warn("Failed to send to client, removing.", err);
      try {
        res.end();
      } catch {}
      clients.delete(res);
    }
  }
}

// Push endpoint: send a message to all connected clients
app.post("/sse/push", (req, res) => {
  const { message = "", meta = {} } = req.body || {};
  const payload = { message, meta, ts: new Date().toISOString() };
  broadcast("message", payload);
  res.json({ ok: true, deliveredTo: clients.size, payload });
});

// A small endpoint to check server health
app.get("/sse/health", (req, res) => {
  res.json({ ok: true, clients: clients.size });
});

// Optional: server-side periodic broadcast (example)
let counter = 0;
setInterval(() => {
  counter++;
  broadcast("tick", { counter, ts: new Date().toISOString() });
}, 5000);

app.listen(PORT, () => {
  console.log(`SSE server listening at http://localhost:${PORT}`);
});