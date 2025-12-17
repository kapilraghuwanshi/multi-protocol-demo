# Multi-Protocol Demo

A compact learning repo showing multiple client-server communication protocols and patterns: GraphQL, WebSocket, WebRTC, gRPC, Server-Sent Events (SSE), Webhooks, Long Polling, and a simple Connection Pool demo.

**Prerequisites**
- Node.js (v18+ recommended)
- npm
- A modern browser (Chrome/Edge/Firefox/Safari)
- (Optional) `ngrok` for exposing local servers to the public (useful for GitHub webhooks)

**Repo layout (important files)**
- Server-side: `server/`
  - `graphql-server.js` (GraphQL)
  - `websocket-server.js` (WebSocket)
  - `webrtc-server.js` (WebRTC signaling)
  - `grpc-server.js`, `grpc-client.js`, `grpc-http-proxy.js` (gRPC + proxy)
  - `sse-server.js` (SSE)
  - `webhook-server.js` (Webhook receiver + SSE)
  - `polling-server.js` (Long polling)
  - `connectionpool-server.js` (Connection pool demo)
  - `proto/greeter.proto` (gRPC proto)
- Client-side: `client/src/pages/`
  - `GraphQLDemo.jsx`, `WebSocketDemo.jsx`, `WebRTCDemo.jsx`, `GRPCDemo.jsx`, `SSEdemo.jsx`, `WebhookDemo.jsx`, `PollingDemo.jsx`, `ConnectionPoolDemo.jsx`
- Dev tools:
  - `client/vite.config.js` — dev-time proxies to forward `/grpc`, `/sse`, `/webhook`, `/poll`, `/pool` paths to server ports.

**Install (once)**
- Server deps:
  ```bash
  cd server
  npm install
  ```
  (`server/package.json` includes dependencies: express, cors, body-parser, ws, @grpc/grpc-js, @grpc/proto-loader, apollo-server, graphql, etc.)
- Client deps:
  ```bash
  cd client
  npm install
  npm install @apollo/client graphql
  ```

**Top-level dev workflow**
- Start whichever server(s) you want to try (each runs in its own port). Then start the client:
  ```bash
  # start servers from server/
  cd server
  npm run start:graphql      # GraphQL (http://localhost:4000)
  npm run start:websocket    # WebSocket (ws://localhost:4050)
  npm run start:sse          # SSE (http://localhost:5400)
  npm run start:grpc         # gRPC (native) (localhost:50051)
  npm run start:grpc-proxy   # HTTP proxy for GraphQL/gRPC demo (localhost:5500)
  npm run start:webhook      # Webhook receiver (http://localhost:5600)
  npm run start:polling      # Long polling (http://localhost:5700)
  npm run start:pool         # Connection pool demo (http://localhost:5800)
  npm run start:webrtc       # WebRTC signaling (ws://localhost:4060)
  ```
  In another terminal:
  ```bash
  cd client
  npm run dev   # Vite (e.g. http://localhost:5173)
  ```

**Dev-time proxy (Vite)**
- `client/vite.config.js` proxies routes so client code can use relative URLs:
  - `/grpc` -> `http://localhost:5500` (gRPC HTTP proxy)
  - `/sse` -> `http://localhost:5400`
  - `/webhook` -> `http://localhost:5600`
  - `/poll` -> `http://localhost:5700`
  - `/pool` -> `http://localhost:5800`
- If you run servers on different ports, either enable the proxy or update client fetch/EventSource URLs to absolute origins.

**Quick demos & how to test (main 2–3 pointers each)**

**GraphQL**
- Files: `server/graphql-server.js`, `client/src/pages/GraphQLDemo.jsx`
- Run: `npm run start:graphql` (server) and start client.
- What to try:
  - Query `hello` and `time`.
  - Use mutations `createUser`, `updateUser`, `deleteUser` from UI or GraphQL explorer.
  - Fetch `externalPosts` (calls JSONPlaceholder).
- Pointers:
  - Server uses in-memory store (restart resets data).
  - Introspection enabled — use GraphQL explorer at `http://localhost:4000`.

**WebSocket**
- Files: `server/websocket-server.js`, `client/src/pages/WebSocketDemo.jsx`
- Run: `npm run start:websocket`
- What to try:
  - Open two browser tabs, connect both, send `broadcast` messages from one and observe other.
  - Use `wscat` (`npm i -g wscat`) to connect: `wscat -c ws://localhost:4050`
- Pointers:
  - Inspect handshake & frames: DevTools → Network → WS → Messages.
  - Expose `window.demoSocket` in client console for manual testing.

**WebRTC**
- Files: `server/webrtc-server.js` (signaling), `client/src/pages/WebRTCDemo.jsx`
- Run: `npm run start:webrtc` and client
- What to try:
  - Open two tabs, Connect Signaling → Start Camera/Mic → Join same room with different client IDs → Call All Peers.
  - Verify remote video shows on both sides.
- Pointers:
  - Demo uses STUN only (`stun:stun.l.google.com:19302`). No TURN — P2P may fail across NATs.
  - Signaling messages visible via DevTools Network → WS.

