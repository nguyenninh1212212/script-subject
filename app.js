import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import dotenv from "dotenv";
import fs from "fs";
import indexRouter from "./src/routes/index.js";
import swaggerUi from "swagger-ui-express";
import { outputFile } from "./swagger.js";
import errorHandler from "./src/middleware/errorHandler.js";
import seedRoles from "./src/config/seedRoles.js";

import { fileURLToPath } from "url";
import { dirname } from "path";

const swaggerPath = path.resolve("./swagger-output.json");
const swaggerDocument = JSON.parse(fs.readFileSync(swaggerPath, "utf8"));

// Để dùng __dirname trong ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use("/", indexRouter);

app.use(errorHandler);

seedRoles()
  .then(() => console.log("Roles seeded"))
  .catch((err) => console.error("Error seeding roles:", err));

export default app;
