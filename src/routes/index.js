import express from "express";
import userRoutes from "./users.routes.js";
import subscriptionRoutes from "./subscription.routes.js";
import paymentRoutes from "./payment.routes.js";
import artistRoutes from "./artist.routes.js";
import albumRoutes from "./album.routes.js";
import songRoutes from "./song.routes.js";
import playlistRoutes from "./playlist.routes.js";
import planRoutes from "./plan.routes.js";
import paypalRoutes from "./webhook/paypal.routes.js";
import adsRoutes from "./ads.routes.js";
import homeRouter from "./home.routes.js";

const router = express.Router();

router.get("/", (req, res, next) => res.send("✅ Server is running"));

router.use("/api/user", userRoutes);
router.use("/api/subscriptions", subscriptionRoutes);
router.use("/api/payments", paymentRoutes);
router.use("/api/artists", artistRoutes);
router.use("/api/albums", albumRoutes);
router.use("/api/songs", songRoutes);

/**
 * #swagger.tags = ['Playlist']
 * #swagger.summary = 'Lấy playlist theo ID'
 */
router.use("/api/playlists", playlistRoutes);
router.use("/api/plans", planRoutes);
router.use("/api/paypal", paypalRoutes); // thêm route paypal
router.use("/api/ads", adsRoutes);
router.use("/api", homeRouter);

export default router;
