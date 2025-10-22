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
  console.log("🚀 ~ createArtist ~ exist:", exist);

  if (exist) {
    alreadyExist("Artist");
  }

  const [avatarUpload, bannerUpload] = await Promise.all([
    avatarFile
      ? uploadFromBuffer(avatarFile.buffer, "avatars")
      : Promise.resolve(null),
    bannerFile
      ? uploadFromBuffer(bannerFile.buffer, "banner")
      : Promise.resolve(null),
  ]);

  await Artist.create({
    userId,
    stageName,
    bio,
    avatarUrl: avatarUpload ? avatarUpload.public_id : null,
    bannerUrl: bannerUpload ? bannerUpload.public_id : null,
    youtubeUrl,
    facebookUrl,
    instagramUrl,
  });
};

const getArtists = async ({ page = 1, size = 10 }) => {
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
  console.log("🚀 ~ getArtists ~ artistsWithAvatar:", artistsWithAvatar);

  return getPagingData(
    { count: data.count, rows: artistsWithAvatar.filter(Boolean) },
    page,
    limit
  );
};

export const getArtist = async ({ id, userId }) => {
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
};

const myArtist = async (userId) => {
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
        attributes: ["month", "date", "view"],
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
    ],
  });

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
  return { artistJson, monthlyViews };
};

const updateArtist = async ({
  userId,
  stageName,
  bio,
  avatarFile,
  bannerFile,
  socialMedia,
}) => {
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

  return artist;
};

export default {
  createArtist,
  updateArtist,
  getArtists,
  getArtist,
  myArtist,
};
