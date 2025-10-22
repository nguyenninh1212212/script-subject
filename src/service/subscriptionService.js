import { Subscription, SubscriptionPlan } from "../model/entity/index.js";
import { notFound, badRequest } from "../middleware/errorHandler.js";
import sequelize from "../config/db.config.js";
import { getPagination, getPagingData } from "../util/pagination.js";
import { toMidnight } from "../util/help.js";

const createSubscription = async ({ userId, planId }) => {
  const t = await sequelize.transaction();
  const plan = await SubscriptionPlan.findByPk(planId);
  if (!plan) {
    notFound("Subscription plan not found");
  }
  const existing = await Subscription.findOne({
    where: { userId },
    include: {
      model: SubscriptionPlan,
      as: "plan",
      where: { type: plan.type },
    },
    transaction: t,
  });

  if (existing) {
    badRequest(`User already has a ${plan.type} subscription`);
  }

  const startDateObj = new Date();
  const expiresAtObj = new Date(startDateObj);
  expiresAtObj.setDate(startDateObj.getDate() + plan.duration);

  return await Subscription.create({
    userId,
    planId,
    expiresAt: expiresAtObj,
  });
};

const checkActiveSubscription = async ({ subscriptionId }) => {
  const subscription = await Subscription.findByPk(subscriptionId);
  if (!subscription) notFound("Subscription not found");

  const currentDate = new Date();
  const endDate = new Date(subscription.endDate);
  const isActive = endDate > currentDate;

  return {
    isActive,
    status: isActive ? "ACTIVE" : "EXPIRED",
    expiresInDays: Math.ceil((endDate - currentDate) / (1000 * 60 * 60 * 24)),
  };
};

const checkSubscription = async ({ userId, type, status = "ACTIVE" }) => {
  if (!userId) return false;
  const subscription = await Subscription.findOne({
    where: { userId, status },
    include: {
      model: SubscriptionPlan,
      as: "plan",
      where: { type },
    },
  });

  return subscription ? true : false;
};

const getSubscriptions = async ({ userId }) => {
  const { limit, offset } = getPagination(1, 10);
  const subscriptions = await Subscription.findAndCountAll({
    where: { userId },
    limit,
    offset,
  });
  return getPagingData(subscriptions, 1, limit);
};

const renewSubscription = async ({ userId, id }) => {
  const subscription = await Subscription.findByPk(id);
  if (userId != subscription.userId || !subscription)
    badRequest("Scription is not existing");
  const plan = await SubscriptionPlan.findByPk(subscription.planId);
  if (!plan) {
    notFound("Subscription plan not found");
  }
  const dateLocal = toMidnight(new Date());
  const expiredDate = toMidnight(new Date(subscription.expiresAt));
  if (expiredDate > dateLocal) badRequest("Your subscription is not expired");
  const startDateObj = new Date();
  const expiresAtObj = new Date(startDateObj);
  expiresAtObj.setDate(startDateObj.getDate() + plan.duration);
  subscription.expiresAt = expiresAtObj;
  await subscription.save();
};

export default {
  createSubscription,
  checkActiveSubscription,
  checkSubscription,
  getSubscriptions,
  renewSubscription,
};
