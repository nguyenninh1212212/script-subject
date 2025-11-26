import {
  Artist,
  Album,
  Subscription,
  SubscriptionPlan,
  Song,
  MouthlySongView,
} from "../model/entity/index.js";
import subscriptionType from "../enum/subscriptionType.js";
import {
  alreadyExist,
  badRequest,
  notFound,
} from "../middleware/errorHandler.js";
import { getPagination, getPagingData } from "../util/pagination.js";
import { transformPropertyInList } from "../util/help.js";
import {
  uploadFromBuffer,
  getUrlCloudinary,
  deleteFromCloudinary,
} from "../util/cloudinary.js";
import sequelize from "sequelize";
import { addDataElastic } from "./searchService.js";
import redis from "../config/redis.config.js";
import { normalizeTextForAutocomplete } from "../util/help.js";

const { getOrSetCache, keys, updateCacheResource } = redis;

const createArtist = async ({
  userId,
  stageName = "Anonymous",
  bio = "",
  avatarFile,
  bannerFile,
  socialMedia,
}) => {
  const { youtubeUrl, facebookUrl, instagramUrl } = socialMedia;
  const existArtPlan = await Subscription.count({
    include: [
      {
        model: SubscriptionPlan,
        as: "plan",
        required: true,
        where: {
          type: subscriptionType.ARTIST,
        },

        attributes: [],
      },
    ],
    where: {
      userId: userId,
    },
  });

  if (existArtPlan == 0) badRequest("You need to subscripe artist plan");
  const exist = await Artist.findOne({
    where: { userId },
  });

  if (exist) {
    alreadyExist("Artist");
  }

  const [avatarUpload, bannerUpload] = await Promise.all([
    avatarFile?.buffer ? uploadFromBuffer(avatarFile.buffer, "avatars") : null,
    bannerFile?.buffer ? uploadFromBuffer(bannerFile.buffer, "banner") : null,
  ]);
  const newArtist = await Artist.create({
    userId,
    stageName,
    bio,
    avatarUrl: avatarUpload ? avatarUpload.public_id : null,
    bannerUrl: bannerUpload ? bannerUpload.public_id : null,
    youtubeUrl,
    facebookUrl,
    instagramUrl,
  });
  const doc = {
    name: newArtist.stageName,
    avatarUrl: newArtist.avatarUrl,
    autocomplete: normalizeTextForAutocomplete(newArtist.stageName),
  };

  addDataElastic(doc, newArtist.id, "artists");
};

const getArtists = async ({ page = 1, size = 10 }) => {
  const key = keys.albumList(page, size);
  return getOrSetCache(key, async () => {
    const { limit, offset } = getPagination(page, size);

    const data = await Artist.findAndCountAll({
      attributes: [
        "id",
        "stageName",
        "avatarUrl",
        "verified",
        [
          sequelize.literal(`(
          SELECT COUNT(*) 
          FROM "Follower" AS f 
          WHERE f."ArtistId" = "Artist"."id"
        )`),
          "followerCount",
        ],
      ],
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      raw: true,
    });

    const artistsWithAvatar = await transformPropertyInList(
      data.rows,
      ["avatarUrl"],
      getUrlCloudinary
    );
    return getPagingData(
      { count: data.count, rows: artistsWithAvatar.filter(Boolean) },
      page,
      limit
    );
  });
};

const getArtist = async ({ id, userId }) => {
  const key = keys.artist(id);
  return getOrSetCache(key, async () => {
    const artistRaw = await Artist.findByPk(id, {
      include: [
        {
          model: Album,
          as: "albums",
          attributes: ["id", "title", "coverUrl"],
        },
        {
          model: Song,
          as: "songs",
          attributes: [
            "id",
            "coverImage",
            "title",
            "song",
            "view",
            "createdAt",
            "duration",
            [
              sequelize.literal(`(
          SELECT COUNT(*) 
          FROM "Follower" AS f 
          WHERE f."ArtistId" = "Artist"."id"
        )`),
              "followerCount",
            ],
          ],
          order: [["view", "DESC"]],
        },
      ],
      attributes: [
        "id",
        "stageName",
        "bio",
        "avatarUrl",
        "verified",
        "bannerUrl",
        "youtubeUrl",
        "facebookUrl",
        "instagramUrl",
        [
          sequelize.literal(
            `(EXISTS (
             SELECT 1 FROM "Follower" fs 
             WHERE fs."ArtistId" = "Artist"."id" -- Refer to Artist's id
               AND fs."UserId" = :userId
           ))`
          ),
          "isFollow", // Alias for the subquery result
        ],

        [
          sequelize.literal(`(
          SELECT COUNT(*) 
          FROM "Follower" AS f 
          WHERE f."ArtistId" = "Artist"."id"
        )`),
          "followerCount",
        ],
      ],
      replacements: { userId },
      raw: false,
      nest: true,
    });

    // 2. Check if artist exists
    if (!artistRaw) {
      throw new Error("Artist not found");
    }

    const artistJson = artistRaw.toJSON();

    if (artistJson.avatarUrl) {
      artistJson.avatarUrl = await getUrlCloudinary(artistJson.avatarUrl);
    }
    if (artistJson.bannerUrl) {
      artistJson.bannerUrl = await getUrlCloudinary(artistJson.bannerUrl);
    }
    const monthlyViews = await MouthlySongView.findOne({
      where: { artistId: artistJson.id },
      order: [
        ["year", "DESC"],
        ["month", "DESC"],
      ],
    });

    const [song, album] = await Promise.all([
      await transformPropertyInList(
        artistJson.songs,
        ["coverImage"],
        getUrlCloudinary
      ),
      await transformPropertyInList(
        artistJson.albums,
        ["coverUrl"],
        getUrlCloudinary
      ),
    ]);
    artistJson.songs = song;
    artistJson.albums = album;

    return { artistJson, monthlyViews };
  });
};

