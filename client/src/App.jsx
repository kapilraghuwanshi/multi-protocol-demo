import './App.css'
import { Routes, Route, Link } from "react-router-dom";
//import WebSocketDemo from "./pages/GraphQLDemo";
import GraphQLDemo from "./pages/GraphQLDemo";
// import WebRTCDemo from "./pages/WebRTCDemo";
// import GRPCDemo from "./pages/GRPCDemo";
// import WebhookDemo from "./pages/WebhookDemo";
// import SSEdemo from "./pages/SSEdemo";
// import PollingDemo from "./pages/PollingDemo";
// import ConnectionPoolDemo from "./pages/ConnectionPoolDemo";

function App() {
  return (
    <div>
      <nav>
        Learn
        <ul>
          {/* <li><Link to="/websocket">WebSocket</Link></li> */}
          <li><Link to="/graphql">GraphQL</Link></li>
          {/* <li><Link to="/webrtc">WebRTC</Link></li>
          <li><Link to="/grpc">gRPC</Link></li>
          <li><Link to="/webhook">Webhook</Link></li>
          <li><Link to="/sse">SSE</Link></li>
          <li><Link to="/polling">Polling</Link></li> */}
          {/* <li><Link to="/pooling">Connection Pooling</Link></li> */}
        </ul>
      </nav>
      <Routes>
        {/* <Route path="/websocket" element={<WebSocketDemo />} /> */}
        <Route path="/graphql" element={<GraphQLDemo />} />
        {/* <Route path="/webrtc" element={<WebRTCDemo />} />
        <Route path="/grpc" element={<GRPCDemo />} />
        <Route path="/webhook" element={<WebhookDemo />} />
        <Route path="/sse" element={<SSEdemo />} />
        <Route path="/polling" element={<PollingDemo />} />
        <Route path="/pooling" element={<ConnectionPoolDemo />} /> */}
      </Routes>
    </div>
  );
}

export default App;