import {
  Song,
  Album,
  Artist,
  User,
  Subscription,
  SubscriptionPlan,
} from "../model/entity/index.js";
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
import { Op, where } from "sequelize";
import sequelize from "sequelize";
import { MouthlySongView } from "../model/entity/index.js";
import {
  normalizeTextForAutocomplete,
  transformPropertyInList,
} from "../util/help.js";
import adudioClient from "../grpc/audioSearch.js";
import redis from "../config/redis.config.js";
import { sendMessage } from "../config/rabitmq.config.js";
import song from "../model/entity/song.js";

const createSong = async ({ title, userId, songFile, coverFile }) => {
  const artist = await Artist.findOne({
    where: { userId },
    include: [
      {
        model: User,
        attributes: ["id", "email"],
        as: "owner",
        required: true,
        include: [
          {
            model: Subscription,
            as: "subscriptions",
            required: true,
            where: { userId },
            include: [
              {
                model: SubscriptionPlan,
                as: "plan",
                required: true,
                where: { type: "ARTIST" },
                attributes: ["id", "name", "type", "duration"],
              },
            ],
          },
        ],
      },
    ],
  });

  if (!artist) {
    badRequest("Artist profile or active ARTIST subscription not found");
  }

  let songUpload, coverUpload, duration;
  try {
    [songUpload, coverUpload, duration] = await Promise.all([
      uploadFromBuffer(songFile.buffer, "songs"),
      uploadFromBuffer(coverFile.buffer, "coverImages"),
      getAudioDurationFromBuffer(songFile.buffer, songFile.mimetype),
    ]);
  } catch (err) {
    console.error("Error uploading files or generating embedding:", err);
    throw badRequest("Failed to process audio or cover file");
  }

  const song = await Song.create({
    title,
    artistId: artist.id,
    duration,
    song: songUpload.public_id,
    coverImage: coverUpload.public_id,
  });

  const [songUrl, coverUrl] = await Promise.all([
    getUrlCloudinary(song.song),
    getUrlCloudinary(song.coverImage),
  ]);

  sendMessage("song_embedding", {
    songId: song.id,
    audioUrl: songUrl,
  });
  sendMessage("song_es", {
    doc: {
      songId: song.id,
      title: song.title,
      coverImage: song.coverImage,
      autocomplete: normalizeTextForAutocomplete(song.title),
    },
    id: song.id,
    index: "songs",
  });

  return { ...song.toJSON(), song: songUrl, coverImage: coverUrl };
};

const {
  keys,
  getOrSetCache,
  publishInvalidationResource,
  updateCacheResource,
  delByPattern,
  redisClient,
} = redis;
const SEARCH_CACHE_TTL = 300;
const GUEST = "GUEST";

