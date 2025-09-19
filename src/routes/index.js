// routes/index.js
const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");

class HomeController {
  index(req, res, next) {
    res.render("index", { title: "Express" });
  }
}

const homeController = new HomeController();

router.get("/", (req, res, next) => homeController.index(req, res, next));

router.use("/user", require("./users"));

module.exports = router;
