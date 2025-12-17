import React, { useRef, useState, useEffect } from "react";

/**
 * Simple WebRTC demo page that uses a ws signaling server.
 *
 * - Start local camera
 * - Join a room with a client id
 * - When other peers join, you can "Call All" which creates offers to each peer
 * - Incoming offers/answers/candidates are handled and remote streams shown
 *
 * Works for local testing: open two browser tabs, join same room with different client ids.
 */

const STUN_SERVERS = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

function makeId(len = 6) {
    return Math.random().toString(36).slice(2, 2 + len);
}

export default function WebRTCDemo() {
    const [wsUrl, setWsUrl] = useState("ws://localhost:4060");
    const [room, setRoom] = useState("demo-room");
    const [clientId, setClientId] = useState(() => "c-" + makeId(4));
    const [connected, setConnected] = useState(false);
    const [joined, setJoined] = useState(false);
    const [peers, setPeers] = useState([]); // array of peer ids
    const [localStream, setLocalStream] = useState(null);

    const wsRef = useRef(null);
    const pcMap = useRef(new Map()); // remoteId -> RTCPeerConnection
    const remoteStreams = useRef(new Map()); // remoteId -> MediaStream
    const localVideoRef = useRef(null);
    const remoteContainerRef = useRef(null);

    useEffect(() => {
        return () => {
            // cleanup
            if (wsRef.current) wsRef.current.close();
            pcMap.current.forEach((pc) => pc.close());
            if (localStream) {
                localStream.getTracks().forEach((t) => t.stop());
            }
        };
    }, []);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // Ensure any existing peer connections get local tracks when localStream becomes available
    useEffect(() => {
        if (!localStream) return;
        pcMap.current.forEach((pc, remoteId) => {
            try {
                localStream.getTracks().forEach((track) => {
                    const already = pc.getSenders().some((s) => s.track && s.track.id === track.id);
                    if (!already) {
                        pc.addTrack(track, localStream);
                    }
                });
            } catch (err) {
                console.warn("Failed to add local tracks to pc", remoteId, err);
            }
        });
    }, [localStream]);

    function log(...args) {
        console.log("[webrtc-demo]", ...args);
    }

    // Connect to signaling server
    function connect() {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
        try {
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;
            log("Connecting to", wsUrl);
            ws.onopen = () => {
                setConnected(true);
                log("WS open");
            };
            ws.onclose = () => {
                setConnected(false);
                setJoined(false);
                log("WS closed");
            };
            ws.onerror = (e) => {
                log("WS error", e);
            };
            ws.onmessage = (evt) => {
                try {
                    const msg = JSON.parse(evt.data);
                    handleSignalMessage(msg);
                } catch (err) {
                    log("Invalid WS message", evt.data);
                }
            };
            // expose for console debugging
            window.__webrtc_ws = ws;
        } catch (err) {
            console.error("Failed to connect", err);
        }
    }

    function sendSignal(obj) {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            console.warn("WS not open");
            return;
        }
        wsRef.current.send(JSON.stringify(obj));
    }

    function asyncGetUserMedia() {
        return navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    }

    async function startLocal() {
        try {
            const stream = await asyncGetUserMedia();
            setLocalStream(stream);
            log("Got local stream");
        } catch (err) {
            console.error("getUserMedia failed", err);
            alert("Camera/mic access required for demo");
        }
    }

    // Create RTCPeerConnection for a remote peer
    function createPeerConnection(remoteId) {
        if (pcMap.current.has(remoteId)) return pcMap.current.get(remoteId);

        const pc = new RTCPeerConnection(STUN_SERVERS);

        // add local tracks
        if (localStream) {
            localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
        }

        // onicecandidate -> send to remote
        pc.onicecandidate = (evt) => {
            if (evt.candidate) {
                sendSignal({
                    type: "candidate",
                    room,
                    to: remoteId,
                    candidate: evt.candidate,
                });
            }
        };

        // ontrack -> attach remote stream
        const remoteStream = new MediaStream();
        remoteStreams.current.set(remoteId, remoteStream);
        if (remoteContainerRef.current) {
            // remote video elements are created in render from remoteStreams state
        }
       pc.ontrack = (evt) => {
  const remoteStream = remoteStreams.current.get(remoteId);
  if (!remoteStream) return;

  // If event provides streams, attach those tracks
  if (evt.streams && evt.streams.length > 0) {
    const src = evt.streams[0];
    src.getTracks().forEach((t) => {
      if (!remoteStream.getTracks().some((rt) => rt.id === t.id)) {
        remoteStream.addTrack(t);
      }
    });
  } else if (evt.track) {
    // fallback: add single track
    if (!remoteStream.getTracks().some((rt) => rt.id === evt.track.id)) {
      remoteStream.addTrack(evt.track);
    }
  }

  // trigger re-render so remote video element is created/updated
  setPeers((p) => [...p]);
};

        pc.onconnectionstatechange = () => {
            log("pc state", remoteId, pc.connectionState);
            if (pc.connectionState === "failed" || pc.connectionState === "closed") {
                // cleanup
                pc.close();
                pcMap.current.delete(remoteId);
                remoteStreams.current.delete(remoteId);
                setPeers((p) => p.filter((id) => id !== remoteId));
            }
        };

        pcMap.current.set(remoteId, pc);
        return pc;
    }

    async function callAllPeers() {
        // create an offer for each known peer
        for (const remoteId of peers) {
            if (remoteId === clientId) continue;
            const pc = createPeerConnection(remoteId);
            try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                sendSignal({
                    type: "offer",
                    room,
                    to: remoteId,
                    sdp: pc.localDescription,
                });
                log("Sent offer to", remoteId);
            } catch (err) {
                console.error("Offer failed", err);
            }
        }
    }

    // Handles any incoming signaling messages from ws
    async function handleSignalMessage(msg) {
        const { type, from, to, sdp, candidate, peers: existing } = msg;
        log("signal", msg.type, "from", from);

        if (type === "joined") {
            // we have joined the room; existing peers listed
            setJoined(true);
            if (Array.isArray(existing)) {
                // filter out ourselves if present
                setPeers(existing.filter((id) => id !== clientId));
            }
            return;
        }

        if (type === "peer-joined") {
            // a new peer joined
            if (from && from !== clientId) {
                setPeers((p) => {
                    if (p.includes(from)) return p;
                    return [...p, from];
                });
            }
            return;
        }

        if (type === "peer-left") {
            if (msg.id) {
                // remove peer
                pcMap.current.get(msg.id)?.close();
                pcMap.current.delete(msg.id);
                remoteStreams.current.delete(msg.id);
                setPeers((p) => p.filter((id) => id !== msg.id));
            }
            return;
        }

        if (type === "offer" && sdp) {
            // incoming offer from 'from'
            if (from === clientId) return;
            const pc = createPeerConnection(from);
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                sendSignal({
                    type: "answer",
                    room,
                    to: from,
                    sdp: pc.localDescription,
                });
                log("Answered offer from", from);
            } catch (err) {
                console.error("Failed to handle offer", err);
            }
            return;
        }

        if (type === "answer" && sdp) {
            // incoming answer to an offer we created
            const pc = pcMap.current.get(from);
            if (!pc) {
                console.warn("No pc for answer from", from);
                return;
            }
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                log("Set remote answer from", from);
            } catch (err) {
                console.error("setRemoteDescription(answer) failed", err);
            }
            return;
        }

        if (type === "candidate" && candidate) {
            const pc = pcMap.current.get(from);
            if (!pc) {
                // If pc not ready yet, you could queue candidates; for simplicity we try to add directly
                console.warn("No pc for candidate from", from);
                return;
            }
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
                console.error("addIceCandidate failed", err);
            }
            return;
        }

        if (type === "error") {
            console.error("Signal error:", msg.message);
            return;
        }

        // unknown message
        log("unknown message", msg);
    }

    function joinRoom() {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            alert("Connect to signaling server first");
            return;
        }
        // send join (server will respond with 'joined' message)
        sendSignal({ type: "join", room, id: clientId });
        log("Joining", room, "as", clientId);
    }

    function leaveRoom() {
        // tell server and cleanup
        sendSignal({ type: "leave", room, id: clientId });
        setJoined(false);
        pcMap.current.forEach((pc) => pc.close());
        pcMap.current.clear();
        remoteStreams.current.clear();
        setPeers([]);
    }

    function createRemoteVideoElem(remoteId) {
        const stream = remoteStreams.current.get(remoteId);
        if (!stream) return null;
        return (
            <div key={remoteId} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: "#666" }}>Peer: {remoteId}</div>
                <video
                    autoPlay
                    playsInline
                    ref={(el) => {
                        if (!el) return;
                        if (el.srcObject !== stream) el.srcObject = stream;
                    }}
                    style={{ width: 320, border: "1px solid #ccc" }}
                />
            </div>
        );
    }

    return (
        <div style={{ padding: 16 }}>
            <h2>WebRTC Demo</h2>

            <div style={{ marginBottom: 12 }}>
                <label>
                    Signaling WS URL:{" "}
                    <input value={wsUrl} onChange={(e) => setWsUrl(e.target.value)} style={{ width: 320 }} />
                </label>
                <div style={{ marginTop: 8 }}>
                    <button onClick={connect} disabled={connected}>
                        Connect Signaling
                    </button>{" "}
                    <button
                        onClick={() => {
                            if (wsRef.current) {
                                wsRef.current.close();
                                wsRef.current = null;
                            }
                            setConnected(false);
                            setJoined(false);
                        }}
                        disabled={!connected}
                    >
                        Disconnect
                    </button>
                    <span style={{ marginLeft: 12 }}>
                        WS: {connected ? "connected" : "disconnected"} | Joined: {joined ? "yes" : "no"}
                    </span>
                </div>
            </div>

            <div style={{ marginBottom: 12 }}>
                <label>
                    Room:{" "}
                    <input value={room} onChange={(e) => setRoom(e.target.value)} style={{ width: 200 }} />
                </label>{" "}
                <label style={{ marginLeft: 8 }}>
                    Client ID:{" "}
                    <input value={clientId} onChange={(e) => setClientId(e.target.value)} style={{ width: 160 }} />
                </label>
                <div style={{ marginTop: 8 }}>
                    <button onClick={joinRoom} disabled={!connected || joined}>
                        Join Room
                    </button>{" "}
                    <button onClick={leaveRoom} disabled={!joined}>
                        Leave Room
                    </button>
                </div>
            </div>

            <div style={{ marginBottom: 12 }}>
                <button onClick={startLocal} disabled={!!localStream}>
                    Start Camera/Mic
                </button>{" "}
                <button onClick={callAllPeers} disabled={!joined || !localStream || peers.length === 0}>
                    Call All Peers ({peers.length})
                </button>
            </div>

            <div style={{ display: "flex", gap: 16 }}>
                <div>
                    <div>Local</div>
                    <video ref={localVideoRef} autoPlay playsInline muted style={{ width: 320, border: "1px solid #ccc" }} />
                </div>

                <div ref={remoteContainerRef}>
                    <div>Remote Peers</div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        {peers.map((id) => createRemoteVideoElem(id))}
                    </div>
                </div>
            </div>
        </div>
    );
}