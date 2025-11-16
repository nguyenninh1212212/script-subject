import { User, Role, Artist } from "../model/entity/index.js";
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
      [Op.or]: [{ username }, { email: username }],
    },
  });

  if (!user) {
    throw unauthorized("Invalid credentials");
  }

  const artist = await Artist.findOne({ where: { userId: user.id } });

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
  return {
    token,
    refreshToken,
    name: user.name,
    artistId: artist?.id,
    walletAddress: user?.walletAddress
      ? "0" + user.walletAddress.slice(1)
      : null,
  };
};

const changeName = async ({ name, userId }) => {
  const user = await User.findByPk(userId);
  if (!user) notFound("User");
  user.name = name;
  await user.update();
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

  const artist = await Artist.findOne({ where: { userId: user.id } });
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
  return {
    token,
    refreshToken,
    name: user.name,
    artistId: artist?.id,
    walletAddress: user?.walletAddress
      ? "0" + user.walletAddress.slice(1)
      : null,
  };
};

const refreshToken = async ({ refreshToken }) => {
  if (!refreshToken) {
    throw unauthorized("Refresh token not found");
  }

  let payload;
  const user = await User.findOne({
    where: {
      refreshToken: refreshToken,
    },
  });

  if (!user) {
    throw unauthorized("Invalid or revoked refresh token");
  }
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
  } catch (err) {
    user && (user.refreshToken = null);
    user && (await user.update());
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

  const roles = await user.getRoles();
  const roleNames = roles.map((r) => r.name);

  const newAccessToken = generateToken({
    sub: user.id,
    roles: roleNames,
  });
  const artist = await Artist.findOne({ where: { userId: user.id } });

  return {
    user: {
      token: newAccessToken,
      name: user.name || "Anonymous",
      artistId: artist?.id || null,
      walletAddress: user?.walletAddress
        ? "0" + user.walletAddress.slice(1)
        : null,
    },
  };
};

const addWalletAddress = async ({ walletAddress, userId }) => {
  console.log("🚀 ~ addWalletAddress ~ walletAddress:", walletAddress);

  const user = await User.findByPk(userId);
  if (!user) notFound("User");

  await user.update({ walletAddress });
};

export default {
  register,
  login,
  getUsers,
  changePassword,
  logout,
  googleLogin,
  refreshToken,
  changeName,
  addWalletAddress,
};
