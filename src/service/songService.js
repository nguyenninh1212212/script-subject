import { Song, Album, Artist, User } from "../model/entity/index.js";
import {
  notFound,
  badRequest,
  alreadyExist,
} from "../middleware/errorHandler.js";
import subscriptionService from "../service/subscriptionService.js";
import subscriptionType from "../enum/subscriptionType.js";
import adsService from "./adsService.js";
import {
  uploadFromBuffer,
  deleteFromCloudinary,
  getUrlCloudinary,
} from "../util/cloudinary.js";
import { getAudioDurationFromBuffer } from "../util/getAudioDuration.js";
import { getPagination, getPagingData } from "../util/pagination.js";
import { Op } from "sequelize";
import sequelize from "sequelize";
import { MouthlySongView } from "../model/entity/index.js";
import { transformPropertyInList } from "../util/help.js";

// Hàm này dường như bị lỗi và không được dùng, bạn nên xem xét xóa

const createSong = async ({ title, userId, songFile, coverFile }) => {
  const artistId = await Artist.findOne({
    where: { userId },
    arttibutes: ["id"],
  });

  if (!artistId) notFound("Artist profile not found");

  const Active = await subscriptionService.checkSubscription({
    userId,
    type: "ARTIST",
  });

  if (!Active) badRequest("You need renew or subcribe artist plan");

  const [songUpload, coverUpload, duration] = await Promise.all([
    uploadFromBuffer(songFile.buffer, "songs"),
    uploadFromBuffer(coverFile.buffer, "coverImages"),
    getAudioDurationFromBuffer(songFile.buffer, songFile.mimetype),
  ]);

  return await Song.create({
    title,
    artistId: artistId.id,
    duration,
    song: songUpload.public_id,
    coverImage: coverUpload.public_id,
  });
};

// =================================================================
// === ĐÃ CẬP NHẬT HÀM NÀY (getSongs) ===
// =================================================================
const getSongs = async ({ page, size }) => {
  const { limit, offset } = getPagination(page, size);
  const data = await Song.findAndCountAll({
    attributes: ["id", "title", "coverImage", "duration"],
    include: [
      {
        model: Artist,
        as: "artist",
        attributes: ["stageName"],
      },
    ],
    limit,
    offset,
  });
  const songsJSON = data.rows.map((song) => song.toJSON());

  const songs = await transformPropertyInList(
    songsJSON,
    ["song", "coverImage"],
    getUrlCloudinary
  );

  const paginatedData = getPagingData(
    { count: data.count, rows: songs },
    page,
    limit
  );

  return paginatedData;
};

