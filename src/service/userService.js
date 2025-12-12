import {
  User,
  Role,
  Artist,
  sequelize,
  Subscription,
  SubscriptionPlan,
} from "../model/entity/index.js";
import { generateToken } from "../util/jwt.js";
import bcrypt from "bcryptjs";
import createError from "http-errors";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { AESDecrypt } from "../util/AES.js";
import { Op, where } from "sequelize";
import {
  alreadyExist,
  badRequest,
  notFound,
  unauthorized,
  forbidden,
} from "../middleware/errorHandler.js";
import { fn, col, literal } from "sequelize";
import subscription from "../model/entity/subscription.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// helper: format user object to return
const userObject = ({
  token,
  name,
  artistId,
  subscription,
  refreshToken,
  avatar,
  roles,
  email,
}) => ({
  token,
  name,
  refreshToken,
  avatar,
  artistId: artistId || null,
  subscription: subscription || [],
  email: email || null,
  roles,
});

// ==================== REGISTER ====================
const register = async ({ username, password, name, email }) => {
  if (!username || !password || !name) badRequest("Invalid input");
  const invalidEmail = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (invalidEmail) {
    throw createError(400, "Invalid email format");
  }
  const hashPassword = await bcrypt.hash(password, 10);

  const [user, created] = await User.findOrCreate({
    where: { [sequelize.Op.or]: [{ username }, { email }] },
    defaults: { username, email, password: hashPassword, name },
  });

  if (!created) throw alreadyExist("Username or Email");

  const role = await Role.findOne({ where: { name: "user" } });
  if (role) await user.addRole(role);

  return user;
};

// ==================== LOGIN ====================
const login = async ({ username, password }) => {
  const user = await User.findOne({
    where: { [Op.or]: [{ username }, { email: username }] },
    include: [
      {
        model: Subscription,
        as: "subscriptions", // phải đúng alias trong User.hasMany
        include: [
          {
            model: SubscriptionPlan,
            as: "plan", // phải đúng alias trong Subscription.belongsTo
          },
        ],
        order: [["expiresAt", "DESC"]], // nếu muốn lấy subscription mới nhất
      },
    ],
  });

  if (!user) throw unauthorized("Invalid credentials");
  if (user.isBan) throw badRequest("This account is ban");
  if (!user.password)
    throw unauthorized("This account only supports Google login");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw unauthorized("Invalid password");

  const [artist, roles] = await Promise.all([
    Artist.findOne({ where: { userId: user.id } }),
    user.getRoles(),
  ]);

  const roleNames = roles.map((r) => r.name);
  const token = generateToken({ sub: user.id, roles: roleNames });
  const refreshToken = generateToken(
    { sub: user.id, roles: roleNames, isRefresh: true },
    "7d"
  );

  await user.update({ refreshToken });

  return userObject({
    token,
    name: user.name,
    artistId: artist?.id,
    refreshToken,
    avatar: user?.avatar,
    email: user?.email,
    roles: roleNames,
    subscription: user?.subscriptions.map((e) => {
      return {
        name: e?.plan?.name,
        expiredAt: e?.expiresAt,
      };
    }),
  });
};

// ==================== CHANGE NAME ====================
const changeName = async ({ name, userId }) => {
  const user = await User.findByPk(userId);
  if (!user) notFound("User");
  await user.update({ name });
};

// ==================== GET USERS ====================
const getUsers = async () => {
  return User.findAll({
    include: [
      {
        model: Role,
        as: "roles",
        attributes: { exclude: ["id", "createdAt", "updatedAt"] }, // bỏ field trong Role
        through: { attributes: [] }, // bỏ UserRole
      },
      {
        model: Subscription,
        as: "subscriptions",
        attributes: ["status", "expiresAt"],
        include: [
          {
            model: SubscriptionPlan,
            as: "plan",
            attributes: ["name"],
          },
        ],
      },
    ],
    attributes: { exclude: ["password", "refreshToken"] },
  });
};

// ==================== CHANGE PASSWORD ====================
const changePassword = async (username, oldPassword, newPassword) => {
  const user = await User.findOne({
    where: { [Op.or]: [{ username }, { email: username }] },
  });
  if (!user) notFound("User not found");

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) throw unauthorized("Old password is incorrect");

  const hashed = await bcrypt.hash(newPassword, 10);
  await user.update({ password: hashed });
};

// ==================== LOGOUT ====================
const logout = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) notFound("User not found");
  await user.update({ refreshToken: null });
};

