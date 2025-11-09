// src/fuzz_client.js
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import path from "path";
import minimist from "minimist";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const args = minimist(process.argv.slice(2), { boolean: ["dry"] });
const DRY = Boolean(args.dry);

const PROTO_PATH = path.join(__dirname, "..", "proto", "user.proto");
const packageDef = protoLoader.loadSync(PROTO_PATH, {});
const grpcObject = grpc.loadPackageDefinition(packageDef);
const userPackage = grpcObject.demo.user;

const client = new userPackage.UserService(
  "localhost:50051",
  grpc.credentials.createInsecure()
);

function bigString(n) {
  return "A".repeat(n);
}

const cases = [
  {
    name: "normal",
    payload: { username: "bob", email: "b@e.com", bio: "ok", age: 25 },
  },
  {
    name: "huge_username",
    payload: {
      username: bigString(5_000_000),
      email: "a@b.com",
      password: "secret",
    },
  },
  {
    name: "age_string",
    payload: {
      username: "c",
      email: "c@d.com",
      password: "secret",
    },
  },
  {
    name: "missing_email",
    payload: { username: "noemail", bio: "b", age: 22 },
  },
];

async function run() {
  for (const c of cases) {
    console.log(`=== case: ${c.name}  (dry-run=${DRY})`);
    const payload = { ...c.payload, validate_only: DRY };

    // metadata header option
    const meta = new grpc.Metadata();
    if (DRY) meta.add("dry-run", "true");

    await new Promise((resolve) => {
      // call with metadata if dry-run else without metadata
      const callback = (err, res) => {
        if (err) {
          console.error("[fuzz_client] ERR:", err.code, err.message);
        } else {
          console.log("[fuzz_client] OK:", res);
        }
        resolve();
      };

      if (DRY) client.CreateUser(payload, meta, callback);
      else client.CreateUser(payload, callback);
    });

    // wait a short time
    await new Promise((r) => setTimeout(r, 800));
  }
}

run();
