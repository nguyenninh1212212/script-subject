import express from "express";
import userRoutes from "./users.js";

const router = express.Router();

class HomeController {
  index(req, res, next) {
    res.render("index", { title: "Express" });
  }
}

const homeController = new HomeController();

router.get("/", (req, res, next) => homeController.index(req, res, next));

router.use("/user", userRoutes);

export default router;
