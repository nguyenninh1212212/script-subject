import { Playlist, Song, User } from "../model/entity/index.js";
import {
  notFound,
  badRequest,
  alreadyExist,
} from "../middleware/errorHandler.js";

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
  return await Playlist.findAll({
    where: { userId },
  });
};

const getPlaylistById = async (id) => {
  return await Playlist.findByPk(id, {
    include: [
      {
        model: Song,
        as: "songs",
        attribute: [
          "id",
          "title",
          "song",
          "coverImage",
          "isVipOnly",
          "albumId",
        ],
      },
    ],
  });
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
