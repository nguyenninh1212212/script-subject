import { Sequelize } from "sequelize";
import sequelize from "./db.config.js";
import createRole from "../model/entity/role.js"; // import ESM
const Role = createRole(sequelize, Sequelize.DataTypes);

async function seedRoles() {
  const defaultRoles = [{ name: "admin" }, { name: "user" }, { name: "guest" }];

  for (const role of defaultRoles) {
    await Role.findOrCreate({ where: { name: role.name } });
  }
  console.log("✅ Default roles seeded");
}

export default seedRoles;
