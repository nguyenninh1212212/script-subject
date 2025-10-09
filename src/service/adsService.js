import { Ads } from "../model/entity/index.js";
import { Op } from "sequelize";

const adsService = {
  // Admin thêm quảng cáo mới
  async createAd(data) {
    return Ads.create(data);
  },

  // Admin lấy danh sách quảng cáo
  async getAllAds() {
    return Ads.findAll({ order: [["createdAt", "DESC"]] });
  },

  // Lấy ngẫu nhiên 1 quảng cáo đang hoạt động
  async getRandomAd() {
    const now = new Date();

    const ads = await Ads.findAll({
      where: {
        isActive: true,
        startDate: { [Op.lte]: now },
        endDate: { [Op.gte]: now },
      },
    });

    if (ads.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * ads.length);
    return ads[randomIndex];
  },
};

export default adsService;
