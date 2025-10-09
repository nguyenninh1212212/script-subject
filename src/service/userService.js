import { User, Role } from "../model/entity/index.js";
import { generateToken } from "../util/jwt.js";
import bcrypt from "bcryptjs";
import createError from "http-errors";
import { OAuth2Client } from "google-auth-library";
import {
  alreadyExist,
  badRequest,
  notFound,
  unauthorized,
} from "../middleware/errorHandler.js";
import { Op, where } from "sequelize";
import role from "../model/entity/role.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function register({ username, email, password }) {
  const invalidEmail = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (invalidEmail) {
    throw createError(400, "Invalid email format");
  }
  if (!username || !password || !email) {
    badRequest("Invalid input");
  }

  const [user, created] = await User.findOrCreate({
    where: { [Op.or]: [{ username }, { email }] },
    defaults: {
      username,
      email,
      password: await bcrypt.hash(password, 10),
    },
  });

  if (!created) {
    throw alreadyExist("Username or Email");
  }

  const role = await Role.findOne({ where: { name: "user" } });
  if (role) {
    await user.addRole(role);
  }

  return user;
}

async function login({ username, password }) {
  const user = await User.findOne({
    where: {
      [Op.or]: [{ username }, { email: username }], // cho phép login bằng username hoặc email
    },
  });

  if (!user) {
    throw unauthorized("Invalid credentials");
  }

  if (!user.password) {
    throw unauthorized("This account only supports Google login");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw unauthorized("Invalid password");
  }

  const roles = await user.getRoles();
  const roleNames = roles.map((r) => r.name);

  const token = generateToken({
    sub: user.id,
    roles: roleNames,
  });

  const refreshToken = generateToken(
    {
      sub: user.id,
      roles: roleNames,
    },
    "7d"
  );

  user.refreshToken = refreshToken;
  await user.save();
  return { token, refreshToken };
}

async function getUsers() {
  return await User.findAll({ include: ["roles", "subscription"] });
}

async function changePassword(username, oldPassword, newPassword) {
  const user = await User.findOne({
    where: { [Op.or]: [{ username }, { email: username }] },
  });
  if (!user) {
    notFound("User not found");
  }
  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    unauthorized("Old password is incorrect");
  }
  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
}

async function logout(userId) {
  const user = await User.findByPk(userId);
  if (!user) {
    notFound("User not found");
  }
  user.refreshToken = null;
  await user.save();
}

async function googleLogin({ credential }) {
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  const { sub: googleId, email, name } = payload;
  let user = await User.findOne({ where: { googleId } });

  if (!user) {
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      existing.googleId = googleId;
      existing.provider = "GOOGLE";
      await existing.save();
      user = existing;
    } else {
      user = await User.create({
        googleId,
        email,
        name,
        password: null,
        provider: "GOOGLE",
      });
      const role = await Role.findOne({ where: { name: "user" } });
      if (role) await user.addRole(role);
    }
  }

  const roles = await user.getRoles();
  const roleNames = roles.map((r) => r.name);

  const token = generateToken({
    sub: user.id,
    roles: roleNames,
  });

  const refreshToken = generateToken(
    {
      sub: user.id,
      roles: roleNames,
    },
    "7d"
  );
  return { token, refreshToken };
}

export default {
  register,
  login,
  getUsers,
  changePassword,
  logout,
  googleLogin,
};
