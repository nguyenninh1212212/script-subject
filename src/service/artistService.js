import { where } from "sequelize";
import { Artist, Album, Song, Subscription } from "../model/entity/index.js";
import { alreadyExist } from "../middleware/errorHandler.js";

async function createArtist({
  userId,
  stageName = "Anonymous",
  bio = "",
  avatarUrl = "",
}) {
  const exist = Artist.findOne({
    where: { userId },
  });

  if (exist) {
    alreadyExist("Artist");
  }
  return await Artist.create({ userId, stageName, bio, avatarUrl });
}

async function getArtists() {
  return await Artist.findAll({ include: ["albums", "songs"] });
}

async function getArtistById(id) {
  return await Artist.findByPk(id, { include: ["albums", "songs"] });
}

async function getArtistByUserId(userId) {
  return await Artist.findOne({
    where: { userId },
  });
}

export default { createArtist, getArtists, getArtistById, getArtistByUserId };
