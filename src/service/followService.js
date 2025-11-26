import { User, Artist } from "../model/entity/index.js";
import { alreadyExist, notFound } from "../middleware/errorHandler.js";
import { getPagination, getPagingData } from "../util/pagination.js";
import { badRequest } from "../middleware/errorHandler.js";

const follow = async ({ userId, artistId }) => {
  const user = await User.findByPk(userId);
  if (!user) notFound("User");

  const artist = await Artist.findByPk(artistId);
  if (!artist) notFound("Artist");

  if (artist.userId === userId) {
    badRequest("You cannot follow yourself");
  }

  // Kiểm tra đã follow chưa
  const isFollowing = await user.hasFollow(artist);
  if (isFollowing) {
    alreadyExist("Follow");
  }

  // Thêm follow
  await user.addFollow(artist); // đúng tên hàm
};

const unFollow = async ({ userId, artistId }) => {
  const user = await User.findByPk(userId);
  if (!user) notFound("User");

  const artist = await Artist.findByPk(artistId);
  if (!artist) notFound("Artist");

  await user.removeFollow(artist);
};
const myFollowers = async (userId, { page, size }) => {
  const artist = await Artist.findOne({ where: userId });
  if (!artist) notFound("Artist");
  const { limit, offset } = getPagination(page, size);
  const data = await artist.getFollowers({
    limit: limit,
    offset: offset,
    order: [["createdAt", "ASC"]],
  });
  return getPagingData(data, page, limit);
};

const artistFollow = async (userId, { page, size }) => {
  const user = await User.findByPk(userId);
  const { limit, offset } = getPagination(page, size);
  const data = await user.getFollows({
    limit: limit,
    offset: offset,
    order: [["createdAt", "ASC"]],
  });
  return getPagingData(data, page, limit);
};

export default { follow, unFollow, myFollowers, artistFollow };
