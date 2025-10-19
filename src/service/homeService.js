import { Artist, Album, Playlist, Song } from "../model/entity/index.js";
import sequelize from "sequelize";
import { getUrlCloudinary } from "../util/cloudinary.js";

const home = async (req, res) => {
  const [artistsP, albumsP] = await Promise.all([
    // 🔹 Lấy top 6 artist có nhiều follower nhất
    Artist.findAll({
      limit: 6,
      attributes: [
        "id",
        "stageName",
        "avatarUrl",
        "verified",
        [
          sequelize.literal(`
              (
                SELECT COUNT(*) 
                FROM "Follower" fs
                WHERE fs."ArtistId" = "Artist"."id"
              )
            `),
          "followerCount",
        ],
      ],
      order: [
        [
          sequelize.literal(`
              (
                SELECT COUNT(*) 
                FROM "Follower" fs
                WHERE fs."ArtistId" = "Artist"."id"
              )
            `),
          "DESC",
        ],
      ],
    }),

    // 🔹 Lấy 8 album mới nhất
    Album.findAll({
      limit: 8,
      order: [["createdAt", "DESC"]],
      include: { model: Artist, as: "artist", attributes: ["stageName"] },
      attributes: ["id", "title", "coverUrl"],
    }),

    // 🔹 Lấy 9 playlist mới nhất
  ]);

  // Chuyển ảnh Cloudinary
  const artists = await Promise.all(
    artistsP.map(async (artist) => {
      if (!artist) return null;
      const json = artist.toJSON();
      return {
        ...json,
        avatarUrl: json.avatarUrl
          ? await getUrlCloudinary(json.avatarUrl)
          : null,
      };
    })
  );

  const albums = await Promise.all(
    albumsP.map(async (album) => {
      if (!album) return null;
      const json = album.toJSON();
      return {
        ...json,
        coverUrl: json.coverUrl ? await getUrlCloudinary(json.coverUrl) : null,
      };
    })
  );

  // ✅ Gửi về client
  return {
    artists: artists.filter(Boolean),
    albums: albums.filter(Boolean),
  };
};

export default { home };
