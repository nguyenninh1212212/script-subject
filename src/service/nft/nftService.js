import nftClient from "./nftServiceClient.js"; // gRPC Client của Project 2
import {uploadFileToIPFS,uploadJSONToIPFS} from "../ipfsService.js"; // Service của Project 1
import { Artist } from "../../model/entity/index.js"; // Model của Project 1
import subService from "../subscriptionService.js"; // Service của Project 1
import { ethers } from "ethers";
import factoryAbi from "../../abi/TicketFactory.json" with { type: "json" };
import { badRequest, notFound } from "../../middleware/errorHandler.js";

const RPC_URL = process.env.NFT_URL;
const CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS;
const PRIVATE_KEY = process.env.NFT_PRIVATE_KEY;

if (!PRIVATE_KEY || !CONTRACT_ADDRESS || !RPC_URL) {
    badRequest("NFT configuration is missing");
    process.exit(1);
}
const provider=new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, factoryAbi.abi, wallet);




// API: POST /api/tickets/create
const createTicket = async ({
  coverFile,
  userId,
  title,
  date,
  location,
  price,
  maxSupply,
  saleDeadline,
}) => {
  const artist = await Artist.findOne({ where: { userId } });
  if (!artist) return notFound("Artist");
  const isActive = await subService.checkSubscription({ userId,type:"ARTIST" });
  if (!isActive)
    badRequest("Your artist subscription expired");

  if (!coverFile) {
    badRequest("File cannot empty")
  }
  // 2. Xử lý IPFS (Project 1 làm)
  const imageCID =  await uploadFileToIPFS(
    coverFile.buffer,
    coverFile.originalname
  );
  const imageURI = `ipfs://${imageCID}`;
  const metadata = { name: title, description: `...`, image: imageURI };
  const metadataCID = await uploadJSONToIPFS(metadata);
  const baseURI = `ipfs://${metadataCID}`;

  const saleDeadlineDate = new Date(saleDeadline);
if (isNaN(saleDeadlineDate.getTime())) {
  throw badRequest("saleDeadline invalid format, must be ISO string or valid Date");
}

  // 3. GỌI gRPC ĐẾN PROJECT 2
const grpcRequest = {
  artistId: artist.id,
  contract_address: process.env.NFT_CONTRACT_ADDRESS,
  title,
  price,
  maxSupply: parseInt(maxSupply),
  saleDeadline: Math.floor(new Date(saleDeadline).getTime() / 1000),
  baseUri: baseURI,
  coverImage: imageURI,
  date,
  location,
};


const grpcResponse = await new Promise((resolve, reject) => {
    nftClient.CreateTicket(grpcRequest, (err, res) =>
      err ? reject(err) : resolve(res)
    );
  });
  return {
    message: "Step 1 OK. Please sign transaction.",
    eventId: grpcResponse.event_id, // _id từ MongoDB
    contractAddress: process.env.NFT_CONTRACT_ADDRESS,
    price: price,
    maxSupply: maxSupply,
    saleDeadline: saleDeadline,
    baseURI: baseURI,
  };
};

const logPurchase = async ({ userId, eventId, tokenId, txHash }) => {
    const grpcRequest = {
      user_id: userId,
      event_id: eventId,
      token_id: tokenId,
      tx_hash: txHash,
    };
    const grpcResponse = await new Promise((resolve, reject) => {
      nftClient.LogPurchase(grpcRequest, (err, res) =>
        err ? reject(err) : resolve(res)
      );
    });
    return grpcResponse;
};

const setFee = async (newFee) => {
  if (
    newFee === undefined ||
    typeof newFee !== "number" ||
    newFee < 0 ||
    newFee > 100
  ) {
    badRequest("Invalid fee percentage (must be 0-100)");
  }
  const tx = await contract.setPlatformFee(newFee);
  await tx.wait();
};

const setWaller = async (newWallet) => {
  if (!ethers.utils.isAddress(newWallet)) {
    badRequest("Invalid wallet address");
  }
  const tx = await factoryContract.setPlatformWallet(newWallet);
  await tx.wait();
};

const getTickets = async ({ page, limit }) => {
  const grpcRequest = {
    page: page,
    limit: limit
  };
  
  const grpcResponse = await new Promise((resolve, reject) => {
    nftClient.GetActiveTickets(grpcRequest, (err, res) =>
      err ? reject(err) : resolve(res)
    );
  });
    console.log("🚀 ~ getTickets ~ grpcResponse:", grpcResponse)
  
  return grpcResponse; 
};


export { createTicket, logPurchase, setFee, setWaller,getTickets };
