import { Playlist, Song, User } from "../model/entity/index.js";
import {
  notFound,
  badRequest,
  alreadyExist,
} from "../middleware/errorHandler.js";
import { where } from "sequelize";
import { transformPropertyInList } from "../util/help.js";
import { getUrlCloudinary } from "../util/cloudinary.js";

const createPlaylist = async ({ name, userId }) => {
  return await Playlist.create({ name, userId });
};

const addSongToPlaylist = async (playlistId, songId) => {
  const playlist = await Playlist.findByPk(playlistId);
  if (!playlist) throw notFound("Playlist not found");
  const song = await Song.findByPk(songId);
  if (!song) throw notFound("Song not found");
  const exist = await playlist.getSongs(song);
  if (exist) alreadyExist("Song");
  await playlist.addSongs(song);
  return playlist;
};

const getPlaylistsByUser = async (userId) => {
  const playlists = await Playlist.findAll({
    where: { userId },
    include: {
      model: Song,
      as: "songs",
      attributes: ["id", "coverImage"],
      limit: 4,
    },
    raw: false,
  });

  const plJson = playlists.map((pl) => pl.toJSON());

  const newPlaylists = await Promise.all(
    plJson.map(async (pl) => {
      const transformedSongs = await transformPropertyInList(
        pl.songs || [],
        ["coverImage"],
        getUrlCloudinary
      );

      return {
        ...pl,
        songs: transformedSongs,
      };
    })
  );

  return newPlaylists;
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
