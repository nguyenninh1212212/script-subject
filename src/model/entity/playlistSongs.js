export default (sequelize, DataTypes) => {
  const PlaylistSong = sequelize.define(
    "PlaylistSong",
    {
      playlistId: {
        type: DataTypes.UUID,
        references: { model: "playlists", key: "id" },
      },
      songId: {
        type: DataTypes.UUID,
        references: { model: "songs", key: "id" },
      },
    },
    {
      tableName: "playlist_songs",
      timestamps: false,
    }
  );
  return PlaylistSong;
};
