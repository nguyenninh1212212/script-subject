export default (sequelize, DataTypes) => {
  const Song = sequelize.define(
    "Song",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      title: { type: DataTypes.TEXT, allowNull: false },
      song: { type: DataTypes.STRING, allowNull: false }, // link nhạc
      coverImage: { type: DataTypes.STRING }, // ảnh bìa
      duration: { type: DataTypes.INTEGER }, // thời lượng (giây)
      isVipOnly: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    {
      tableName: "songs",
      timestamps: true,
      paranoid: true,
    }
  );
  return Song;
};
