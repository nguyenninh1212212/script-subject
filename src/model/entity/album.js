// models/album.js
export default (sequelize, DataTypes) => {
  const Album = sequelize.define(
    "Album",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      title: { type: DataTypes.STRING, allowNull: false },
      coverUrl: { type: DataTypes.STRING }, // ảnh bìa album
      releaseDate: { type: DataTypes.DATE },
    },
    {
      tableName: "albums",
      timestamps: true,
    }
  );

  return Album;
};
