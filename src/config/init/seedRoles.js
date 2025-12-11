import { Sequelize } from "sequelize";
import sequelize from "../db.config.js";
import createRole from "../../model/entity/role.js"; // import ESM
const Role = createRole(sequelize, Sequelize.DataTypes);

async function seedRoles() {
  try {
    const defaultRoles = [
      { name: "admin" },
      { name: "user" },
      { name: "guest" },
      { name: "staff" },
    ];

    for (const role of defaultRoles) {
      await Role.findOrCreate({ where: { name: role.name } });
    }
    console.log("✅ Default roles seeded");
  } catch (err) {
    console.error("❌ Error seeding roles:", err);
  }
}

export default seedRoles;
