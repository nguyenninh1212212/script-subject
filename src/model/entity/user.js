  module.exports = (sequelize, DataTypes) => {
    const bcrypt = require("bcryptjs");
    const User = sequelize.define(
      "User",
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        username: { type: DataTypes.STRING, allowNull: false, unique: true },
        email: { type: DataTypes.STRING, allowNull: false, unique: true },
        password: { type: DataTypes.STRING, allowNull: false },
      },
      {
        tableName: "users",
        timestamps: true,
        hooks: {
          beforeCreate: async (user) => {
            if (user.password) {
              user.password = await bcrypt.hash(user.password, 10);
            }
          },
          beforeUpdate: async (user) => {
            if (user.changed("password")) {
              user.password = await bcrypt.hash(user.password, 10);
            }
          },
        },
      }
    );
    return User;
  };
