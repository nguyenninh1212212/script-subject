import { Song, Album, Artist } from "../model/entity/index.js";
import { notFound, badRequest } from "../middleware/errorHandler.js";
import subscriptionService from "../service/subscriptionService.js";
import subscriptionType from "../enum/subscriptionType.js";
import adsService from "./adsService.js";
import { uploadFromBuffer } from "../util/cloudinary.js";

async function createSong({
  title,
  userId,
  songFile,
  coverFile,
  duration,
}) {
  const artistId = await Artist.findOne({
    where: { userId },
    arttibutes: ["id"],
  });
  if (!artistId) notFound("Artist profile not found");

  const [songUpload, coverUpload] = await Promise.all([
    uploadFromBuffer(songFile.buffer, "songs"),
    uploadFromBuffer(coverFile.buffer, "coverImages"),
  ]);

  return await Song.create({
    title,
    artistId: artistId.id,
    duration,
    song: songUpload.public_id,
    coverImage: coverUpload.public_id,
  });
}

export const getSongs = async () => {
  return await Song.findAll({
    attributes: ["id", "title", "isVipOnly", "coverImage"],
    include: [
      {
        model: Artist,
        as: "artist",
        attributes: ["id", "stageName", "avatarUrl"],
      },
    ],
  });
};
export const getSong = async ({ userId, id }) => {
  const song = await Song.findByPk(
    { id },
    {
      include: [
        {
          model: Album,
          as: "album",
          attributes: ["id", "title", "coverUrl"],
        },
        {
          model: Artist,
          as: "artist",
          attributes: ["id", "stageName", "avatarUrl"],
        },
      ],
    }
  );
  const isSubscription = subscriptionService.checkSubscription({
    userId,
    type: subscriptionType.USER,
  });
  if (!isSubscription) {
    const ads = adsService.getRandomAd();
    if (ads && ads.type == "AUDIO") {
      return { song, ads };
    }
    return;
  }

  return song;
};

async function removeSong({ userId, songId }) {
  const song = await Song.findOne({
    where: { id: songId },
    include: [{ model: Artist, as: "artist", attributes: ["userId"] }],
  });

  if (!song) notFound("Song not found");
  if (song.artist.userId !== userId)
    badRequest("You are not the owner of this song");

  await song.destroy();
}

async function deleteSong(songId) {
  await Song.destroy({
    where: { id: songId },
    force: true,
  });
}

export default { createSong, getSongs, removeSong, deleteSong, getSong };
