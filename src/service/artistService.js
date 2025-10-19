import {
  Artist,
  Album,
  Subscription,
  SubscriptionPlan,
  Song,
} from "../model/entity/index.js";
import subscriptionType from "../enum/subscriptionType.js";
import {
  alreadyExist,
  badRequest,
  notFound,
} from "../middleware/errorHandler.js";
import { getPagination, getPagingData } from "../util/pagination.js";
import { uploadFromBuffer } from "../util/cloudinary.js";
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
    attributes: ["id", "stageName", "avatarUrl", "verified"],
    limit,
    offset,
  });
  return getPagingData(data, page, limit);
};

const getArtist = async ({ id, userId }) => {
  const artist = await Artist.findByPk(id, {
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
    ],
    attributes: {
      include: [
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
              WHERE fs."ArtistId" = :artistId 
                AND fs."UserId" = :userId
            ))`
          ),
          "isFollow",
        ],
      ],
    },
    replacements: { artistId: id, userId }, // bind parameters
  });

  if (!artist) throw new Error("Artist not found");
  return artist;
};

const myArtist = async (userId) => {
  return await Artist.findOne({
    where: { userId: userId },
    include: [
      {
        model: Album,
        as: "albums", // phải trùng với tên association
        attributes: ["id", "title", "coverUrl"],
      },
      {
        model: Song,
        as: "songs", // phải trùng với tên association
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
};

const updateArtist = async ({
  userId,
  stageName,
  bio,
  avatarFile,
  bannerFile,
  socialMedia,
}) => {
  // Lấy artist hiện tại
  const artist = await Artist.findOne({ where: { userId } });
  if (!artist) notFound("Artist not found");

  const [avatarUpload, bannerUpload] = await Promise.all([
    avatarFile
      ? uploadFromBuffer(avatarFile.buffer, "avatars")
      : Promise.resolve(null),
    bannerFile
      ? uploadFromBuffer(bannerFile.buffer, "banner")
      : Promise.resolve(null),
  ]);

  await artist.update({
    stageName: stageName ?? artist.stageName,
    bio: bio ?? artist.bio,
    avatarUrl: avatarUpload ? avatarUpload.public_id : artist.avatarUrl,
    bannerUrl: bannerUpload ? bannerUpload.public_id : artist.bannerUrl,
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
