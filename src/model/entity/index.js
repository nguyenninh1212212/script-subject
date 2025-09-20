import Sequelize from "sequelize";
import sequelize from "../../config/db.config.js";

import UserFactory from "./user.js";
import RoleFactory from "./role.js";

const UserModel = UserFactory(sequelize, Sequelize.DataTypes);
const RoleModel = RoleFactory(sequelize, Sequelize.DataTypes);

UserModel.belongsToMany(RoleModel, { through: "UserRole", as: "roles" });
RoleModel.belongsToMany(UserModel, { through: "UserRole", as: "users" });

export { sequelize, UserModel as User, RoleModel as Role };
