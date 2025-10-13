import { Playlist, Song, User } from "../model/entity/index.js";
import { notFound, badRequest } from "../middleware/errorHandler.js";

async function createPlaylist({ name, userId }) {
  return await Playlist.create({ name, userId });
}

async function addSongToPlaylist(playlistId, songId) {
  const playlist = await Playlist.findByPk(playlistId);
  if (!playlist) throw notFound("Playlist not found");
  const song = await Song.findByPk(songId);
  if (!song) throw notFound("Song not found");

  await playlist.addSong(song);
  return playlist;
}

async function getPlaylistsByUser(userId) {
  return await Playlist.findAll({
    where: { userId },
  });
}

async function getPlaylistById(id) {
  return await Playlist.findByPk(id, { include: [Song] });
}

async function removeSongFromPlaylist(playlistId, songId) {
  const playlist = await Playlist.findByPk(playlistId, {
    include: { model: Song, as: "song" },
  });
  const song = await Song.findByPk(songId);
  await playlist.removeSong(song);
  return playlist;
}

async function removeBatchSongFromPlaylist(playlistId, songIds) {
  if (!songIds?.length) badRequest("No song  provided");

  const playlist = await Playlist.findByPk(playlistId);
  if (!playlist) throw notFound("Playlist not found");

  const songsInPlaylist = await playlist.getSongs({ where: { id: songIds } });
  if (!songsInPlaylist.length) throw notFound("No matching songs in playlist");

  await playlist.removeSongs(songsInPlaylist);

  return await playlist.getSongs();
}

async function deletePlaylist({ userId, id }) {
  const playlist = await Playlist.findOne({
    where: id,
    include: {
      model: User,
      as: "user",
      where: { id: userId },
    },
  });
  if (playlist) {
    await playlist.destroy();
  } else {
    notFound("Playlist not found");
  }
}

export default {
  createPlaylist,
  addSongToPlaylist,
  getPlaylistsByUser,
  deletePlaylist,
  removeSongFromPlaylist,
  removeBatchSongFromPlaylist,
  getPlaylistById,
};
