// server/webrtc-server.js
import http from "http";
import { WebSocketServer } from "ws"; // ws used as singalling server for WebRTC

const PORT = process.env.PORT ? Number(process.env.PORT) : 4060;

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("WebRTC signaling server running\n");
});

const wss = new WebSocketServer({ server });

/**
 * rooms: Map<roomId, Set<ws>>
 * Each ws will have: ws.id (clientId) and ws.room
 */
const rooms = new Map();

function send(ws, obj) {
  try {
    ws.send(JSON.stringify(obj));
  } catch (err) {
    console.error("send error", err);
  }
}

function broadcastToRoom(room, senderWs, obj) {
  const set = rooms.get(room);
  if (!set) return;
  for (const client of set) {
    if (client.readyState === client.OPEN && client !== senderWs) {
      send(client, obj);
    }
  }
}

wss.on("connection", (ws, req) => {
  console.log("WS connection");

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch (err) {
      console.warn("Invalid JSON:", raw.toString());
      return;
    }

    const { type, room, id, to } = msg;

    if (type === "join") {
      if (!room || !id) {
        send(ws, { type: "error", message: "join requires {room, id}" });
        return;
      }
      ws.id = id;
      ws.room = room;

      if (!rooms.has(room)) rooms.set(room, new Set());
      const set = rooms.get(room);

      // inform the joining client about existing peers
      const existing = Array.from(set).map((c) => c.id).filter(Boolean);
      send(ws, { type: "joined", room, id, peers: existing });

      // inform others in room about the new peer
      broadcastToRoom(room, ws, { type: "peer-joined", id });

      set.add(ws);
      console.log(`Client ${id} joined room ${room} (peers: ${existing.length})`);
      return;
    }

    if (type === "leave") {
      const roomId = ws.room;
      if (roomId && rooms.has(roomId)) {
        rooms.get(roomId).delete(ws);
        broadcastToRoom(roomId, ws, { type: "peer-left", id: ws.id });
      }
      ws.close();
      return;
    }

    // Relay signaling messages: offer/answer/candidate
    if (["offer", "answer", "candidate"].includes(type)) {
      if (!ws.room) {
        send(ws, { type: "error", message: "Not in a room" });
        return;
      }

      // If `to` is specified, send only to that client
      if (to) {
        const set = rooms.get(ws.room);
        if (!set) return;
        for (const client of set) {
          if (client.id === to && client.readyState === client.OPEN) {
            send(client, { ...msg, from: ws.id });
            return;
          }
        }
      } else {
        // broadcast to all other clients in the room
        broadcastToRoom(ws.room, ws, { ...msg, from: ws.id });
      }
      return;
    }

    // unknown type
    send(ws, { type: "error", message: `Unknown message type: ${type}` });
  });

  ws.on("close", () => {
    const room = ws.room;
    if (room && rooms.has(room)) {
      rooms.get(room).delete(ws);
      broadcastToRoom(room, ws, { type: "peer-left", id: ws.id });
    }
    console.log("WS disconnected", ws.id ?? "");
  });

  ws.on("error", (err) => {
    console.error("WS error:", err);
  });

  // optional: keep-alive ping/pong could be added for production
});

server.listen(PORT, () => {
  console.log(`WebRTC signaling server listening on ws://localhost:${PORT}`);
});