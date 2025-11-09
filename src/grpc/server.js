// src/server.js
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import path from "path";
import { fileURLToPath } from "url";
import process from "process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROTO_PATH = path.join(__dirname, "..", "proto", "user.proto");

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const grpcObject = grpc.loadPackageDefinition(packageDef);
const userPackage = grpcObject.demo.user;

/** Basic validation function — replace with proto-gen validators in production */
function validateCreateUser(req) {
  const errs = [];
  if (
    typeof req.username !== "string" ||
    req.username.length < 3 ||
    req.username.length > 64
  ) {
    errs.push("username length must be 3..64");
  }
  if (
    typeof req.email !== "string" ||
    req.email.length < 5 ||
    req.email.length > 254 ||
    req.email.indexOf("@") === -1
  ) {
    errs.push("email invalid");
  }
  if (typeof req.bio === "string" && req.bio.length > 200) {
    errs.push("bio too long");
  }
  if (req.age !== undefined) {
    const ageNum = Number(req.age);
    if (!Number.isFinite(ageNum) || ageNum < 0 || ageNum > 200) {
      errs.push("age must be 0..200");
    }
  }
  return errs;
}

/** Simulated DB write — DO NOT call if validate_only */
function persistUserToDB(req) {
  // NOTE: this is simulated and does not access a real DB; replace in real app.
  return "user-" + Math.random().toString(36).slice(2, 10);
}

function createUser(call, callback) {
  const req = call.request || {};
  // read metadata map (grpc-js)
  const meta =
    call.metadata && typeof call.metadata.getMap === "function"
      ? call.metadata.getMap()
      : {};
  const metaDryRun = meta["dry-run"] === "true" || meta["dry-run"] === true;
  const validateOnlyFlag = Boolean(req.validate_only) || metaDryRun;

  console.log(
    `[server] Received CreateUser (validate_only=${validateOnlyFlag}), usernameLen=${
      req.username ? req.username.length : 0
    }`
  );

  // 1 - validate
  const errs = validateCreateUser(req);
  if (errs.length > 0) {
    return callback({
      code: grpc.status.INVALID_ARGUMENT,
      message: "validation failed: " + errs.join("; "),
    });
  }

  // 2 - if dry-run -> do not persist
  if (validateOnlyFlag) {
    return callback(null, {
      id: "",
      message: "validated (dry-run); no record created",
    });
  }

  // 3 - persist (simulated) and respond
  const id = persistUserToDB(req);
  return callback(null, { id, message: "created" });
}

function main() {
  const server = new grpc.Server({
    // Server options can be added here
  });

  server.addService(userPackage.UserService.service, {
    CreateUser: createUser,
  });

  const addr = process.env.GRPC_ADDR || "0.0.0.0:50051";
  server.bindAsync(
    addr,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error("bind error:", err);
        process.exit(1);
      }
      console.log(`[server] gRPC server listening on ${addr}`);
      server.start();
    }
  );
}

main();
