// server/grpc-client.js
import path from "path";
import { fileURLToPath } from "url";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";

// Run the client examples (in another terminal) - server to server gRPC calls:

// node grpc-client.js sayHello Kapil
// node grpc-client.js time 5 1000    # server-stream (5 messages, 1s interval)
// node grpc-client.js createUser "Charlie" "charlie@example.com" "/images/charlie.png"

// # unary
// grpcurl -plaintext -d '{"name":"Kapil"}' localhost:50051 greeter.Greeter/SayHello
// # server streaming (grpcurl prints streaming results)
// grpcurl -plaintext -d '{"count":3,"intervalMs":1000}' localhost:50051 greeter.Greeter/ServerTime
// # create user
// grpcurl -plaintext -d '{"name":"Charlie","email":"c@example.com"}' localhost:50051 greeter.Greeter/CreateUser

// else run on postman
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROTO_PATH = path.join(__dirname, "./proto/greeter.proto");

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const grpcObject = grpc.loadPackageDefinition(packageDef);
const greeter = grpcObject.greeter;

const client = new greeter.Greeter("localhost:50051", grpc.credentials.createInsecure());

function sayHello(name = "world") {
  client.SayHello({ name }, (err, res) => {
    if (err) return console.error("SayHello error:", err);
    console.log("SayHello response:", res);
  });
}

function serverTime(count = 5, intervalMs = 1000) {
  const stream = client.ServerTime({ count: Number(count), intervalMs: Number(intervalMs) });
  stream.on("data", (chunk) => {
    console.log("ServerTime:", chunk);
  });
  stream.on("end", () => {
    console.log("ServerTime stream ended");
  });
  stream.on("error", (err) => {
    console.error("ServerTime error:", err);
  });
}

function createUser(name, email, imagePath) {
  client.CreateUser({ name, email, imagePath }, (err, user) => {
    if (err) return console.error("CreateUser error:", err);
    console.log("Created user:", user);
  });
}

const argv = process.argv.slice(2);
const cmd = argv[0];

if (cmd === "sayHello") {
  sayHello(argv[1] || "node");
} else if (cmd === "time") {
  serverTime(argv[1] || 5, argv[2] || 1000);
} else if (cmd === "createUser") {
  createUser(argv[1] || "NewUser", argv[2] || "new@example.com", argv[3] || "");
} else {
  console.log("Usage: node grpc-client.js <sayHello|time|createUser> [args...]");
  console.log("Examples:");
  console.log("  node grpc-client.js sayHello Kapil");
  console.log("  node grpc-client.js time 5 1000");
  console.log("  node grpc-client.js createUser Charlie charlie@example.com /images/charlie.png");
}