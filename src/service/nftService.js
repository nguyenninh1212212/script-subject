import { ethers } from "ethers";
import nftAbi from "../abi/TicketNFT.json" with { type: "json" };
import { badRequest } from "../middleware/errorHandler.js";

const RPC_URL = process.env.NFT_URL;
const CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS;
const ACCOUNT = process.env.NFT_ACCOUNT;
const PRIVATE_KEY = process.env.NFT_PRIVATE_KEY;

if (!PRIVATE_KEY || !CONTRACT_ADDRESS || !RPC_URL) {
    badRequest("NFT configuration is missing");
    process.exit(1);
}
const provider=new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, nftAbi.abi, wallet);


const mintTicketNFT = async ({userAddress}) => {
    if(!ethers.utils.isAddress(userAddress)) {
        badRequest("Invalid user address");
    }
    const tokenURI = `https://api.example.com/metadata/${Date.now()}.json`;
    const tx = await contract.mintTicket(userAddress, tokenURI);     
    await tx.wait();

    return tx.hash;
}

export default { mintTicketNFT };