**gRPC (native + browser via proxy)**
- Files: `proto/greeter.proto`, `server/grpc-server.js`, `server/grpc-client.js`, `server/grpc-http-proxy.js`, `client/src/pages/GRPCDemo.jsx`
- Run:
  - Native gRPC server: `npm run start:grpc` (localhost:50051)
  - Optional gRPC HTTP proxy: `npm run start:grpc-proxy` (localhost:5500) — used by browser UI to call gRPC via HTTP/SSE.
  - Test native via `node grpc-client.js` or `grpcurl`.
- What to try:
  - Unary: `SayHello`
  - Server-stream: `ServerTime` (use client script)
  - In browser UI, use the HTTP proxy endpoints: `/grpc/sayHello`, `/grpc/serverTime` (SSE), `/grpc/createUser`.
- Pointers:
  - Browsers cannot call native gRPC directly — use gRPC-Web or an HTTP proxy (demo includes a simple proxy).
  - Use `grpcurl` for quick tests: `grpcurl -plaintext -d '{"name":"Kapil"}' localhost:50051 greeter.Greeter/SayHello`.

**SSE (Server-Sent Events)**
- Files: `server/sse-server.js`, `client/src/pages/SSEdemo.jsx`
- Run: `npm run start:sse`
- What to try:
  - Open SSE demo, Connect — receive periodic `tick` events and any pushed messages.
  - Push from server: POST `/sse/push` or use UI.
  - Terminal: `curl -N http://localhost:5400/sse/stream` to observe raw stream.
- Pointers:
  - SSE is uni-directional (server -> client). For client -> server use `fetch` or a separate POST endpoint.
  - Works well over normal HTTP/2/1.1 proxies.

**Webhooks**
- Files: `server/webhook-server.js`, `client/src/pages/WebhookDemo.jsx`
- Run: `npm run start:webhook`
- What to try:
  - UI: Connect SSE on `/webhook/sse` and click Send Test (`/webhook/send-test`).
  - Terminal: `curl -X POST http://localhost:5600/webhook -H "Content-Type: application/json" -d '{"orderId":123}'`
  - Expose to GitHub via `ngrok` and register `https://<ngrok>.ngrok.io/webhook` as a webhook (use same secret configured in your server).
- Pointers:
  - Verify HMAC signature: server can validate `x-hub-signature-256` using the secret (set `GITHUB_WEBHOOK_SECRET` env var).
  - Respond quickly (200 OK) and enqueue heavy work.

**Long Polling**
- Files: `server/polling-server.js`, `client/src/pages/PollingDemo.jsx`
- Run: `npm run start:polling`
- What to try:
  - Start Long-Poll Loop in client; server holds each GET up to timeout and returns when events exist.
  - Push an event (`POST /poll/push`) and observe the client receives it immediately (if blocked).
- Pointers:
  - Easier to work through proxies and firewalls than WebSockets.
  - Less efficient than SSE/WebSocket at scale but widely compatible.

**Connection Pooling (demo)**
- Files: `server/connectionpool-server.js`, `client/src/pages/ConnectionPoolDemo.jsx`
- Run: `npm run start:pool`
- What to try:
  - Send bursts of tasks from client; observe queue length and pool saturation.
  - History: see processed tasks as they complete.
- Pointers:
  - Demonstrates worker checkout/checkin, queueing when the pool is exhausted.
  - Tune `POOL_SIZE` (env var) to simulate scaling.

**Helpful commands (summary)**
- Start all common servers quickly (examples):
  ```bash
  cd server
  npm run start:graphql   # 4000
  npm run start:websocket  # 4050
  npm run start:webrtc     # 4060
  npm run start:grpc       # 50051 (native)
  npm run start:grpc-proxy # 5500 (HTTP proxy)
  npm run start:sse        # 5400
  npm run start:webhook    # 5600
  npm run start:polling    # 5700
  npm run start:pool       # 5800
  ```
- Start client:
  ```bash
  cd client
  npm run dev
  # open http://localhost:5173 and use the Learn menu
  ```

**Debug tips (main 2–3 pointers)**
- Multiple-tabs testing: use two browser tabs (or incognito) to simulate separate clients.
- DevTools:
  - WebSocket frames: Network → WS → Messages.
  - EventSource (SSE): Network → filter `EventStream` or look at response preview.
  - gRPC native: use `grpcurl` or `server/grpc-client.js`.
- If using multiple ports, enable `client/vite.config.js` proxy or use absolute URLs and ensure CORS is enabled in servers.

**Security notes**
- Do not commit secrets (e.g., GitHub webhook secret) to repo. Use environment variables (`GITHUB_WEBHOOK_SECRET`).
- Production needs TLS, authentication, rate limits, signature verification, retries and persistent storage.

**Next steps / optional items I can do for you**
- Add persistence (SQLite) for events.
- Add HMAC verification in `server/webhook-server.js` and a short guide to register the webhook on GitHub (ngrok steps).
- Add tests or CI hooks to exercise demos automatically.