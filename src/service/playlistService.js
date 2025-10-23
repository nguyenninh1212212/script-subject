import { Playlist, Song, User } from "../model/entity/index.js";
import {
  notFound,
  badRequest,
  alreadyExist,
} from "../middleware/errorHandler.js";
import { where, Op } from "sequelize";
import { transformPropertyInList } from "../util/help.js";
import { getUrlCloudinary } from "../util/cloudinary.js";
import sequelize from "sequelize";
const createPlaylist = async ({ name, userId }) => {
  return await Playlist.create({ name, userId });
};

const addSongToPlaylist = async (playlistId, songId) => {
  const playlist = await Playlist.findByPk(playlistId);
  if (!playlist) throw notFound("Playlist not found");
  const song = await Song.findByPk(songId);
  if (!song) throw notFound("Song not found");
  const exist = await playlist.hasSong(song);
  if (exist) throw alreadyExist("Song");
  await playlist.addSong(song);
  return playlist;
};

const getPlaylistsByUser = async (userId) => {
  // Lấy tất cả playlist của user
  const playlists = await Playlist.findAll({
    where: { userId },
    attributes: ["id", "name", "description"],

    // Include bài hát qua subquery giới hạn 4 bài
    include: [
      {
        model: Song,
        as: "songs",
        attributes: ["id", "coverImage"],
        through: { attributes: [] }, // không lấy dữ liệu từ bảng trung gian
        required: false,
        // Custom join để chỉ lấy 4 bài mỗi playlist
        on: {
          "$songs.id$": {
            [Op.in]: sequelize.literal(`(
              SELECT s.id FROM "Songs" s
              JOIN "PlaylistSong" ps ON ps."songId" = s."id"
              WHERE ps."playlistId" = "Playlist"."id"
              ORDER BY s."createdAt" DESC
              LIMIT 4
            )`),
          },
        },
      },
    ],
  });

  // Xử lý coverImage qua Cloudinary
  const result = await Promise.all(
    playlists.map(async (pl) => {
      const plJson = pl.toJSON();
      const transformedSongs = await transformPropertyInList(
        plJson.songs || [],
        ["coverImage"],
        getUrlCloudinary
      );
      return { ...plJson, songs: transformedSongs };
    })
  );

  return result;
};

const getPlaylistById = async (id) => {
  const playlist = await Playlist.findByPk(id, {
    include: [
      {
        model: Song,
        as: "songs",
        attributes: ["id", "title", "song", "coverImage", "isVipOnly"],
      },
    ],
  });

  if (!playlist) return null;

  const plJson = playlist.toJSON();

  const transformedSongs = await transformPropertyInList(
    plJson.songs || [],
    ["song", "coverImage"],
    getUrlCloudinary
  );

  return {
    ...plJson,
    songs: transformedSongs,
  };
};

const removeSongFromPlaylist = async ({ playlistId, songId }) => {
  const playlist = await Playlist.findByPk(playlistId);
  if (!playlist) notFound("Playlist");
  const song = await Song.findByPk(songId);
  if (!song) notFound("Song");
  await playlist.removeSongs(song);
};

const removeBatchSongFromPlaylist = async (playlistId, songIds) => {
  if (!songIds?.length) badRequest("No song  provided");

  const playlist = await Playlist.findByPk(playlistId);
  if (!playlist) throw notFound("Playlist not found");

  const songsInPlaylist = await playlist.getSongs({ where: { id: songIds } });
  if (!songsInPlaylist.length) throw notFound("No matching songs in playlist");

  await playlist.removeSongs(songsInPlaylist);

  return await playlist.getSongs();
};

const deletePlaylist = async ({ userId, id }) => {
  const playlist = await Playlist.findOne({
    where: { id },
    include: {
      model: User,
      as: "user",
      where: { id: userId },
    },
  });
  if (playlist) {
    await playlist.destroy();
  } else {
    throw notFound("Playlist not found");
  }
};

export default {
  createPlaylist,
  addSongToPlaylist,
  getPlaylistsByUser,
  deletePlaylist,
  removeSongFromPlaylist,
  removeBatchSongFromPlaylist,
  getPlaylistById,
};