const getSong = async ({ userId, id }) => {
  // 1️⃣ Lấy bài hát hiện tại (bao gồm cả album)
  const song = await Song.findByPk(id.id, {
    include: [
      {
        model: Album,
        as: "album",
        attributes: ["id", "title"], // Đã có thông tin album
      },
      {
        model: Artist,
        as: "artist",
        attributes: ["id", "stageName", "avatarUrl"],
      },
    ],
    attributes: [
      "id",
      "title",
      "song",
      "coverImage",
      "isVipOnly",
      "createdAt",
      [
        sequelize.literal(`EXISTS (
          SELECT 1 
          FROM "FavoriteSong" fs 
          WHERE fs."SongId" = "Song"."id" 
          AND fs."UserId" = ?
        )`),
        "isFavourite",
      ],
    ],
    replacements: [userId || null],
  });

  if (!song) return null;

  // 2️⃣ Kiểm tra subscription
  const isSubscription = await subscriptionService.checkSubscription({
    userId,
    type: subscriptionType.USER,
  });

  // 3️⃣ Tăng view
  await Song.increment("view", { by: 1, where: { id: id.id } });
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [record, created] = await MouthlySongView.findOrCreate({
    where: {
      artistId: song.artist.id,
      year: currentYear,
      month: currentMonth,
    },
    defaults: { view: 1 },
  });
  if (!created) await record.increment("view", { by: 1 });

  // 4️⃣ Convert và lấy URL Cloudinary
  const songJson = song.toJSON();
  await Promise.all([
    (songJson.song = await getUrlCloudinary(songJson.song)),
    (songJson.coverImage = await getUrlCloudinary(songJson.coverImage)),
    songJson.artist.avatarUrl
      ? (songJson.artist.avatarUrl = await getUrlCloudinary(
          songJson.artist.avatarUrl
        ))
      : null,
  ]);

  // 5️⃣ Lấy previous và next song (LOGIC ĐÃ CẬP NHẬT)
  const currentId = songJson.id;
  const albumId = songJson.album ? songJson.album.id : null;

  let previousSong = null;
  let nextSong = null;

  if (albumId) {
    // --- TRƯỜNG HỢP 1: BÀI HÁT CÓ TRONG ALBUM ---
    // Sắp xếp theo ID (hoặc 'createdAt' nếu bạn muốn)

    // Tìm bài trước đó TRONG ALBUM
    previousSong = await Song.findOne({
      where: {
        albumId: albumId,
        id: { [sequelize.Op.lt]: currentId }, // ID nhỏ hơn
      },
      order: [["id", "DESC"]], // Lấy bài gần nhất
      attributes: ["id"],
    });

    // Nếu không có bài trước (đây là bài đầu tiên), LẤY BÀI CUỐI ALBUM (wrap around)
    if (!previousSong) {
      previousSong = await Song.findOne({
        where: {
          albumId: albumId,
          id: { [sequelize.Op.ne]: currentId }, // Đảm bảo không phải chính nó
        },
        order: [["id", "DESC"]], // Lấy bài cuối cùng
        attributes: ["id"],
      });
    }

    // Tìm bài tiếp theo TRONG ALBUM
    nextSong = await Song.findOne({
      where: {
        albumId: albumId,
        id: { [sequelize.Op.gt]: currentId }, // ID lớn hơn
      },
      order: [["id", "ASC"]], // Lấy bài gần nhất
      attributes: ["id"],
    });

    // Nếu không có bài sau (đây là bài cuối cùng), LẤY BÀI ĐẦU ALBUM (wrap around)
    if (!nextSong) {
      nextSong = await Song.findOne({
        where: {
          albumId: albumId,
          id: { [sequelize.Op.ne]: currentId }, // Đảm bảo không phải chính nó
        },
        order: [["id", "ASC"]], // Lấy bài đầu tiên
        attributes: ["id"],
      });
    }
  } else {
    // --- TRƯỜNG HỢP 2: BÀI HÁT KHÔNG CÓ ALBUM (Logic cũ) ---

    // Tìm bài trước (toàn cục)
    previousSong = await Song.findOne({
      where: { id: { [sequelize.Op.lt]: currentId } },
      order: [["id", "DESC"]],
      attributes: ["id"],
    });

    // Fallback logic cũ
    if (!previousSong) {
      previousSong = await Song.findOne({
        where: { id: { [sequelize.Op.ne]: currentId } },
        attributes: ["id"],
      });
    }

    nextSong = await Song.findOne({
      where: { id: { [sequelize.Op.gt]: currentId } },
      order: [["id", "ASC"]],
      attributes: ["id"],
    });

    if (!nextSong) {
      nextSong = await Song.findOne({
        where: { id: { [sequelize.Op.ne]: currentId } },
        attributes: ["id"],
      });
    }
  }

  if (previousSong && previousSong.id === currentId) previousSong = null;
  if (nextSong && nextSong.id === currentId) nextSong = null;

  songJson.previousSongId = previousSong ? previousSong.id : null;
  songJson.nextSongId = nextSong ? nextSong.id : null;

  // 6️⃣ Quảng cáo
  if (isSubscription) {
    songJson.ads = null;
    return songJson;
  }

  const ads = await adsService.getRandomAd();
  if (ads && ads.type === "AUDIO") {
    songJson.ads = ads;
  } else {
    songJson.ads = null;
  }

  return songJson;
};
const removeSong = async ({ userId, songId }) => {
  const song = await Song.findOne({
    where: { id: songId },
    include: [{ model: Artist, as: "artist", attributes: ["userId"] }],
  });

  if (!song) notFound("Song not found");
  if (song.artist.userId !== userId)
    badRequest("You are not the owner of this song");

  await song.destroy();
};

