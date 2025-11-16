import { ethers } from "ethers";
import factoryArtifact from "../abi/TicketFactory.json" assert { type: "json" };

// Provider
const NFT_URL = "http://127.0.0.1:8545";
export const provider = new ethers.JsonRpcProvider(NFT_URL);

// Wallet
const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  throw new Error("❌ PRIVATE_KEY not found in .env");
}
export const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Factory Contract
const FACTORY_ADDRESS = process.env.NFT_CONTRACT_ADDRESS;
if (!FACTORY_ADDRESS) {
  throw new Error("❌ FACTORY_ADDRESS not found in .env");
}

export const factoryContract = new ethers.Contract(
  FACTORY_ADDRESS,
  factoryArtifact.abi,
  wallet
);

export const factoryAbi = factoryArtifact;
export { ethers };

// Verify
(async () => {
  try {
    const signerAddress = await wallet.getAddress();
    const balance = await provider.getBalance(signerAddress);

    console.log("✅ Blockchain connected:");
    console.log("   Factory:", FACTORY_ADDRESS);
    console.log("   Signer:", signerAddress);
    console.log("   Balance:", ethers.formatEther(balance), "ETH");
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
  }
})();
