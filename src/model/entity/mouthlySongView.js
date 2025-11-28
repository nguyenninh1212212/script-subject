// models/MouthlySongView.js
export default (sequelize, DataTypes) => {
  const MouthlySongView = sequelize.define(
    "MouthlySongView",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      year: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: new Date().getFullYear(),
      },
      month: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: new Date().getMonth() + 1,
      },
      view: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
    },
    {
      tableName: "MouthlySongView",
      timestamps: false,
    }
  );

  return MouthlySongView;
};
