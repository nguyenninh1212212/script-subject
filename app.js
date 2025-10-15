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
dotenv.config();

const swaggerPath = path.resolve("./swagger-output.json");
const swaggerDocument = JSON.parse(fs.readFileSync(swaggerPath, "utf8"));

// Để dùng __dirname trong ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.static("public"));

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use("/", indexRouter);

await initDB();

app.use(errorHandler);

export default app;
