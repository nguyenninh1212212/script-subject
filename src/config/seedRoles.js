// src/seed/roleSeed.js
const Sequelize = require("sequelize");
const sequelize = require("./db.config");
const Role = require("../model/entity/role")(sequelize, Sequelize.DataTypes);

async function seedRoles() {
  const defaultRoles = [{ name: "admin" }, { name: "user" }, { name: "guest" }];

  for (const role of defaultRoles) {
    await Role.findOrCreate({ where: { name: role.name } });
  }
  console.log("✅ Default roles seeded");
}

module.exports = seedRoles;
