import { where } from "sequelize";
import { Album, Artist, Song } from "../model/entity/index.js";
import { badRequest, notFound } from "../middleware/errorHandler.js";
import { uploadFromBuffer } from "../util/cloudinary.js";
import { getPagination, getPagingData } from "../util/pagination.js";

const createAlbum = async ({ title, userId, coverFile }) => {
  const artist = await Artist.findOne({ where: userId });
  if (!artist) notFound("Artist");
  let cover;
  if (coverFile) {
    cover = uploadFromBuffer(coverFile.buffer, "albumCovers");
  } else {
    cover = null;
  }
  return await Album.create({ title, artistId: artist.id, coverUrl: cover });
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

const deleteAlbum = async ({ id, userId }) => {
  const artist = await Artist.findOne({ where: userId });
  const album = await Album.findByPk(id);
  if (artist.id != album.artistId) badRequest("You do not have permission ");
  await album.destroy();
};

const deleteSongAlbum = async ({ id, userId, songId }) => {
  const artist = await Artist.findOne({ where: userId });
  const album = await Album.findByPk(id);
  const song = await Song.findByPk(songId);
  if (artist.id != album.artistId || song.artistId != artist.id)
    badRequest("You do not have permission ");
  song.albumId = null;
  await song.save();
};

export default {
  createAlbum,
  getAlbums,
  deleteSongAlbum,
  deleteAlbum,
  getAlbum,
};
