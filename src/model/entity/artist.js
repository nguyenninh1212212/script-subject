export default (sequelize, DataTypes) => {
  const Artist = sequelize.define(
    "Artist",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },
      stageName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      bio: {
        type: DataTypes.TEXT,
      },
      avatarUrl: {
        type: DataTypes.STRING,
      },
      bannerUrl: {
        type: DataTypes.STRING,
      },
      facebookUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      youtubeUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      instagramUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "artists",
    },
    {
      defaultScope: {
        attributes: { exclude: ["userId"] },
      },
    }
  );

  return Artist;
};
