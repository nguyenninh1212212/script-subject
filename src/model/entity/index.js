const Sequelize = require("sequelize");
const sequelize = require("../../config/db.config");

const UserModel = require("./user")(sequelize, Sequelize.DataTypes);
const RoleModel = require("./role")(sequelize, Sequelize.DataTypes);

// Many-to-Many
UserModel.belongsToMany(RoleModel, { through: "UserRole", as: "roles" });
RoleModel.belongsToMany(UserModel, { through: "UserRole", as: "users" });

module.exports = {
  sequelize,
  User: UserModel,
  Role: RoleModel,
};
