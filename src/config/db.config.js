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
    dialectOptions: {
      ssl: {
        require: true, // Bắt buộc sử dụng SSL
        rejectUnauthorized: false, // (Tùy chọn) Thường được dùng để tránh lỗi self-signed certs trong môi trường test/staging. Tốt nhất là nên để true nếu có thể.
      },
    },
    logging: false,
  }
);

export default sequelize;
