import bcrypt from "bcryptjs";

export default (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      username: { type: DataTypes.STRING, allowNull: true, unique: true },
      email: { type: DataTypes.STRING, allowNull: true, unique: true },
      password: { type: DataTypes.STRING, allowNull: true },
      refreshToken: { type: DataTypes.TEXT, allowNull: true },
      googleId: { type: DataTypes.STRING, unique: true, allowNull: true },
      provider: {
        type: DataTypes.ENUM("LOCAL", "GOOGLE"),
        defaultValue: "LOCAL",
      },
    },
    {
      tableName: "users",
      timestamps: true,
    }
  );

  return User;
};
