import { Song, Album, Artist, User } from "../model/entity/index.js";
import { notFound, badRequest } from "../middleware/errorHandler.js";
import subscriptionService from "../service/subscriptionService.js";
import subscriptionType from "../enum/subscriptionType.js";
import adsService from "./adsService.js";
import { uploadFromBuffer, deleteFromCloudinary } from "../util/cloudinary.js";
import { getPagination, getPagingData } from "../util/pagination.js";
import { Op } from "sequelize";

const createSong = async ({ title, userId, songFile, coverFile, duration }) => {
  const artistId = await Artist.findOne({
    where: { userId },
    arttibutes: ["id"],
  });
  if (!artistId) notFound("Artist profile not found");

  const [songUpload, coverUpload] = await Promise.all([
    uploadFromBuffer(songFile.buffer, "songs"),
    uploadFromBuffer(coverFile.buffer, "coverImages"),
  ]);

  return await Song.create({
    title,
    artistId: artistId.id,
    duration,
    song: songUpload.public_id,
    coverImage: coverUpload.public_id,
  });
};

const getSongs = async ({ page, size }) => {
  const { limit, offset } = getPagination(page, size);

  const data = await Song.findAndCountAll({
    attributes: ["id", "title", "isVipOnly", "coverImage"],
    include: [
      {
        model: Artist,
        as: "artist",
        attributes: ["id", "stageName", "avatarUrl"],
      },
    ],
    limit,
    offset,
  });
  return getPagingData(data, page, limit);
};

const getSong = async ({ userId, id }) => {
  const song = await Song.findByPk(id.id, {
    include: [
      {
        model: Album,
        as: "album",
        attributes: ["id", "title", "coverUrl"],
      },
      {
        model: Artist,
        as: "artist",
        attributes: ["id", "stageName", "avatarUrl"],
      },
    ],
    attributes: ["id", "title", "song", "coverImage", "isVipOnly", "createdAt"],
  });
  if (!song) {
    return null;
  }

  const isSubscription = await subscriptionService.checkSubscription({
    userId,
    type: subscriptionType.USER,
  });

  if (isSubscription) {
    return { song: song, ads: null };
  }

  const ads = await adsService.getRandomAd();

  if (ads && ads.type === "AUDIO") {
    return { song, ads };
  }

  return { song, ads: null };
};

const removeSong = async ({ userId, songId }) => {
  const song = await Song.findOne({
    where: { id: songId },
    include: [{ model: Artist, as: "artist", attributes: ["userId"] }],
  });

  if (!song) notFound("Song not found");
  if (song.artist.userId !== userId)
    badRequest("You are not the owner of this song");

  await song.destroy();
};

const deleteSong = async (songId) => {
  await Song.destroy({
    where: { id: songId },
  });
};
const restoreSong = async ({ userId, id }) => {
  const artist = await Artist.findOne({
    where: { userId: userId },
    attributes: ["id"],
  });
  if (!artist) {
    notFound("Artist");
  }
  const [numberOfAffectedRows] = await Song.update(
    { deletedAt: null },
    {
      where: {
        id: id,
        deletedAt: { [Op.not]: null },
      },
      include: {
        model: Artist,
        as: "artist",
        where: { artistId: artist.id },
      },
      paranoid: false,
    }
  );

  if (numberOfAffectedRows > 0) {
    console.log("Đã khôi phục bài hát thành công!");
  } else {
    notFound("Song");
  }
};

const updateSong = async ({ id, userId, data, coverFile }) => {
  const song = await Song.findByPk(id);
  if (!song) {
    notFound("Song not found");
  }
  const artist = await Artist.findOne({ where: { userId } });
  if (!artist || song.artistId !== artist.id) {
    unauthorized("You do not have permission to update this song.");
  }

  if (coverFile) {
    const oldCover = song.coverImage;
    const newCover = await uploadFromBuffer(coverFile.buffer, "coverImages");
    data.coverUrl = newCover;
    if (oldCover) {
      await deleteFromCloudinary(oldCover);
    }
  }
  await song.update(data);

  return song;
};
const addToFavoutite = async ({ userId, songId }) => {
  const user = User.findByPk(userId);
  const song = Song.findByPk(songId);
  if (!user) badRequest("User not existing");
  if (!song) badRequest("Song not exist");
  await user.addFavoriteSong(song);
};

const getFavourite = async ({ userId }, page, size) => {
  const user = await User.findByPk(userId);
  if (!user) badRequest("User not existing");
  const { limit, offset } = getPagination(page, size);
  const songs = await user.getFavoriteSongs({
    limit: limit,
    offset: offset,
    order: [["createdAt", "ASC"]],
  });

  return getPagingData(songs, page, size);
};
const deleteFavourite = async ({ id, userId }) => {
  const user = User.findByPk(userId);
  const song = Song.findByPk(id);
  if (!user) badRequest("User not existing");
  if (!song) badRequest("Song not exist");
  await user.removeFavoriteSong(song);
};

export default {
  createSong,
  getSongs,
  removeSong,
  deleteSong,
  getSong,
  restoreSong,
  updateSong,
  addToFavoutite,
  getFavourite,
  deleteFavourite,
};
