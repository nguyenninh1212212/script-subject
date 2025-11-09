import { ethers } from "ethers";
import factoryAbi from "../abi/TicketFactory.json" with { type: "json" };
import { badRequest } from "../middleware/errorHandler.js";
import {NFTTicket,UserNFT,Artist} from "../model/entity/index.js"

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
const contract = new ethers.Contract(CONTRACT_ADDRESS, factoryAbi.abi, wallet);


const mintTicketNFT = async ({userAddress}) => {
    if(!ethers.utils.isAddress(userAddress)) {
        badRequest("Invalid user address");
    }
    const tokenURI = `https://api.example.com/metadata/${Date.now()}.json`;
    const tx = await contract.mintTicket(userAddress, tokenURI);     
    await tx.wait();

    return tx.hash;
}

const setFee= async (newFee) => {
    if (newFee === undefined || typeof newFee !== 'number' || newFee < 0 || newFee > 100) {
        badRequest("Invalid fee percentage (must be 0-100)");}
    const tx = await contract.setPlatformFee(newFee);
    await tx.wait();
}

const setWaller=async (newWallet) => {
    if(!ethers.utils.isAddress(newWallet)) {
        badRequest("Invalid wallet address");
    }
    const tx = await factoryContract.setPlatformWallet(newWallet);
    await tx.wait();
}

const createticket= async ({ coverFile, title, date, location,userId}) => {
    const artist = await Artist.findOne({
        where: { userId },
        arttibutes: ["id"],
    });

  if (!artist) notFound("Artist profile not found");

  const Active = await subscriptionService.checkSubscription({
    userId,
    type: "ARTIST",
  });
  if (!Active) badRequest("You need renew or subcribe artist plan");
  const [coverUpload] = await Promise.all([
    uploadFromBuffer(coverFile.buffer, "coverImage"),
  ]);

    return await NFTTicket.create({
        artistId: artist.id,
        coverImage: coverUpload.public_id,
        title,
        date,
        location,
    })
}

const getTicketsByUser= async (userId) => {
    const ticket = await UserNFT.findAll({
        where: { userId },
        attributes: ["id", "tokenId", "tokenURI"],
    });
    return ticket;
}

const getTicketsByArtist= async (userId) => {
      const artist = await Artist.findOne({
        where: { userId },
        arttibutes: ["id"],
    });

  if (!artist) notFound("Artist profile not found");
    const ticket = await NFTTicket.findAll({
        where: { artistId :artist.id},})
    return ticket;
    }

export default { mintTicketNFT ,setFee,setWaller,createticket,getTicketsByUser,getTicketsByArtist};
