import React, { useState, useEffect, useRef } from "react";

/**
 * GRPC Demo page (uses server-side HTTP proxy endpoints).
 * - POST /grpc/sayHello         -> { name }
 * - GET  /grpc/serverTime?count=5&intervalMs=1000  -> SSE stream of time events
 * - POST /grpc/createUser      -> { name, email, imagePath }
 *
 * Note: Browsers cannot call native gRPC directly without gRPC-Web or a proxy.
 * This page uses a simple HTTP/SSE proxy on the server.
 * run both the grpc-server.js and grpc-http-proxy.js servers.
 *
 * Alternatively use grpcurl or the provided grpc-client.js to test native gRPC.
 */

export default function GRPCDemo() {
  const [helloName, setHelloName] = useState("Kapil");
  const [helloResp, setHelloResp] = useState(null);

  const [timeCount, setTimeCount] = useState(5);
  const [timeInterval, setTimeInterval] = useState(1000);
  const [timeEvents, setTimeEvents] = useState([]);
  const esRef = useRef(null);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newImage, setNewImage] = useState("");
  const [createdUser, setCreatedUser] = useState(null);

  async function sayHello() {
    setHelloResp(null);
    try {
      const res = await fetch("/grpc/sayHello", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: helloName }),
      });
      const json = await res.json();
      setHelloResp(json);
    } catch (err) {
      setHelloResp({ error: String(err) });
    }
  }

  function startServerTime() {
    stopServerTime(); // cleanup previous
    setTimeEvents([]);
    const url = `/grpc/serverTime?count=${encodeURIComponent(timeCount)}&intervalMs=${encodeURIComponent(timeInterval)}`;
    const es = new EventSource(url);
    esRef.current = es;
    es.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        setTimeEvents((s) => [...s, parsed]);
      } catch {
        setTimeEvents((s) => [...s, { raw: e.data }]);
      }
    };
    es.onerror = (err) => {
      // close on error/complete
      console.error("SSE error", err);
      es.close();
      esRef.current = null;
    };
  }

  function stopServerTime() {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }

  async function createUser() {
    setCreatedUser(null);
    try {
      const res = await fetch("/grpc/createUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, email: newEmail, imagePath: newImage }),
      });
      const json = await res.json();
      setCreatedUser(json);
    } catch (err) {
      setCreatedUser({ error: String(err) });
    }
  }

  useEffect(() => {
    return () => stopServerTime();
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2>gRPC Demo (via HTTP proxy)</h2>

      <section style={{ marginBottom: 20 }}>
        <h3>SayHello (unary)</h3>
        <input value={helloName} onChange={(e) => setHelloName(e.target.value)} style={{ marginRight: 8 }} />
        <button onClick={sayHello}>Say Hello</button>
        <div style={{ marginTop: 8 }}>
          <strong>Response:</strong>
          <pre>{helloResp ? JSON.stringify(helloResp, null, 2) : "—"}</pre>
        </div>
      </section>

      <section style={{ marginBottom: 20 }}>
        <h3>ServerTime (server-stream / SSE)</h3>
        <label>
          Count:
          <input type="number" value={timeCount} onChange={(e) => setTimeCount(Number(e.target.value))} style={{ width: 80, marginLeft: 8 }} />
        </label>
        <label style={{ marginLeft: 12 }}>
          Interval ms:
          <input type="number" value={timeInterval} onChange={(e) => setTimeInterval(Number(e.target.value))} style={{ width: 100, marginLeft: 8 }} />
        </label>
        <div style={{ marginTop: 8 }}>
          <button onClick={startServerTime} style={{ marginRight: 8 }}>Start Stream</button>
          <button onClick={stopServerTime}>Stop</button>
        </div>
        <div style={{ marginTop: 8 }}>
          <strong>Events:</strong>
          <ul>
            {timeEvents.map((t, i) => (
              <li key={i}><pre style={{ margin: 0 }}>{JSON.stringify(t)}</pre></li>
            ))}
          </ul>
        </div>
      </section>

      <section style={{ marginBottom: 20 }}>
        <h3>CreateUser (unary)</h3>
        <div>
          <input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ marginRight: 8 }} />
          <input placeholder="Email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} style={{ marginRight: 8 }} />
          <input placeholder="Image path" value={newImage} onChange={(e) => setNewImage(e.target.value)} style={{ marginRight: 8 }} />
          <button onClick={createUser}>Create</button>
        </div>
        <div style={{ marginTop: 8 }}>
          <strong>Created:</strong>
          <pre>{createdUser ? JSON.stringify(createdUser, null, 2) : "—"}</pre>
        </div>
      </section>

      <div style={{ marginTop: 24, color: "#666" }}>
        <div>Notes:</div>
        <ul>
          <li>Server must expose the proxy endpoints (`/grpc/sayHello`, `/grpc/serverTime`, `/grpc/createUser`).</li>
          <li>Alternatively use `grpcurl` or the provided node client scripts to test native gRPC.</li>
        </ul>
      </div>
    </div>
  );
}