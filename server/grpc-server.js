// server/grpc-server.js
import path from "path";
import { fileURLToPath } from "url";
import grpc from "@grpc/grpc-js"; // npm install
import protoLoader from "@grpc/proto-loader"; // npm install

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

const PORT = process.env.PORT || 50051;

const users = [
  { id: "1", name: "Kapil Raghuwanshi", email: "kapil@example.com", imagePath: "/images/kapil.png", createdAt: new Date().toISOString() },
];

function nextId() {
  return String(Math.max(0, ...users.map(u => Number(u.id || 0))) + 1);
}

function SayHello(call, callback) {
  const name = call.request?.name || "world";
  callback(null, { message: `Hello, ${name}!`, time: new Date().toISOString() });
}

function ServerTime(call) {
  const count = call.request?.count || 5;
  const intervalMs = call.request?.intervalMs || 1000;
  let sent = 0;
  const iv = setInterval(() => {
    if (sent >= count) {
      clearInterval(iv);
      call.end();
      return;
    }
    sent++;
    call.write({ time: new Date().toISOString(), seq: sent });
  }, intervalMs);

  call.on("cancelled", () => {
    clearInterval(iv);
  });
}

function CreateUser(call, callback) {
  const input = call.request || {};
  const newUser = {
    id: nextId(),
    name: input.name || "Bhoomika Raghuwanshi",
    email: input.email || "",
    imagePath: input.imagePath || null,
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  callback(null, newUser);
}

function main() {
  const server = new grpc.Server();
  server.addService(greeter.Greeter.service, { SayHello, ServerTime, CreateUser });
  server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error("gRPC server bind failed:", err);
      return;
    }
    server.start();
    console.log(`gRPC server listening on 0.0.0.0:${port}`);
  });
}

main();