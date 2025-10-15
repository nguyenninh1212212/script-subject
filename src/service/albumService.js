import { Album, Artist, Song } from "../model/entity/index.js";

const createAlbum = async ({ title, artistId }) => {
  return await Album.create({ title, artistId });
};

const getAlbums = async () => {
  return await Album.findAll({ include: [Artist, "songs"] });
};

export default { createAlbum, getAlbums };
