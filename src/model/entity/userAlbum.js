// models/userAlbum.js
export default (sequelize, DataTypes) => {
  const UserAlbum = sequelize.define("UserAlbum", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    albumId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    purchasedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  });
  return UserAlbum;
};
