import { SubscriptionPlan } from "../model/entity/index.js";

const createPlan = async ({ name, price, duration, type }) => {
  return await SubscriptionPlan.create({
    name,
    price,
    duration,
    type,
  });
};

const getPlans = async () => {
  return await SubscriptionPlan.findAll();
};

const TypePlan = async ({ planId }) => {
  const plan = await SubscriptionPlan.findByPk(planId);
  if (!plan) {
    notFound("Subscription plan not found");
  }
  return plan.type;
};

export default { createPlan, getPlans, TypePlan };
