  var createError = require("http-errors");
  var express = require("express");
  var path = require("path");
  var cookieParser = require("cookie-parser");
  var logger = require("morgan");

  var indexRouter = require("./src/routes/index");

  const swaggerUi = require("swagger-ui-express");
  const { outputFile } = require("./swagger");
  const swaggerDocument = require(outputFile);
  const errorHandler = require("./src/middleware/errorHandler");
  const seedRoles = require("./src/config/seedRoles");

  var app = express();
  require("dotenv").config();
  // view engine setup
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

  module.exports = app;
