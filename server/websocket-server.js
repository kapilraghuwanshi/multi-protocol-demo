import http from "http";
import { WebSocketServer } from "ws"; // install ws

const PORT = process.env.PORT ? Number(process.env.PORT) : 4050;

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("WebSocket server running\n");
});

const wss = new WebSocketServer({ server });

function broadcast(sender, data) {
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      // send to everyone (including sender). To exclude sender, check client !== sender
      client.send(data);
    }
  }
}

wss.on("connection", (ws, req) => {
  const addr = req.socket.remoteAddress;
  console.log("Client connected:", addr);

  // Send welcome message
  ws.send(JSON.stringify({ type: "welcome", message: "Connected to demo WebSocket server" }));

  ws.on("message", (raw) => {
    let parsed = raw;
    try {
      parsed = raw.toString();
      // assume JSON if possible
      const obj = JSON.parse(parsed);
      console.log("Received object message:", obj);
      // Simple protocol: { type: 'broadcast'|'echo'|'join', payload: ... }
      if (obj.type === "broadcast") {
        broadcast(ws, JSON.stringify({ type: "broadcast", from: obj.from || "anonymous", payload: obj.payload }));
      } else if (obj.type === "echo") {
        ws.send(JSON.stringify({ type: "echo", payload: obj.payload }));
      } else {
        // unknown type -> echo raw
        ws.send(JSON.stringify({ type: "unknown", raw: obj }));
      }
    } catch (err) {
      // not JSON, echo raw text
      console.log("Received raw message:", parsed);
      broadcast(ws, JSON.stringify({ type: "text", payload: parsed }));
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected:", addr);
  });

  ws.on("error", (err) => {
    console.error("WS error:", err);
  });
});

server.listen(PORT, () => {
  console.log(`WebSocket server listening on ws://localhost:${PORT}`);
});