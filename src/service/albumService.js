import { Album, Artist, Song } from "../model/entity/index.js";

async function createAlbum({ title, artistId }) {
  return await Album.create({ title, artistId });
}

async function getAlbums() {
  return await Album.findAll({ include: [Artist, "songs"] });
}

export default { createAlbum, getAlbums };
