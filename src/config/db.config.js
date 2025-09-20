import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "postgres",
    logging: false,
  }
);

async function connectDB() {
  try {
    await sequelize.authenticate();
    console.log("✅ Connected to PostgreSQL with Sequelize");
  } catch (error) {
    console.error("❌ Unable to connect to DB:", error);
  }
}

connectDB();

export default sequelize;
