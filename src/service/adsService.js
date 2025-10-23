import { Ads } from "../model/entity/index.js";
import { Op } from "sequelize";
import {
  uploadFromBuffer,
  deleteFromCloudinary,
  getUrlCloudinary,
} from "../util/cloudinary.js";
import { transformPropertyInList } from "../util/help.js";
import { badRequest, notFound } from "../middleware/errorHandler.js";
import { parseDateDMY } from "../util/help.js";

const adsService = {
  async createAd({
    title,
    redirectUrl,
    startDate,
    endDate,
    isActive,
    type,
    adFile,
  }) {
    if (!["BANNER", "AUDIO", "VIDEO"].includes(type)) {
      badRequest("Type không hợp lệ");
    }
    const mediaUrl = await uploadFromBuffer(adFile.buffer, "ads");

    const parsedStartDate = startDate ? parseDateDMY(startDate) : new Date();
    const parsedEndDate = endDate
      ? parseDateDMY(endDate)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    if (
      !parsedStartDate ||
      !parsedEndDate ||
      isNaN(parsedStartDate) ||
      isNaN(parsedEndDate)
    ) {
      badRequest("Ngày không hợp lệ (định dạng đúng: dd-mm-yyyy)");
    }

    if (parsedStartDate >= parsedEndDate) {
      badRequest("endDate phải lớn hơn startDate");
    }

    const data = {
      title,
      redirectUrl,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      isActive,
      type,
      mediaUrl: mediaUrl.public_id,
    };

    return Ads.create(data);
  },

  async getAllAds() {
    return Ads.findAll({ order: [["createdAt", "DESC"]] });
  },
  async deletAds({ id }) {
    const ad = await Ads.findByPk(id);
    const mediaUrl = ad.mediaUrl;
    if (!ad) notFound("Ad");
    await Promise.all([
      await deleteFromCloudinary(mediaUrl),
      await Ads.destroy(ad),
    ]);
  },

  async getRandomAd() {
    const now = new Date();

    const adsRaw = await Ads.findAll({
      where: {
        isActive: true,
        startDate: { [Op.lte]: now },
        endDate: { [Op.gte]: now },
      },
      attributes: ["type", "title", "redirectUrl", "mediaUrl", "id"],
    });

    if (!adsRaw || adsRaw.length === 0) return null;

    const adsJ = adsRaw.map((ad) => ad.toJSON());

    const ads = await transformPropertyInList(
      adsJ,
      ["mediaUrl"],
      getUrlCloudinary
    );

    if (ads.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * ads.length);
    return ads[randomIndex];
  },
};

export default adsService;
