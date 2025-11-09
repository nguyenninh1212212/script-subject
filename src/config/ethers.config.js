const {
  SEPOLIA_RPC_URL,
  NFT_PRIVATE_KEY,
  NFT_CONTRACT_ADDRESS,
  MY_ADMIN_SECRET_KEY,
} = process.env;
// --- Cấu hình Ethers.js ---
const provider = new JsonRpcProvider(SEPOLIA_RPC_URL);
const platformWallet = new Wallet(NFT_PRIVATE_KEY, provider); // Ví của BẠN

const factoryContract = new Contract(
  NFT_CONTRACT_ADDRESS,
  FactoryABI,
  platformWallet
);