const deleteSong = async (songId) => {
  const song = Song.findByPk(songId);
  await Promise.all([
    await deleteFromCloudinary(song.coverImage),
    await deleteFromCloudinary(song.song),
  ]);
  await Song.destroy({
    where: { id: songId },
  });
};

const restoreSong = async ({ userId, id }) => {
  const artist = await Artist.findOne({
    where: { userId: userId },
    attributes: ["id"],
  });
  if (!artist) {
    notFound("Artist");
  }
  const [numberOfAffectedRows] = await Song.update(
    { deletedAt: null },
    {
      where: {
        id: id,
        deletedAt: { [Op.not]: null },
      },
      include: {
        model: Artist,
        as: "artist",
        where: { artistId: artist.id },
      },
      paranoid: false,
    }
  );

  if (numberOfAffectedRows > 0) {
    console.log("Đã khôi phục bài hát thành công!");
  } else {
    notFound("Song");
  }
};

const updateSong = async ({ id, userId, data, coverFile }) => {
  const song = await Song.findByPk(id);
  if (!song) {
    notFound("Song not found");
  }
  const artist = await Artist.findOne({ where: { userId } });
  if (!artist || song.artistId !== artist.id) {
    unauthorized("You do not have permission to update this song.");
  }

  if (coverFile) {
    const oldCover = song.coverImage;
    const newCover = await uploadFromBuffer(coverFile.buffer, "coverImages");
    data.coverUrl = newCover;
    if (oldCover) {
      await deleteFromCloudinary(oldCover);
    }
  }
  await song.update(data);

  return song;
};
const addToFavoutite = async ({ userId, songId }) => {
  const [user, song] = await Promise.all([
    await User.findByPk(userId),
    await Song.findByPk(songId),
  ]);
  const exist = await user.getFavoriteSongs(song);
  if (exist) alreadyExist("Song");
  if (!user) badRequest("User not existing");
  if (!song) badRequest("Song not exist");
  await user.addFavoriteSongs(song);
};

const getFavourite = async ({ userId }, page, size) => {
  const user = await User.findByPk(userId);
  if (!user) badRequest("User not existing");
  const { limit, offset } = getPagination(page, size);
  const songs = await user.getFavoriteSongs({
    limit: limit,
    offset: offset,
    order: [["createdAt", "ASC"]],
  });

  return getPagingData(songs, page, size);
};
const deleteFavourite = async ({ id, userId }) => {
  const user = User.findByPk(userId);
  const song = Song.findByPk(id);
  if (!user) badRequest("User not existing");
  if (!song) badRequest("Song not exist");
  await user.removeFavoriteSong(song);
};

const getSongsByArtist = async ({ artistId }) => {
  const artist = await Artist.findByPk(artistId);
  if (!artist) notFound();
  const songP = await artist.getSongs(artist);
  if (!songP) {
    return null;
  }
  const songJson = songP.map((song) => song.toJSON());

  const songs = await transformPropertyInList(
    songJson,
    ["coverImage", "song"],
    getUrlCloudinary
  );

  return songs;
};
export default {
  createSong,
  getSongs,
  removeSong,
  deleteSong,
  getSong,
  restoreSong,
  updateSong,
  addToFavoutite,
  getFavourite,
  deleteFavourite,
  getSongsByArtist,
};
