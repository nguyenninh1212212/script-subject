import { Artist, Album } from "../model/entity/index.js";
import sequelize from "sequelize";
import { getUrlCloudinary } from "../util/cloudinary.js";
import { transformPropertyInList } from "../util/help.js";

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
      raw: true, // ⚡ thêm dòng này để lấy plain object
    }),

    // 🔹 Lấy 8 album mới nhất
    Album.findAll({
      limit: 8,
      order: [["createdAt", "DESC"]],
      include: {
        model: Artist,
        as: "artist",
        attributes: ["stageName"],
      },
      attributes: ["id", "title", "coverUrl"],
      raw: true, // ⚡ trả plain object
      nest: true, // ⚡ gộp include thành object lồng nhau
    }),
  ]);

  const [artists, albums] = await Promise.all([
    transformPropertyInList(artistsP, ["avatarUrl"], getUrlCloudinary),
    transformPropertyInList(albumsP, ["coverUrl"], getUrlCloudinary),
  ]);

  return {
    artists: artists.filter(Boolean),
    albums: albums.filter(Boolean),
  };
};

export default { home };
