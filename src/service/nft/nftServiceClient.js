import path, { dirname } from "path"; // Import thêm "dirname"
import { fileURLToPath } from "url"; // Import "fileURLToPath"
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import "dotenv/config"; // (Nên import dotenv/config ở đây)

// --- SỬA LỖI TỪ ĐÂY ---
// 1. Lấy đường dẫn file hiện tại (dạng URL)
const __filename_url = import.meta.url;
// 2. Chuyển URL sang đường dẫn file (C:\...)
const __filename = fileURLToPath(__filename_url);
// 3. Lấy thư mục (giống như __dirname)
const __dirname = dirname(__filename);
// --- KẾT THÚC SỬA LỖI ---

// Bây giờ dòng này sẽ chạy đúng
const PROTO_PATH = path.join(__dirname, "../../proto/nft_service.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const nftProto = grpc.loadPackageDefinition(packageDefinition).nft;

const GRPC_SERVER_ADDRESS = process.env.GRPC_ADDR;

const nftClient = new nftProto.NftService(
  GRPC_SERVER_ADDRESS,
  grpc.credentials.createInsecure()
);
console.log(`✅ Monolith kết nối tới NFT Service tại: ${GRPC_SERVER_ADDRESS}`);

export default nftClient;
