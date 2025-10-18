import { SubscriptionPlan } from "../model/entity/index.js";
import { alreadyExist } from "../middleware/errorHandler.js";

const createPlan = async ({ name, price, duration, type }) => {
  const [subscriptionPlan, created] = await SubscriptionPlan.findOrCreate({
    where: { name, type },
    defaults: { price, duration },
  });
  if (created) alreadyExist("Plan");
  return subscriptionPlan;
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

const updatePlan = async ({ id, name, price, duration, type }) => {
  const plan = await SubscriptionPlan.findByPk(id);
  if (!plan) throw new Error(`Plan with id ${id} not found`);

  const data = { name, price, duration, type };

  Object.keys(data).forEach((key) => data[key] == null && delete data[key]);

  await plan.update(data);

  return plan;
};

export default { createPlan, getPlans, TypePlan, updatePlan };
