import { User, Role, SubscriptionPlan } from "../../model/entity/index.js";
import subscriptionType from "../../enum/subscriptionType.js";
import subscriptionService from "../../service/subscriptionService.js";
import artistService from "../../service/artistService.js";

import { Op, where } from "sequelize";
const plans = [
  {
    name: "Free Trial",
    price: 0.0,
    duration: 7,
    type: subscriptionType.USER,
  },
  {
    name: "VIP",
    price: 4.0,
    duration: 70,
    type: subscriptionType.USER,
  },
  {
    name: "ARTIST",
    price: 3.0,
    duration: 100,
    type: subscriptionType.ARTIST,
  },
];

const accounts = [
  {
    username: "admin",
    email: "admin@example.com",
    password: "admin",
    nameRole: "admin",
  },
  {
    username: "guest",
    email: "example01@example.com",
    password: "123456",
    nameRole: "user",
  },
  {
    username: "artist",
    email: "example02@example.com",
    password: "123456",
    nameRole: "user",
  },
];

const defaultTestdata = async () => {
  try {
    for (const plan of plans) {
      await SubscriptionPlan.findOrCreate({
        where: { name: plan.name.toUpperCase() },
        defaults: {
          price: plan.price,
          duration: plan.duration,
          type: plan.type,
        },
      });
    }

    for (const account of accounts) {
      const { username, email, password, nameRole } = account;
      const [user, created] = await User.findOrCreate({
        where: { [Op.or]: [{ username }, { email }] },
        defaults: { username, email, password },
      });

      if (created) continue;

      const role = await Role.findOne({ where: { name: nameRole } });
      if (role) await user.addRole(role);

      if (username === "artist") {
        const plan = await SubscriptionPlan.findOne({
          where: { type: subscriptionType.ARTIST },
          attributes: ["id"],
        });

        if (plan) {
          await subscriptionService.createSubscription({
            userId: user.id,
            planId: plan.id,
          });
        }

        await artistService.createArtist({ userId: user.id });
      }
    }
  } catch (error) {
    console.log("❌ Error default test data:", error);
  }
};

export default defaultTestdata;