// =================================================================
// === ĐÃ CẬP NHẬT HÀM NÀY (getSongs) ===
// =================================================================
const getSongs = async ({ page, size }, userId) => {
  const key = keys.songList(page, size, GUEST);
  return getOrSetCache(key, async () => {
    const { limit, offset } = getPagination(page, size);
    const data = await Song.findAndCountAll({
      attributes: [
        "id",
        "title",
        "coverImage",
        "duration",
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
  });
};

const incrementViews = async (artistId, songId) => {
  try {
    await Song.increment("view", { by: 1, where: { id: songId } });

    // 2. Tăng view theo tháng
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const [record, created] = await MouthlySongView.findOrCreate({
      where: { artistId, year: currentYear, month: currentMonth },
      defaults: { view: 1 },
    });

    if (!created) {
      await record.increment("view", { by: 1 });
    }
  } catch (err) {
    console.error("Failed to increment views:", err);
  }
};

const HISTORY_LIMIT = 100; // ví dụ: chỉ giữ 100 bài gần nhất
const HISTORY_TTL_DAYS = 30;

const addSongToHistory = async (userId, songId) => {
  if (!userId || !songId) return;

  const song = await Song.findByPk(songId);
  if (!song) return;

  const key = keys.history(userId);
  const now = Date.now();

  await redisClient.sendCommand([
    "ZADD",
    key,
    now.toString(),
    JSON.stringify({ id: songId, title: song.title }),
  ]);

  const minScore = now - HISTORY_TTL_DAYS * 24 * 60 * 60 * 1000; // 30 ngày trước
  await redisClient.sendCommand([
    "ZREMRANGEBYSCORE",
    key,
    "0",
    minScore.toString(),
  ]);

  const total = await redisClient.sendCommand(["ZCARD", key]);
  if (total > HISTORY_LIMIT) {
    await redisClient.sendCommand([
      "ZREMRANGEBYRANK",
      key,
      "0",
      (total - HISTORY_LIMIT - 1).toString(),
    ]);
  }
};

const getSong = async ({ userId, id }) => {
  const key = keys.songMeta(id);
  if (userId && id) {
    await Promise.all([addSongToHistory(userId, id), addTopSong(userId, id)]);
  }
  return getOrSetCache(
    key,
    async () => {
      const song = await Song.findByPk(id, {
        include: [
          { model: Album, as: "album", attributes: ["id", "title"] },
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
          SELECT 1 FROM "FavoriteSong" fs
         WHERE fs."SongId" = "Song"."id" AND fs."UserId" = :userId
        )`),
            "isFavourite",
          ],
        ],
        replacements: { userId },
      });

      if (!song) return null;

      const songJson = song.toJSON();
      const currentId = songJson.id;
      const albumId = songJson.album ? songJson.album.id : null;
      const commonWhere = albumId ? { albumId } : { albumId: null };

      // Previous and next song
      const [previousSong, nextSong] = await Promise.all([
        Song.findOne({
          where: { ...commonWhere, id: { [Op.lt]: currentId } },
          order: [["id", "DESC"]],
          attributes: ["id"],
        }),
        Song.findOne({
          where: { ...commonWhere, id: { [Op.gt]: currentId } },
          order: [["id", "ASC"]],
          attributes: ["id"],
        }),
      ]);

      songJson.previousSongId = previousSong ? previousSong.id : null;
      songJson.nextSongId = nextSong ? nextSong.id : null;

      // Get subscription status, ads, and urls concurrently
      const [isSubscription, ads, songUrl, coverImageUrl, avatarUrl] =
        await Promise.all([
          subscriptionService.checkSubscription({
            userId,
            type: subscriptionType.USER,
          }),
          adsService.getRandomAd(),
          getUrlCloudinary(songJson.song),
          getUrlCloudinary(songJson.coverImage),
          songJson.artist.avatarUrl
            ? getUrlCloudinary(songJson.artist.avatarUrl)
            : null,
        ]);

      // Replace urls in songJson
      songJson.song = songUrl;
      songJson.coverImage = coverImageUrl;
      songJson.artist.avatarUrl = avatarUrl;

      // Handle ads visibility
      if (isSubscription || !ads || ads.type !== "AUDIO") {
        songJson.ads = null;
      } else {
        songJson.ads = ads;
      }

      return songJson;
    },
    SEARCH_CACHE_TTL
  );
};

const removeSong = async ({ userId, songId }) => {
  const song = await Song.findOne({
    where: { id: songId },
    include: [{ model: Artist, as: "artist", attributes: ["userId"] }],
  });

  if (!song) notFound("Song not found");
  if (song.artist.userId !== userId)
    badRequest("You are not the owner of this song");
  const artist = await Artist.findByPk(song.artistId);
  delByPattern(`songs:list:*`);
  redisClient.del(keys.songMeta(songId));
  redisClient.del(keys.artist(song.artistId));
  redisClient.del(keys.myProfile(artist.userId));
  await song.destroy();
};

const deleteSong = async (songId) => {
  const song = await Song.findByPk(songId, { paranoid: false });

  if (!song) {
    throw new Error("Song not found");
  }

  await Promise.all([
    deleteFromCloudinary(song.coverImage),
    deleteFromCloudinary(song.song),
    sendMessage("song_es_del", { id: songId, index: "songs" }),
    publishInvalidationResource({
      resource: "song",
      idOrQuery: songId,
      type: "song:delete",
    }),
  ]);

  const artist = await Artist.findByPk(song.artistId);
  await Song.destroy({
    where: { id: songId },
    force: true,
  });

  await delByPattern(`songs:list:*`);

  redisClient.del(keys.songMeta(songId));
  redisClient.del(keys.artist(song.artistId));
  redisClient.del(keys.myProfile(artist.userId));
};

const restoreSong = async ({ userId, id }) => {
  const artist = await Artist.findOne({
    where: { userId },
    attributes: ["id", "userId"],
  });
  if (!artist) {
    notFound("Artist");
  }
  const [numberOfAffectedRows, updatedRows] = await Song.update(
    { deletedAt: null },
    {
      where: {
        id,
        artistId: artist.id,
        deletedAt: { [Op.not]: null },
      },
      paranoid: false,
      returning: true, // cần để lấy dữ liệu sau khi update
    }
  );

  if (numberOfAffectedRows > 0) {
    console.log("Đã khôi phục bài hát thành công!");
  } else {
    notFound("Song");
  }
  console.log("🚀 ~ restoreSong ~ artist.userId:", artist.userId);

  delByPattern(`songs:list:*`);
  redisClient.del(keys.songMeta(id));
  redisClient.del(keys.artist(artist.id));
  redisClient.del(keys.myProfile(artist.userId));
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
  const newdata = await song.update(data, { returning: true });
  await updateCacheResource({
    resource: "song",
    idOrQuery: id,
    newData: newdata[1][0],
  });
  return song;
};
const addToFavoutite = async ({ userId, songId }) => {
  const [user, song] = await Promise.all([
    await User.findByPk(userId),
    await Song.findByPk(songId),
  ]);
  console.log("🚀 ~ addToFavoutite ~ user:", user);
  const exist = await user.hasFavoriteSong(song);
  if (exist) alreadyExist("Song");
  if (!user) badRequest("User not existing");
  if (!song) badRequest("Song not exist");
  await user.addFavoriteSongs(song);
};
const getFavourite = async ({ userId }, page, size) => {
  if (!userId) return null;
  const user = await User.findByPk(userId);
  if (!user) throw new Error("User not found");

  const { limit, offset } = getPagination(page, size);

  const allFavorites = await user.getFavoriteSongs({
    through: { attributes: [] },
  });
  const totalItems = allFavorites.length;

  const songs = await user.getFavoriteSongs({
    joinTableAttributes: [],
    limit,
    offset,
    order: [["createdAt", "ASC"]],
    attributes: [
      "id",
      "title",
      "coverImage",
      "duration",
      "song",
      [sequelize.literal(true), "isFavourite"],
    ],
  });

  const songsJson = songs.map((song) => song.toJSON());

  const transformedSongs = await transformPropertyInList(
    songsJson,
    ["song", "coverImage"],
    getUrlCloudinary
  );

  return getPagingData(
    { rows: transformedSongs, count: totalItems },
    page,
    size
  );
};
const deleteFavourite = async ({ id, userId }) => {
  console.log("🚀 ~ deleteFavourite ~ id:", id);
  const user = await User.findByPk(userId);
  const song = await Song.findByPk(id);
  if (!user) badRequest("User not existing");
  if (!song) badRequest("Song not exist");
  await user.removeFavoriteSongs(song);
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
const totalSongs = async () => {
  return await Song.count();
};
const getTrashSongs = async ({ userId }) => {
  const artist = await Artist.findOne({ where: { userId } });
  if (!artist) notFound();
  const songP = await Song.findAll({
    where: {
      artistId: artist.id,
      deletedAt: { [Op.ne]: null },
    },
    paranoid: false,
  });

  if (!songP || songP.length === 0) return [];

  const songJson = songP.map((song) => song.toJSON());

  const songs = await transformPropertyInList(
    songJson,
    ["coverImage", "song"],
    getUrlCloudinary
  );

  return songs;
};

// Thêm bài vào top
const addTopSong = async (songId) => {
  if (!songId) return;

  try {
    await redis.redisClient.sendCommand([
      "ZINCRBY",
      keys.topSongs(),
      "1",
      songId,
    ]);
  } catch (error) {
    console.error("Error in addTopSong:", error);
  }
};

const getTopSongs = async (limit = 20) => {
  const res = await redis.redisClient.zRevRange(keys.topSongs(), 0, limit - 1, {
    WITHSCORES: true,
  });
  const topSongs = [];
  const key = keys.topSongList();

  return getOrSetCache(key, async () => {
    for (let i = 0; i < res.length; i += 2) {
      const songId = res[i];
      const score = Number(res[i + 1]);
      const song = await Song.findByPk(songId, {
        attributes: ["id", "title", "coverImage"],
      });
      const coverImage = song.coverImage
        ? await getUrlCloudinary(song.coverImage)
        : "";

      topSongs.push({
        id: songId,
        title: song?.title || "Unknown",
        coverImage: coverImage,
        score,
      });
    }

    return topSongs;
  });
};

const recordListen = async (userId, songId) => {
  if (!userId) return;
  await redisClient.zIncrBy(`song:${userId}:listens`, 1, songId);
};

const getUserHistory = async (userId) => {
  const items = await redisClient.sendCommand([
    "ZREVRANGE",
    `user:${userId}:listens`,
    "0",
    "9",
  ]);

  // Nếu lưu JSON, parse lại
  const history = items.map((item) => JSON.parse(item));
  return history;
};

export const recommendByAudio = async (songId, topN = 10) => {
  const key = keys.recomend(songId);
  return getOrSetCache(
    key,
    async () => {
      const targetSong = await Song.findByPk(songId);
      if (!targetSong) return [];
      const grpcRequest = {
        songId: songId,
      };
      const grpcResponse = await new Promise((resolve, reject) => {
        adudioClient.GetRecommendSongs(grpcRequest, (err, res) =>
          err ? reject(err) : resolve(res)
        );
      });
      return grpcResponse;
    },
    3600
  );
};

export const recommendForUser = async (userId, topN = 10) => {
  if (!userId) return [];
  const history = await getUserHistory(userId);
  if (!history || history.length === 0) {
    return await getTopSongs(topN);
  }
  const listenedEmbeddings = await Promise.all(
    history.map(async ({ songId }) => {
      const song = await Song.findByPk(songId);
      return song.embedding;
    })
  );

  const allSongs = getSongs({ page: 1, size: 20 }, userId);

  const recommendations = allSongs
    .filter((s) => !history.some((h) => h.songId === s.id))
    .map((s) => {
      const score =
        listenedEmbeddings
          .map((e) => cosineSimilarity(e, s.embedding))
          .reduce((a, b) => a + b, 0) / listenedEmbeddings.length;
      return { ...s.toJSON(), score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  return recommendations;
};

export const getSongManager = async () => {
  const songs = await Song.findAll({
    attributes: ["id", "title", "createdAt", "isVipOnly", "deletedAt"],
    paranoid: false,
  });
  return songs;
};

export const banSong = async ({ songId, isBan }) => {
  const song = await Song.findByPk(songId);
  if (!song) throw notFound();
  await song.update({ isBan });
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
  totalSongs,
  getTrashSongs,
  getTopSongs,
  getUserHistory,
  recommendForUser,
  recommendByAudio,
  getSongManager,
  banSong,
};
