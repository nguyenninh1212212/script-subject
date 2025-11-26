import protoLoader from "@grpc/proto-loader";
import grpc from "@grpc/grpc-js";
import dotenv from "dotenv";
dotenv.config();

const PROTO_PATH = "./src/proto/audio.proto";
const packageDef = protoLoader.loadSync(PROTO_PATH);
const grpcProto = grpc.loadPackageDefinition(packageDef).audio;
const client = new grpcProto.AudioSearch(
  process.env.AUDIO_SEARCH,
  grpc.credentials.createInsecure()
);

export default client;