// ==================== GOOGLE LOGIN ====================
const googleLogin = async ({ credential }) => {
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const { sub: googleId, email, name, picture } = ticket.getPayload();

  return sequelize.transaction(async (t) => {
    // Tìm hoặc tạo user
    let user = await User.findOne({ where: { googleId }, transaction: t });

    if (!user) {
      user = await User.findOne({ where: { email }, transaction: t });
      if (user) {
        await user.update({ googleId, avatar: picture }, { transaction: t });
      } else {
        user = await User.create(
          { googleId, email, name, avatar: picture, password: null },
          { transaction: t }
        );

        const role = await Role.findOne({
          where: { name: "user" },
          transaction: t,
        });
        if (role) await user.addRole(role, { transaction: t });
      }
    }

    // Lấy artist, roles, subscription + plan
    const [artist, roles, subscription] = await Promise.all([
      Artist.findOne({ where: { userId: user.id }, transaction: t }),
      user.getRoles({ transaction: t }),
      Subscription.findAll({
        where: { userId: user.id },
        include: [
          {
            model: SubscriptionPlan,
            as: "plan",
          },
        ],
        order: [["expiresAt", "DESC"]],
        transaction: t,
      }),
    ]);

    const roleNames = roles.map((r) => r.name);

    // Tạo token + refreshToken
    const token = generateToken({ sub: user.id, roles: roleNames });
    const refreshToken = generateToken(
      { sub: user.id, roles: roleNames, isRefresh: true },
      "7d"
    );

    await user.update({ refreshToken }, { transaction: t });

    return userObject({
      token,
      name: user.name,
      artistId: artist?.id || null,
      refreshToken,
      email: user?.email,
      avatar: user?.avatar,
      roles: roleNames,
      subscription: subscription
        ? subscription.map((e) => {
            return {
              name: e.plan?.name || null,
              expiredAt: e?.expiresAt,
            };
          })
        : null,
    });
  });
};

// ==================== REFRESH TOKEN ====================
const refreshAccessToken = async ({ refreshToken }) => {
  if (!refreshToken) throw unauthorized("Refresh token not found");

  const user = await User.findOne({
    where: { refreshToken },
    include: [
      {
        model: Subscription,
        as: "subscriptions", // phải đúng alias trong User.hasMany
        include: [
          {
            model: SubscriptionPlan,
            as: "plan", // phải đúng alias trong Subscription.belongsTo
          },
        ],
        order: [["expiresAt", "DESC"]], // nếu muốn lấy subscription mới nhất
      },
    ],
  });
  if (!user) throw unauthorized("Invalid or revoked refresh token");

  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
  } catch (err) {
    await user.update({ refreshToken: null });
    throw forbidden("Invalid or expired refresh token");
  }

  let decryptedData;
  try {
    decryptedData = AESDecrypt(payload.data);
  } catch {
    throw forbidden("Failed to decrypt refresh token payload");
  }

  if (!decryptedData.isRefresh) throw unauthorized("Invalid token type");

  const [roles, artist] = await Promise.all([
    user.getRoles(),
    Artist.findOne({ where: { userId: user.id } }),
  ]);
  const roleNames = roles.map((r) => r.name);
  const token = generateToken({ sub: user.id, roles: roleNames });

  return userObject({
    token,
    name: user.name,
    artistId: artist?.id,
    email: user?.email,
    avatar: user?.avatar,
    subscription: user?.subscriptions?.map((e) => {
      return {
        name: e.plan?.name || null,
        expiredAt: e?.expiresAt,
      };
    }),
  });
};

// ==================== ADD WALLET ====================
const addWalletAddress = async ({ walletAddress, userId }) => {
  const user = await User.findByPk(userId);
  if (!user) notFound("User");
  await user.update({ walletAddress });
};

const unLinkGoogle = async ({ refreshToken }) => {
  const user = await User.findOne({ refreshToken: refreshToken });
  if (!user) notFound("User");
  if (!user.password) badRequest("This account is google login");
  user.googleId = null;
  user.email = null;
  await user.update();
};
const userGrowth = async () => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const result = await User.findAll({
    attributes: [
      [fn("DATE_TRUNC", "month", col("createdAt")), "month"],
      [fn("COUNT", col("id")), "users"],
    ],
    where: {
      createdAt: { [Op.gte]: startOfYear },
    },
    group: [literal("month")],
    order: [[literal("month"), "ASC"]],
    raw: true,
  });

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  // Chuyển kết quả thành object dễ lookup
  const monthMap = {};
  result.forEach((r) => {
    const monthIndex = new Date(r.month).getMonth();
    monthMap[monthIndex] = parseInt(r.users, 10);
  });

  // Tạo dữ liệu 12 tháng
  const data = monthNames.map((name, index) => ({
    month: name,
    users: monthMap[index] || 0,
  }));
  console.log("🚀 ~ userGrowth ~ data:", data);

  return data;
};
const totalUser = async () => {
  return {
    total: await User.count(),
    growth: await userGrowth(),
  };
};

const createAccount = async ({ username, password, name, email, roleName }) => {
  const role = await Role.findOne({ where: { name: roleName.toLowerCase() } });
  if (!role) throw new Error("Role not found");

  const hashPassword = await bcrypt.hash(password, 10);

  const [user, created] = await User.findOrCreate({
    where: {
      [Op.or]: [{ username }, { email }],
    },
    defaults: {
      username,
      email,
      password: hashPassword,
      name,
    },
  });

  if (!created) {
    const roles = await user.getRoles();

    const hasRole = roles.some((r) => r.name === role.name);

    if (!hasRole) {
      await user.addRole(role);
    }

    return user;
  }

  await user.addRole(role);
  return user;
};

const banAccount = async ({ userId, isBan }) => {
  const user = await User.findByPk(userId);
  if (!user) throw notFound();

  await user.update({ isBan });
};

// ==================== EXPORT ====================
export default {
  register,
  login,
  changePassword,
  logout,
  changeName,
  getUsers,
  googleLogin,
  refreshAccessToken,
  addWalletAddress,
  unLinkGoogle,
  totalUser,
  userGrowth,
  createAccount,
  banAccount,
};
