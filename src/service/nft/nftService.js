import nftClient from "./nftServiceClient.js"; // gRPC Client của Project 2

import { Artist, User } from "../../model/entity/index.js"; // Model của Project 1
import subService from "../subscriptionService.js"; // Service của Project 1
import { ethers } from "ethers";
import factoryAbi from "../../abi/TicketFactory.json" with { type: "json" };
import { alreadyExist, badRequest, notFound, unauthorized } from "../../middleware/errorHandler.js";

import dotenv from "dotenv";
dotenv.config()


// --- 1. KHỞI TẠO ETHERS (Đã có) ---
const RPC_URL = process.env.NFT_URL;
const CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS; // Đây là địa chỉ TicketFactory
const PRIVATE_KEY = process.env.NFT_PRIVATE_KEY; // Đây là Private Key của Admin/Platform
// 3️⃣ Khởi tạo factory contract với wallet

if (!PRIVATE_KEY || !CONTRACT_ADDRESS || !RPC_URL) {
  badRequest("NFT configuration is missing");
  // (Lưu ý: throw error sẽ tốt hơn là gọi process.exit(1) ở đây)
  throw new Error("Missing NFT Ethers configuration in .env");
}
const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);
const factoryContract = new ethers.Contract(CONTRACT_ADDRESS, factoryAbi.abi, signer);

console.log(`✅ [P1 Service] Đã kết nối Ethers với Factory: ${CONTRACT_ADDRESS}`);

// --- 2. HÀM TẠO CONTRACT CHO ARTIST (ĐÃ THÊM VÀO) ---

/**
 * Gọi Smart Contract 'TicketFactory' để tạo (deploy) một contract 'EventTicket' mới.
 * @param {string} artistWalletAddress - Địa chỉ ví MetaMask (EOA) của nghệ sĩ
 * @returns {Promise<string>} - Địa chỉ contract mới (0x...)
 */


// --- 3. HÀM TẠO VÉ (ĐÃ SỬA LỖI) ---
const createTicket = async ({
  baseUrl,
  contractAddress,
  userId,
  date,
  saleDeadline,
  price,
  location,
  title,
  maxSupply,
  coverImage
}) => {
  const artist = await Artist.findOne({
    where: { userId },
    include: { model: User, as: "owner", attributes: ["walletAddress"] },
  });

  if (!artist) return notFound("Artist");
  const isActive = await subService.checkSubscription({ userId, type: "ARTIST" });
  if (!isActive) badRequest("Your artist subscription expired");

  const grpcRequest = {
    artistId: artist.id,
    contractAddress: contractAddress,
    baseUri: baseUrl,
    saleDeadline: saleDeadline,
    date: date,
    location: location,
    price: price,
    title: title,
    maxSupply: maxSupply,
    coverImage: coverImage
  };

  const grpcResponse = await new Promise((resolve, reject) => {
    nftClient.CreateTicket(grpcRequest, (err, res) =>
      err ? reject(err) : resolve(res)
    );
  });

  return {
    message: "Step 1 OK. Please sign transaction.",
    event_id: grpcResponse.event_id, // _id từ MongoDB
    contractAddress: artist.contractAddress, // <-- ĐÃ SỬA
    baseURI: baseUrl,
    saleDeadline: saleDeadline,
    price: price,
    location: location,
    title: title,
    maxSupply: maxSupply,
  }
};

// --- 4. CÁC HÀM CÒN LẠI (ĐÃ SỬA LỖI) ---
const logPurchase = async ({ userId, eventId, tokenId, txHash }) => {
  const existUser = await User.count({ where: { id: userId } });
  if (existUser == 0) unauthorized();
  const grpcRequest = {
    userId: userId,
    eventId: eventId,
    tokenId: tokenId,
    tx_hash: txHash,
  };
  console.log("🚀 ~ logPurchase ~ grpcRequest:", grpcRequest)
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
  // Dùng 'factoryContract' đã khởi tạo
  const tx = await factoryContract.setPlatformFee(newFee);
  await tx.wait();
  return { message: "Fee updated", newFee: newFee };
};

// SỬA LỖI CHÍNH TẢ: setWaller -> setWallet
const setWallet = async (newWallet) => {
  if (!ethers.isAddress(newWallet)) {
    badRequest("Invalid wallet address");
  }
  const tx = await factoryContract.setPlatformWallet(newWallet);
  await tx.wait();
  return { message: "Wallet updated", newWallet: newWallet };
};

