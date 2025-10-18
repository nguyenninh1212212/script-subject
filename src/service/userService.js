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
import { AESDecrypt } from "../util/AES.js";
import jwt from "jsonwebtoken";
import { forbidden } from "../middleware/errorHandler.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const register = async ({ username, email, password, name }) => {
  const invalidEmail = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (invalidEmail) {
    throw createError(400, "Invalid email format");
  }
  if (!username || !password || !email || !name) {
    badRequest("Invalid input");
  }

  const hashPassword = await bcrypt.hash(password, 10);

  const [user, created] = await User.findOrCreate({
    where: { [Op.or]: [{ username }, { email }] },
    defaults: {
      username,
      email,
      password: hashPassword,
      name,
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
};

const login = async ({ username, password }) => {
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
      isRefresh: true,
    },
    "7d"
  );

  user.refreshToken = refreshToken;
  await user.save();
  return { token, refreshToken };
};

const getUsers = async () => {
  return await User.findAll({ include: ["roles", "subscription"] });
};

const changePassword = async (username, oldPassword, newPassword) => {
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
};

const logout = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) {
    notFound("User not found");
  }
  user.refreshToken = null;
  await user.save();
};

const googleLogin = async ({ credential }) => {
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
      isRefresh: true,
    },
    "7d"
  );
  user.refreshToken = refreshToken;
  await user.save();
  return { token, refreshToken };
};

const refreshToken = async ({ refreshToken }) => {
  console.log("🚀 ~ refreshToken ~ refreshToken:", refreshToken);
  if (!refreshToken) {
    throw unauthorized("Refresh token not found");
  }
  console.log("🚀 ~ refreshToken ~ refreshToken:", refreshToken);

  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
  } catch (err) {
    throw forbidden("Invalid or expired refresh token");
  }
  let decryptedData;
  try {
    decryptedData = AESDecrypt(payload.data);
  } catch (err) {
    forbidden("Failed to decrypt refresh token payload");
  }

  if (!decryptedData.isRefresh) {
    throw unauthorized("Invalid token type");
  }

  const user = await User.findOne({
    where: {
      id: decryptedData.sub,
      refreshToken,
    },
  });
  if (!user) {
    throw unauthorized("Invalid or revoked refresh token");
  }

  const roles = await user.getRoles();
  const roleNames = roles.map((r) => r.name);

  const newAccessToken = generateToken({
    sub: user.id,
    roles: roleNames,
  });
  return newAccessToken;
};

export default {
  register,
  login,
  getUsers,
  changePassword,
  logout,
  googleLogin,
  refreshToken,
};
