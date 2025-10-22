import { where } from "sequelize";
import { Album, Artist, Song, User } from "../model/entity/index.js";
import {
  badRequest,
  notFound,
  alreadyExist,
} from "../middleware/errorHandler.js";
import { uploadFromBuffer } from "../util/cloudinary.js";
import { getPagination, getPagingData } from "../util/pagination.js";
import { getUrlCloudinary } from "../util/cloudinary.js";
import { transformPropertyInList } from "../util/help.js";

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
        attributes: ["id", "stageName"],
      },
    ],
    attributes: ["coverUrl", "createdAt", "id", "title"],
    limit,
    offset,
    raw: true,
  });

  const album = await transformPropertyInList(
    data.rows,
    ["coverUrl"],
    getUrlCloudinary
  );

  return getPagingData(
    {
      count: data.count, // Giữ lại tổng số lượng gốc
      rows: album.filter(Boolean), // Sử dụng mảng đã biến đổi
    },
    page,
    limit
  );
};

const getAlbum = async ({ id }) => {
  const data = await Album.findByPk(id, {
    include: { model: Song, as: "songs" },
  });

  const album = data.toJSON();
  album.coverUrl = data.coverUrl ? await getUrlCloudinary(data.coverUrl) : null;
  return album;
};

const addSongToAlbum = async ({ id, songId, userId }) => {
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
};

const deleteAlbum = async ({ id, userId }) => {
  const artist = await Artist.findOne({ where: { userId: userId } });
  const album = await Album.findByPk(id);
  if (artist.id != album.artistId) badRequest("You do not have permission ");
  await album.destroy();
};

const deleteSongAlbum = async ({ userId, songId }) => {
  const artist = await Artist.findOne({ where: { userId: userId } });
  const song = await Song.findOne({ where: { id: songId } });
  if (song.artistId != artist.id) badRequest("You do not have permission ");
  song.albumId = null;
  await song.save();
};

const addFavoriteAlbum = async ({ userId, id }) => {
  const [user, album] = await Promise.all([
    await User.findByPk(userId),
    await Album.findByPk(id),
  ]);

  if (!user) notFound("User not exist");
  if (!album) notFound("Album not exist");

  await user.addFavoriteAlbums(album);
};
const removeFavoriteAlbum = async ({ userId, id }) => {
  const [user, album] = await Promise.all([
    await User.findByPk(userId),
    await Album.findByPk(id),
  ]);
  if (!user) notFound("User not exist");
  if (!album) notFound("Album not exist");

  await user.removeFavoriteAlbums(album);
};
const getFavoriteAlbum = async ({ userId }) => {
  const user = await User.findByPk(userId);
  if (!user) notFound("User not exist");
  const data = user.getFavoriteAlbums();
  const dataJson = data.toJSON();
  if (data.coverUrl) {
    dataJson.coverUrl = await getUrlCloudinary(dataJson.coverUrl);
  }

  return dataJson;
};

export default {
  createAlbum,
  getAlbums,
  deleteSongAlbum,
  deleteAlbum,
  getAlbum,
  addSongToAlbum,
  addFavoriteAlbum,
  removeFavoriteAlbum,
  getFavoriteAlbum,
};
