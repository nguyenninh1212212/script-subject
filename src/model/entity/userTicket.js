export default (sequelize, DataTypes) => {
  const UserNFT = sequelize.define(
    "userTickets",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      tokenId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      tokenURI: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "userTickets",
      timestamps: true,
    }
  );

  return UserNFT;
};
