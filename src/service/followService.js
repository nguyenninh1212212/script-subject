import { User, Artist } from "../model/entity/index.js";
import { notFound } from "../middleware/errorHandler.js";

const follow = async ({ userId, artistId }) => {
  const user = await User.findByPk(userId);
  if (!user) notFound("User");

  const artist = await Artist.findByPk(artistId);
  if (!artist) notFound("Artist");

  await user.addFollowedArtist(artist);
};

const unFollow = async ({ userId, artistId }) => {
  const user = await User.findByPk(userId);
  if (!user) notFound("User");

  const artist = await Artist.findByPk(artistId);
  if (!artist) notFound("Artist");

  await user.removeFollowedArtist(artist);
};

export default { follow, unFollow };
