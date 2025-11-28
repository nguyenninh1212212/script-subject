// Import sequelize từ file config đã được dọn dẹp
import sequelize from "../db.config.js";
import seedRoles from "./seedRoles.js";
import defaultTestdata from "./defaultTestdata.js";

export const initDB = async () => {
  const isDev = process.env.IS_DEV === "Y";
  console.log("🚀 ~ initDB ~ isDev:", isDev);
  try {
    console.log("🟢 Connecting database...");
    await sequelize.authenticate();
    console.log("✅ Database connected!");

    await sequelize.sync({ force: isDev });
    console.log("✅ Database synced!");

    await seedRoles();
    if (isDev) {
      await defaultTestdata();
      console.log("🌱 Data seeded success!");
    }
  } catch (error) {
    console.error("❌ Error init DB:", error);
    process.exit(1);
  }
};
