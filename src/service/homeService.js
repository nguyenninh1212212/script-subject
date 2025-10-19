import { Artist, Album, Playlist, Song } from "../model/entity/index.js";

const home = async (req, res) => {
  // Thực thi 4 truy vấn song song để tăng hiệu suất
  const [artists, songs, albums, playlists] = await Promise.all([
    Artist.findAll({
      limit: 6,
      order: [["createdAt", "DESC"]],
      attributes: ["id", "stageName", "avatarUrl", "verified"],
    }),
    Song.findAll({
      limit: 10,
      order: [["createdAt", "DESC"]], // Lấy 10 bài hát mới nhất
      attributes: ["id", "title", "isVipOnly", "coverImage"],
    }),
    Album.findAll({
      limit: 8,
      order: [["createdAt", "DESC"]], // Lấy 8 album mới nhất
    }),
    Playlist.findAll({
      limit: 9,
      order: [["createdAt", "DESC"]], // Lấy 9 playlist mới nhất
    }),
  ]);

  // Gói tất cả dữ liệu vào một object và gửi về
  return (
    res,
    {
      artists,
      songs,
      albums,
      playlists,
    }
  );
};

export default { home };
