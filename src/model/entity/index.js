import { Sequelize } from "sequelize";
import sequelize from "../../config/db.config.js";

// Import factory functions
import UserFactory from "./user.js";
import RoleFactory from "./role.js";
import SubscriptionFactory from "./subscription.js";
import PaymentFactory from "./payment.js";
import ArtistFactory from "./artist.js";
import AlbumFactory from "./album.js";
import SongFactory from "./song.js";
import PlaylistFactory from "./playlist.js";
import SubscriptionPlanFactory from "./subscriptionPlan.js";
import AdsFactory from "./ads.js";

// =======================
// Khởi tạo Models
// =======================
const User = UserFactory(sequelize, Sequelize.DataTypes);
const Role = RoleFactory(sequelize, Sequelize.DataTypes);
const Subscription = SubscriptionFactory(sequelize, Sequelize.DataTypes);
const Payment = PaymentFactory(sequelize, Sequelize.DataTypes);
const Artist = ArtistFactory(sequelize, Sequelize.DataTypes);
const Album = AlbumFactory(sequelize, Sequelize.DataTypes);
const Song = SongFactory(sequelize, Sequelize.DataTypes);
const Playlist = PlaylistFactory(sequelize, Sequelize.DataTypes);
const Ads = AdsFactory(sequelize, Sequelize.DataTypes);
const SubscriptionPlan = SubscriptionPlanFactory(
  sequelize,
  Sequelize.DataTypes
);

// =======================
// Quan hệ User <-> Role (N-N)
// =======================
User.belongsToMany(Role, { through: "UserRole", as: "roles" });
Role.belongsToMany(User, { through: "UserRole", as: "users" });

// =======================
// Quan hệ User <-> Subscription (1-N)
// =======================
// Mỗi user có thể có nhiều Subscription, nhưng mỗi loại chỉ 1 (ràng buộc ở DB)
User.hasMany(Subscription, { foreignKey: "userId", as: "subscriptions" });
Subscription.belongsTo(User, { foreignKey: "userId", as: "user" });

// =======================
// Quan hệ Subscription <-> SubscriptionPlan (N-1)
// =======================
SubscriptionPlan.hasMany(Subscription, {
  foreignKey: "planId",
  as: "subscriptions",
});
Subscription.belongsTo(SubscriptionPlan, {
  foreignKey: "planId",
  as: "plan",
});

// =======================
// Quan hệ User <-> Payment (1-N)
// =======================
User.hasMany(Payment, { foreignKey: "userId", as: "payments" });
Payment.belongsTo(User, { foreignKey: "userId", as: "user" });

// =======================
// Quan hệ User <-> Artist (1-1)
// =======================
User.hasOne(Artist, { foreignKey: "userId", as: "artist" });
Artist.belongsTo(User, { foreignKey: "userId", as: "owner" });

// =======================
// Quan hệ Artist <-> Album (1-N)
// =======================
Artist.hasMany(Album, { foreignKey: "artistId", as: "albums" });
Album.belongsTo(Artist, { foreignKey: "artistId", as: "artist" });

// =======================
// Quan hệ Artist <-> Song (1-N)
// =======================
Artist.hasMany(Song, { foreignKey: "artistId", as: "songs" });
Song.belongsTo(Artist, { foreignKey: "artistId", as: "artist" });

// =======================
// Quan hệ Album <-> Song (1-N)
// =======================
Album.hasMany(Song, { foreignKey: "albumId", as: "songs" });
Song.belongsTo(Album, { foreignKey: "albumId", as: "album" });

// =======================
// Quan hệ User <-> Playlist (1-N)
// =======================
User.hasMany(Playlist, { foreignKey: "userId", as: "playlists" });
Playlist.belongsTo(User, { foreignKey: "userId", as: "owner" });

// =======================
// Quan hệ Playlist <-> Song (N-N)
// =======================
Playlist.belongsToMany(Song, { through: "PlaylistSong", as: "songs" });
Song.belongsToMany(Playlist, { through: "PlaylistSong", as: "playlists" });

// =======================
// Favorite Songs (User <-> Song) (N-N)
// =======================
User.belongsToMany(Song, { through: "FavoriteSong", as: "favoriteSongs" });
Song.belongsToMany(User, { through: "FavoriteSong", as: "likedByUsers" });
// =======================
// Follower (User <-> Artist) (N-N)
// =======================
User.belongsToMany(Artist, { through: "Follower", as: "follows" });
Artist.belongsToMany(User, { through: "Follower", as: "followers" });

// =======================
// Favorite Albums (User <-> Album) (N-N)
// =======================
User.belongsToMany(Album, { through: "FavoriteAlbum", as: "favoriteAlbums" });
Album.belongsToMany(User, { through: "FavoriteAlbum", as: "likedByUsers" });

// =======================
// Export tất cả models
// =======================
export {
  sequelize,
  User,
  Role,
  Subscription,
  SubscriptionPlan,
  Payment,
  Artist,
  Album,
  Song,
  Playlist,
  Ads,
};
