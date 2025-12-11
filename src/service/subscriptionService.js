import { Subscription, SubscriptionPlan } from "../model/entity/index.js";
import { notFound, badRequest } from "../middleware/errorHandler.js";
import sequelize from "../config/db.config.js";
import { getPagination, getPagingData } from "../util/pagination.js";
import { toMidnight } from "../util/help.js";
import subscriptionStatus from "../enum/subscriptionStatus.js";

const createSubscription = async ({ userId, planId, transactionId }) => {
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
    transactionId,
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

const getSubscriptions = async ({ userId, page = 1, size = 10 }) => {
  const { limit, offset } = getPagination(page, size);

  const { count: totalItems, rows: plans } =
    await SubscriptionPlan.findAndCountAll({
      limit,
      offset,
      order: [["price", "ASC"]],
    });

  const userSubscriptions = await Subscription.findAll({
    where: { userId },
    attributes: ["id", "planId", "status", "expiresAt", "createdAt"],
  });

  const result = plans.map((plan) => {
    const sub = userSubscriptions.find((s) => s.planId === plan.id);
    return {
      ...plan.toJSON(),
      subscription: sub ? sub.toJSON() : null,
    };
  });

  return getPagingData({ count: totalItems, rows: result }, page, limit);
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
const getTotalSubscriptionsByType = async () => {
  const ALIAS_PLAN = "plan";

  try {
    const result = await Subscription.findAll({
      attributes: [
        // 1. THAY THẾ "type" BẰNG "name"
        [sequelize.literal(`"${ALIAS_PLAN}"."name"`), "name"], // Lấy tên gói (name)

        [sequelize.fn("COUNT", sequelize.col("Subscription.id")), "count"],
      ],
      include: [
        {
          model: SubscriptionPlan,
          as: ALIAS_PLAN, // Dùng alias 'plan'
          attributes: [],
          required: true,
        },
      ],
      where: {
        status: subscriptionStatus.ACTIVE,
      }, // 2. THAY THẾ "type" BẰNG "name" trong GROUP BY
      group: [sequelize.literal(`"${ALIAS_PLAN}"."name"`)],
      raw: true,
    }); // Định dạng lại kết quả

    return result.map((item) => ({
      // 3. Cập nhật key trả về từ 'type' thành 'name'
      name: item.name,
      count: parseInt(item.count, 10),
    }));
  } catch (error) {
    console.error("Error fetching total subscriptions by name:", error);
    return [];
  }
};
export default {
  createSubscription,
  checkActiveSubscription,
  checkSubscription,
  getSubscriptions,
  renewSubscription,
  getTotalSubscriptionsByType,
};
