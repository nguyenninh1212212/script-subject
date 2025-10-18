import { where } from "sequelize";
import { Album, Artist, Song } from "../model/entity/index.js";
import {
  badRequest,
  notFound,
  alreadyExist,
} from "../middleware/errorHandler.js";
import { uploadFromBuffer } from "../util/cloudinary.js";
import { getPagination, getPagingData } from "../util/pagination.js";

const createAlbum = async ({ title, userId, coverFile }) => {
  const artist = await Artist.findOne({
    where: { userId: userId },
  });
  if (!artist) notFound("Artist");

  const existAlbumName = await Album.count({
    where: { artistId: artist.id, title: title },
  });

  if (existAlbumName > 0) alreadyExist("Album title ");
  const coverUrl = coverFile
    ? (await uploadFromBuffer(coverFile.buffer, "albumCovers")).public_id
    : null;
  return await Album.create({
    title,
    artistId: artist.id,
    coverUrl,
  });
};

const getAlbums = async ({ page, size }) => {
  const { limit, offset } = getPagination(page, size);
  const data = await Album.findAndCountAll({
    include: [
      {
        model: Artist,
        as: "artist",
        attributes: ["id", "stageName", "avatarUrl", "verified"],
      },
    ],
    limit,
    offset,
  });
  return getPagingData(data, page, limit);
};

const getAlbum = async ({ id }) => {
  return await Album.findByPk(id, { include: { model: Song, as: "songs" } });
};

const addSongToAlbum = async ({ id, songId, userId }) => {
  console.log("🚀 ~ addSongToAlbum ~ songId:", songId);
  const artist = await Artist.findOne({
    where: { userId: userId },
  });
  if (!artist) notFound("Artist");

  const album = await Album.findOne({
    where: { id: id, artistId: artist.id },
  });
  if (!album) notFound("Album");

  const song = await Song.findOne({
    where: {
      id: songId,
      artistId: artist.id,
    },
  });

  if (!song) notFound("Song");

  const alreadyExists = song.albumId === album.id; // Check the ID
  if (alreadyExists) {
    alreadyExist("This song is already in this album");
  }

  await song.update({ albumId: album.id });

  // Return the updated song
  return song;
};

const deleteAlbum = async ({ id, userId }) => {
  const artist = await Artist.findOne({ where: { userId: userId } });
  const album = await Album.findByPk(id);
  if (artist.id != album.artistId) badRequest("You do not have permission ");
  await album.destroy();
};

const deleteSongAlbum = async ({ id, userId, songId }) => {
  const artist = await Artist.findOne({ where: { userId: userId } });
  const album = await artist.getAlbums(id);
  const song = await Song.findOne({ where: { id: songId } });
  console.log("🚀 ~ deleteSongAlbum ~ song:", song);
  if (song.artistId != artist.id) badRequest("You do not have permission ");
  song.albumId = null;
  await song.save();
};

export default {
  createAlbum,
  getAlbums,
  deleteSongAlbum,
  deleteAlbum,
  getAlbum,
  addSongToAlbum,
};
