import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import dotenv from "dotenv";
import fs from "fs";
import indexRouter from "./src/routes/index.js";
import swaggerUi from "swagger-ui-express";
import errorHandler from "./src/middleware/errorHandler.js";
import { initDB } from "./src/config/init/initdb.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import socketServer from "./src/config/socketServer.js";
import redisConfig from "./src/config/redis.config.js";
import cors from "cors";
import { initRabbit } from "./src/config/rabitmq.config.js";
import rateLimit from "express-rate-limit";
dotenv.config();

const swaggerPath = path.resolve("./swagger-output.json");
const swaggerDocument = JSON.parse(fs.readFileSync(swaggerPath, "utf8"));

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

const allowedOrigins = process.env.ALLOW_URL.split("|");

// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 1000,
//   message: "Bạn đã vượt quá số lần truy cập. Vui lòng thử lại sau.",
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// app.use(limiter);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.static("public"));

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, "public")));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use("/", indexRouter);
socketServer();
redisConfig.redisClient;
redisConfig.redisSub;
initRabbit();
await initDB();

app.use(errorHandler);

export default app;
