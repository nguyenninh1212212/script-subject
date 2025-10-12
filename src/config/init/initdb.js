// Import sequelize từ file config đã được dọn dẹp
import sequelize from "../db.config.js";
import seedRoles from "./seedRoles.js";
import defaultTestdata from "./defaultTestdata.js";

export const initDB = async () => {
  const isDev = process.env.NODE_ENV === "development";
  try {
    console.log("🟢 Connecting database...");
    await sequelize.authenticate();
    console.log("✅ Database connected!");

    await sequelize.sync({ force: isDev });
    console.log("✅ Database synced!");

    if (isDev) {
      await seedRoles();
      await defaultTestdata();
      console.log("🌱 Data seeded success!");
    }
  } catch (error) {
    console.error("❌ Error init DB:", error);
    process.exit(1);
  }
};
