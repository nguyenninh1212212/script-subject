// src/client.js
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROTO_PATH = path.join(__dirname, "..", "proto", "user.proto");

const packageDef = protoLoader.loadSync(PROTO_PATH, {});
const grpcObject = grpc.loadPackageDefinition(packageDef);
const userPackage = grpcObject.demo.user;

const client = new userPackage.UserService(
  "localhost:50051",
  grpc.credentials.createInsecure()
);

const req = {
  username: "alice",
  email: "alice@example.com",
  bio: "hello",
  age: 30,
  validate_only: false,
};

client.CreateUser(req, (err, res) => {
  if (err) {
    console.error("[client] RPC error:", err.code, err.message);
  } else {
    console.log("[client] Response:", res);
  }
});
