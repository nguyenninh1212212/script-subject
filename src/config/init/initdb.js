// src/config/init/initdb.js
import {
  sequelize,
  User,
  Role,
  SubscriptionPlan,
  Subscription,
  Payment,
} from "../../model/entity/index.js";
import seedRoles from "./seedRoles.js";
import defaultTestdata from "./defaultTestdata.js";

export const initDB = async () => {
  try {
    console.log("🟢 Connecting database...");
    await sequelize.authenticate();

    console.log("🟢 Sync database...");

    await Role.sync({ force: true });
    await User.sync({ force: true });
    await SubscriptionPlan.sync({ force: true });

    await Subscription.sync({ force: true });
    await Payment.sync({ force: true });

    console.log("✅ Database synced!");

    await seedRoles();
    await defaultTestdata();

    console.log("🌱 Data seeded success!");
  } catch (error) {
    console.error("❌ Error init DB:", error);
  }
};
