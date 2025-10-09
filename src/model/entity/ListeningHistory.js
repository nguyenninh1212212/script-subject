// models/listeningHistory.js
export default (sequelize, DataTypes) => {
  const ListeningHistory = sequelize.define(
    "ListeningHistory",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      playedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "listening_history",
      timestamps: false,
    }
  );

  return ListeningHistory;
};
