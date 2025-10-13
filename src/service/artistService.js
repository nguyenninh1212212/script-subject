import {
  Artist,
  Album,
  Subscription,
  SubscriptionPlan,
  Song,
} from "../model/entity/index.js";
import subscriptionType from "../enum/subscriptionType.js";
import { alreadyExist, badRequest } from "../middleware/errorHandler.js";
import { getPagination, getPagingData } from "../util/pagination.js";

async function createArtist({
  userId,
  stageName = "Anonymous",
  bio = "",
  avatarUrl = "",
}) {
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
  return await Artist.create({ userId, stageName, bio, avatarUrl });
}

async function getArtists({ page = 1, size = 10 }) {
  const { limit, offset } = getPagination(page, size);

  const data = await Artist.findAndCountAll({
    attributes: ["id", "stageName", "avatarUrl", "verified"],
    limit,
    offset,
  });
  return getPagingData(data, page, limit);
}

async function getArtistByUserId(userId) {
  return await Artist.findOne({
    where: { userId },
  });
}

async function getArtist({ id }) {
  return await Artist.findByPk(id, {
    include: [
      {
        model: Album,
        as: "album",
        attributes: ["id", "title", "coverUrl"],
      },
      {
        model: Song,
        as: "song",
        attributes: ["id", "coverImage", "isVipOnly", "title"],
      },
    ],
    attributes: ["id", "stageName", "bio", "avatarUrl", "verified"],
  });
}

export default {
  createArtist,
  getArtists,
  getArtistByUserId,
  getArtist,
};