const myArtist = async (userId) => {
  const key = keys.myProfile(userId);
  return getOrSetCache(key, async () => {
    const artistRaw = await Artist.findOne({
      where: { userId: userId },
      include: [
        {
          model: Album,
          as: "albums",
          attributes: ["id", "title", "coverUrl"],
        },
        {
          model: Song,
          as: "songs",
          attributes: [
            "id",
            "coverImage",
            "isVipOnly",
            "title",
            "song",
            "view",
            "createdAt",
          ],
        },
        {
          model: MouthlySongView,
          as: "monthlyViews",
          attributes: ["month", "year", "view"],
        },
      ],
      attributes: [
        "id",
        "stageName",
        "bio",
        "avatarUrl",
        "verified",
        "bannerUrl",
        "youtubeUrl",
        "facebookUrl",
        "instagramUrl",
        [
          sequelize.literal(`(
          SELECT COUNT(*) 
          FROM "Follower" AS f 
          WHERE f."ArtistId" = "Artist"."id"
        )`),
          "followerCount",
        ],
      ],
    });

    const artistJson = artistRaw.toJSON();

    if (artistJson.avatarUrl) {
      artistJson.avatarUrl = await getUrlCloudinary(artistJson.avatarUrl);
    }
    if (artistJson.bannerUrl) {
      artistJson.bannerUrl = await getUrlCloudinary(artistJson.bannerUrl);
    }

    await Promise.all([
      (artistJson.songs = await transformPropertyInList(
        artistJson.songs,
        ["coverImage"],
        getUrlCloudinary
      )),
      (artistJson.albums = await transformPropertyInList(
        artistJson.albums,
        ["coverUrl"],
        getUrlCloudinary
      )),
    ]);

    return { artistJson };
  });
};

const updateArtist = async ({
  userId,
  stageName,
  bio,
  avatarFile,
  bannerFile,
  socialMedia,
}) => {
  const key = keys.myProfile(userId);
  return getOrSetCache(key, async () => {
    const artist = await Artist.findOne({ where: { userId } });
    if (!artist) notFound("Artist not found");

    // Xử lý upload song song (nếu có file)
    const [avatarUpload, bannerUpload] = await Promise.all([
      avatarFile
        ? (async () => {
            await deleteFromCloudinary(artist.avatarUrl);
            return uploadFromBuffer(avatarFile.buffer, "avatars");
          })()
        : null,
      bannerFile
        ? (async () => {
            await deleteFromCloudinary(artist.bannerUrl);
            return uploadFromBuffer(bannerFile.buffer, "banners");
          })()
        : null,
    ]);

    await artist.update({
      stageName: stageName ?? artist.stageName,
      bio: bio ?? artist.bio,
      avatarUrl: avatarUpload?.secure_url ?? artist.avatarUrl,
      bannerUrl: bannerUpload?.secure_url ?? artist.bannerUrl,
      youtubeUrl: socialMedia?.youtubeUrl ?? artist.youtubeUrl,
      facebookUrl: socialMedia?.facebookUrl ?? artist.facebookUrl,
      instagramUrl: socialMedia?.instagramUrl ?? artist.instagramUrl,
    });
    await updateCacheResource({
      resource: "artist",
      userIds: userId,
      idOrQuery: artist.id,
      newData: artist,
    });

    return artist;
  });
};

const totalArtist = async () => {
  return await Artist.count();
};

export default {
  createArtist,
  updateArtist,
  getArtists,
  getArtist,
  myArtist,
  totalArtist,
};
