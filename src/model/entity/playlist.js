export default (sequelize, DataTypes) => {
  const Playlist = sequelize.define(
    "Playlist",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING, allowNull: false },
      coverUrl: { type: DataTypes.STRING, allowNull: true },
      description: { type: DataTypes.TEXT },
    },
    {
      tableName: "playlists",
      timestamps: true,
    }
  );
  return Playlist;
};
