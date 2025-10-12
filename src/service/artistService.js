import { where } from "sequelize";
import {
  Artist,
  Album,
  Song,
  Subscription,
  SubscriptionPlan,
} from "../model/entity/index.js";
import subscriptionType from "../enum/subscriptionType.js";
import { alreadyExist, badRequest } from "../middleware/errorHandler.js";

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

async function getArtists() {
  return await Artist.findAll({ include: ["albums", "songs"] });
}

async function getArtistById(id) {
  return await Artist.findByPk(id, { include: ["albums", "songs"] });
}

async function getArtistByUserId(userId) {
  return await Artist.findOne({
    where: { userId },
  });
}

export default { createArtist, getArtists, getArtistById, getArtistByUserId };
