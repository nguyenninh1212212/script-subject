const sequelize = require("../config/db.config");
const { User, Role } = require("../model/entity");
const generateToken = require("../util/jwt").generateToken;
const bcrypt = require("bcryptjs");
const createError = require("http-errors");

class AuthService {
  constructor() {
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
    const users = await User.findAll();
    return users;
  }
}

module.exports = new AuthService();
