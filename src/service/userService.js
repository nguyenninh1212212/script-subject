import sequelize from "../config/db.config.js";
import { User, Role } from "../model/entity/index.js";
import { generateToken } from "../util/jwt.js";
import bcrypt from "bcryptjs";
import createError from "http-errors";

class UserService {
  constructor() {
    // Sync DB khi app start
    sequelize
      .sync({ alter: true })
      .then(() => console.log("✅ Database synced"))
      .catch((err) => console.error("❌ Sync error:", err));
  }

  async register({ username, email, password }) {
    const [user, created] = await User.findOrCreate({
      where: { username },
      defaults: { email, password },
    });

    if (!created) {
      throw createError(409, "User already exists");
    }

    const role = await Role.findOne({ where: { name: "user" } });
    await user.addRole(role);

    return user;
  }

  async login({ username, password }) {
    const user = await User.findOne({ where: { username } });
    if (!user) {
      throw createError(401, "Invalid credentials");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw createError(401, "Invalid password");
    }

    const roles = await user.getRoles();
    const roleNames = roles.map((r) => r.name);

    const token = generateToken({
      sub: user.id,
      roles: roleNames,
    });

    return token;
  }

  async getUsers() {
    return await User.findAll();
  }
}

export default new UserService();
