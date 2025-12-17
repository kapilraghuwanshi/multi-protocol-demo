//  browsers can't call native gRPC directly, so I'll give you a small React page 
// GRPCDemo.jsx that talks to a tiny HTTP proxy (REST + SSE) on the server which 
// forwards to the gRPC handlers

// npm run start:grpc 

// Minimal HTTP proxy (Express) to call the same handler logic for browser demo
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

const httpApp = express();
httpApp.use(cors());
httpApp.use(bodyParser.json());

// unary proxy
httpApp.post("/grpc/sayHello", (req, res) => {
  const name = req.body?.name || "world";
  // reuse your SayHello handler logic directly if available, otherwise call the gRPC client.
  // Example: call the in-process function SayHello-like:
  const reply = { message: `Hello, ${name}!`, time: new Date().toISOString() };
  res.json(reply);
});

// server-stream -> SSE
httpApp.get("/grpc/serverTime", (req, res) => {
  const count = Number(req.query.count) || 5;
  const intervalMs = Number(req.query.intervalMs) || 1000;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  let sent = 0;
  const iv = setInterval(() => {
    if (sent >= count) {
      clearInterval(iv);
      res.write("event: end\n\n");
      res.end();
      return;
    }
    sent++;
    const payload = { time: new Date().toISOString(), seq: sent };
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }, intervalMs);

  req.on("close", () => {
    clearInterval(iv);
  });
});

// create user proxy
let _users = []; // or reuse your server's in-memory users
function _nextId() { return String(Math.max(0, ..._users.map(u=>Number(u.id||0)))+1); }

httpApp.post("/grpc/createUser", (req, res) => {
  const { name, email, imagePath } = req.body || {};
  const u = { id: _nextId(), name: name || "Unnamed", email: email || "", imagePath: imagePath || null, createdAt: new Date().toISOString() };
  _users.push(u);
  res.json(u);
});

const HTTP_PORT = process.env.HTTP_PORT || 5500;
httpApp.listen(HTTP_PORT, () => console.log(`gRPC HTTP proxy listening at http://localhost:${HTTP_PORT}`));