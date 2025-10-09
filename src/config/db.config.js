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
  } catch (error) {
    return;
  }
}

async function syncDB() {
  try {
    await sequelize.sync({ force: false, alter: true, logging: false });
  } catch (err) {
    return;
  }
}

connectDB();
syncDB();

export default sequelize;
