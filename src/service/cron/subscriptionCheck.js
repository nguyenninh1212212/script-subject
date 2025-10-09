import cron from "node-cron";
import { Subscription, User } from "../../model/entity/index.js";
import subscriptionStatus from "../../enum/subscriptionStatus.js";
import { Op } from "sequelize";

export const checkExpiredSubscriptions = () => {
  cron.schedule("0 0 * * *", async () => {
    console.log("🔔 Checking expired subscriptions...");

    const now = new Date();

    try {
      const expiredSubs = await Subscription.findAll({
        where: {
          expiresAt: { [Op.lt]: now },
          status: subscriptionStatus.ACTIVE,
        },
        include: [User],
      });

      for (const sub of expiredSubs) {
        sub.status = subscriptionStatus.EXPIRED;
        await sub.save();
        console.log(
          `✅ Subscription for user ${sub.userId} expired on ${sub.expiresAt}`
        );
      }
      console.log("🔔 Finished checking expired subscriptions.");
    } catch (error) {
      console.error("❌ Error checking subscriptions:", error);
    }
  });
};