const getTickets = async ({ page, limit }) => {
  const grpcRequest = { page, limit };

  // 1️⃣ Lấy ticket từ gRPC
  const grpcResponse = await new Promise((resolve, reject) => {
    nftClient.GetActiveTickets(grpcRequest, (err, res) =>
      err ? reject(err) : resolve(res)
    );
  });

  // 2️⃣ Lấy danh sách artistId duy nhất
  const artistIds = [...new Set(grpcResponse.tickets.map(t => t.artistId))];
  const artists = await Artist.findAll({
    where: { id: artistIds },
    attributes: ["id", "stageName"],
  });
  const artistMap = {};
  artists.forEach(a => {
    artistMap[a.id] = a.stageName;
  });

  // 3️⃣ Fetch metadata từ IPFS cho mỗi ticket
  const ticketsWithMetadata = await Promise.all(
    grpcResponse.tickets.map(async (ticket) => {
      return {
        ...ticket,
        stageName: artistMap[ticket.artistId] || null,
      };
    })
  );

  return {
    ...grpcResponse,
    tickets: ticketsWithMetadata,
  };
};
const getMyTickets = async ({ page, limit, userId }) => {
  const grpcRequest = { page, limit, userId };

  // 1️⃣ Lấy ticket từ gRPC
  const grpcResponse = await new Promise((resolve, reject) => {
    nftClient.GetUserTickets(grpcRequest, (err, res) =>
      err ? reject(err) : resolve(res)
    );
  });

  // 2️⃣ Lấy danh sách artistId duy nhất
  const artistIds = [...new Set(grpcResponse.tickets.map(t => t.artistId))];
  const artists = await Artist.findAll({
    where: { id: artistIds },
    attributes: ["id", "stageName"],
  });
  const artistMap = {};
  artists.forEach(a => {
    artistMap[a.id] = a.stageName;
  });

  // 3️⃣ Fetch metadata từ IPFS cho mỗi ticket
  const ticketsWithMetadata = await Promise.all(
    grpcResponse.tickets.map(async (ticket) => {
      return {
        ...ticket,
        stageName: artistMap[ticket.artistId] || null,
      };
    })
  );

  return {
    ...grpcResponse,
    tickets: ticketsWithMetadata,
  };
};

const listResellTicket = async ({ userTicketId, sellerId, price }) => {
  if (!userTicketId || !sellerId || !price) badRequest("Missing params");

  const grpcRequest = { userTicketId, sellerId, price };
  const grpcResponse = await new Promise((resolve, reject) => {
    nftClient.CreateResellTicket(grpcRequest, (err, res) =>
      err ? reject(err) : resolve(res)
    );
  });

  return {
    message: "Ticket listed for resale",
    resellTicketId: grpcResponse.resellTicketId,
    status: grpcResponse.status,
  };
};
const getResellTickets = async ({ page = 1, limit = 10 }) => {
  const grpcRequest = { page, limit };

  const grpcResponse = await new Promise((resolve, reject) => {
    nftClient.GetResellTickets(grpcRequest, (err, res) =>
      err ? reject(err) : resolve(res)
    );
  });

  // map thêm thông tin artist nếu muốn
  const artistIds = [...new Set(grpcResponse.tickets.map(t => t.event.artistId))];
  const artists = await Artist.findAll({
    where: { id: artistIds },
    attributes: ["id", "stageName"],
  });
  const artistMap = {};
  artists.forEach(a => artistMap[a.id] = a.stageName);

  const ticketsWithArtist = grpcResponse.tickets.map(t => ({
    ...t,
    stageName: artistMap[t.event.artistId] || null,
  }));

  return { ...grpcResponse, tickets: ticketsWithArtist };
};
const buyResellTicket = async ({ resellTicketId, buyerId }) => {
  if (!resellTicketId || !buyerId) badRequest("Missing params");

  const grpcRequest = { resellTicketId, buyerId };
  const grpcResponse = await new Promise((resolve, reject) => {
    nftClient.BuyResellTicket(grpcRequest, (err, res) =>
      err ? reject(err) : resolve(res)
    );
  });


  return {
    message: "Ticket purchased from resale",
    resellTicketId: grpcResponse.resellTicketId,
    oldOwnerId: grpcResponse.oldOwnerId,
    newOwnerId: grpcResponse.newOwnerId,
    price: grpcResponse.price,
  };
};


const updateTicketStatusClient = async ({ eventId, status ,userId}) => {
  const artist = await Artist.findOne({where :{userId :userId},attributes :["id"]});
  if (!artist) notFound("Artist")
  return new Promise((resolve, reject) => {
    nftClient.UpdateTicketStatus({ eventId, status,artistId:artist.id }, (err, res) => {
      if (err) return reject(err);
      resolve(res); // { eventId, oldStatus, newStatus }
    });
  });
}

// ==============================
// Client gọi UpdateResellTickets
// ==============================
const updateResellTicketClient = async ({ sellerId,  resellId }) => {
  return new Promise((resolve, reject) => {
    nftClient.UpdateResellTickets({ sellerId,  resellId }, (err, res) => {
      if (err) return reject(err);
      resolve(res); // { message: "SUCCESS" }
    });
  });
}

const getArtistTicket = async ({userId,page,limit}) => {

  const artist = await Artist.findOne({where :{userId :userId},attributes :["id"]});
  if (!artist) notFound("Artist")
  const artistId = artist.id;
  const grpcRequest = { artistId:artistId,page:page,limit:limit };
  const grpcResponse = await new Promise((resolve, reject) => {
    nftClient.GetArtistTickets(grpcRequest, (err, res) =>
      err ? reject(err) : resolve(res)
    );
  });
  return grpcResponse;
}



export {
  createTicket,
  logPurchase,
  setFee,
  setWallet, 
  getTickets,
  getMyTickets,
  listResellTicket,
  getResellTickets, buyResellTicket, updateTicketStatusClient, updateResellTicketClient,getArtistTicket
};