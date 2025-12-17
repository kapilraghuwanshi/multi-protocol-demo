# Multi-Protocol Demo

A small demo project showing multiple client-server protocols (GraphQL, WebSocket, WebRTC, and others). Each demo is minimal and intended for local learning and experimentation.

**Prerequisites**
- Node.js (v18+ recommended)
- npm
- A modern browser (Chrome, Firefox, Safari) for WebRTC

**Install (once)**
- Server dependencies:
  - From `server/`:
    - GraphQL demo uses `apollo-server` and `graphql` (already in `server/package.json`).
    - WebSocket & WebRTC signaling examples use `ws`.
  - Install:
    ```
    cd server
    npm install
    npm install ws
    ```
- Client dependencies:
  - From `client/`:
    ```
    cd client
    npm install
    npm install @apollo/client graphql
    ```

**Run the demos**
- Start GraphQL server:
  - From `server`:
    ```
    npm run start:graphql
    # or
    node graphql-server.js
    ```
  - Default: `http://localhost:4000` (Playground / Explorer available)

- Start WebSocket server:
  - From `server`:
    ```
    npm run start:websocket
    # or
    node websocket-server.js
    ```
  - Default WS URL used by client demo: `ws://localhost:4050`

- Start WebRTC signaling server:
  - From `server`:
    ```
    node webrtc-server.js
    ```
  - Default signaling WS URL used by client demo: `ws://localhost:4060`

- Start the client app (Vite):
  - From `client`:
    ```
    npm run dev
    ```
  - Open the Vite URL (e.g. `http://localhost:5173`) and use the "Learn" menu to access demos.

**GraphQL demo (client/server)**
- Files:
  - Server: `server/graphql-server.js`
  - Client page: `client/src/pages/GraphQLDemo.jsx`
- Key features:
  - Queries: `hello`, `time`, `users`, `externalPosts`
  - Mutations: `createUser`, `updateUser`, `deleteUser`
  - Uses an in-memory users store (restart the server to reset)
- Quick operations to try (GraphQL Explorer or client):
  - Query:
    ```
    query { hello time }
    ```
  - Create user:
    ```
    mutation {
      createUser(input: { name: "Charlie", email: "charlie@example.com" }) { id name email }
    }
    ```
  - External posts:
    ```
    query { externalPosts(limit: 3) { id title body } }
    ```

**WebSocket demo**
- Files:
  - Server: `server/websocket-server.js`
  - Client page: `client/src/pages/WebSocketDemo.jsx`
- Key features:
  - Simple broadcast/echo protocol using JSON messages: `{ type: "broadcast"|"echo", payload, from }`
  - Inspect handshake & frames in browser DevTools -> Network -> WS
- Quick tests:
  - Use two browser tabs or `wscat`:
    ```
    # install wscat if needed
    npm install -g wscat
    wscat -c ws://localhost:4050
    ```
  - Send JSON: `{"type":"broadcast","from":"cli","payload":"hello"}`

**WebRTC demo**
- Files:
  - Signaling server: `server/webrtc-server.js`
  - Client page: `client/src/pages/WebRTCDemo.jsx`
- Key features:
  - Mesh-style demo: each peer creates per-peer RTCPeerConnections
  - Uses STUN: `stun:stun.l.google.com:19302`
  - No TURN server included (P2P may fail across NATs)
- How to test locally:
  1. Start signaling server: `node server/webrtc-server.js` (ws://localhost:4060)
  2. Open two browser tabs to the client WebRTC page.
  3. In both tabs: Connect signaling -> Start Camera/Mic -> Join same room with different client IDs.
  4. Click "Call All Peers" in one tab; remote video should appear in both tabs.
- Inspect signaling:
  - Browser DevTools -> Network -> WS shows offers/answers/candidates.
  - Console logs are printed by the client; the signaling WS object is exposed as `window.__webrtc_ws`.


**Quick testing pointers (main 2–3)**
- Local multi-client testing:
  - Use multiple browser tabs (or browser + incognito) to simulate separate peers/clients.
- DevTools for debugging:
  - WebSocket frames and handshake: DevTools -> Network -> filter `WS`.
  - WebRTC signaling: same Network -> WS; Media streams: Console + video elements for live preview.
- Permissions & order:
  - Always grant camera/microphone permission and start the local stream before calling peers.
  - If you start signaling or call before starting the camera, add local tracks to existing RTCPeerConnections (demo includes logic to attach tracks when available).

**Capture / save media**
- To record streams in the browser, use `MediaRecorder` on a `MediaStream` (client-side). For raw frames use canvas or WebAudio for PCM samples. For packet-level RTP/SRTP inspection use native tools like Wireshark (SRTP is encrypted).

**Troubleshooting**
- "No local video": confirm permission and check Console for `getUserMedia` errors.
- "No remote video": check signaling WS frames, ensure both peers joined same room and local streams were added before/after offer.
- "NAT/connectivity problems": add a TURN server for production scenarios.
