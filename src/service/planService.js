import { SubscriptionPlan } from "../model/entity/index.js";

async function createPlan({ name, price, duration, type }) {
  return await SubscriptionPlan.create({
    name,
    price,
    duration,
    type,
  });
}

async function getPlans() {
  return await SubscriptionPlan.findAll();
}

const TypePlan = async ({ planId }) => {
  const plan = await SubscriptionPlan.findByPk(planId);
  if (!plan) {
    notFound("Subscription plan not found");
  }
  return plan.type;
};

export default { createPlan, getPlans, TypePlan };
