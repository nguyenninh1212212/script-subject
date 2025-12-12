import { createClient } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URL,
});
redisClient.on("message", (mes) => console.log("Redis log : " + mes));
await redisClient.connect();
const redisSub = createClient({
  url: process.env.REDIS_URL,
});
redisClient.on("message", (mes) => console.log("Redis log : " + mes));
await redisSub.connect();

const safeStringify = (v) => JSON.stringify(v);
const safeParse = (s) => {
  try {
    return JSON.parse(s);
  } catch (e) {
    return null;
  }
};
const keys = {
  search: (q) => `search:${q}`,
  autocomplete: (q) => `autocomplete:${q}`,
  songMeta: (id) => `song:meta:${id}`,
  recomend: (id) => `song:recommend:${id}`,
  waveform: (id) => `song:wave:${id}`,
  topSongs: () => `top:songs`,
  songList: (page, size, userId) =>
    `songs:list:${userId || "guest"}:page${page}:size${size}`,
  artist: (id) => `artist:meta:${id}`,
  profile: (id) => `profile:meta:${id}`,
  myProfile: (id) => `myProfile:meta:${id}`,
  artistList: (page, size, userId) =>
    `artists:list:${userId || "guest"}:page${page}:size${size}`,
  album: (id) => `album:meta:${id}`,
  albumList: (page, size, userId) =>
    `album:list:${userId || "guest"}:page${page}:size${size}`,
  favoriteList: (page, size, userId) =>
    `favorite:list:${userId || "guest"}:page${page}:size${size}`,
  home: () => `home`,
  history: (userId) => `user:${userId || "guest"}:listens`,
};

const CACHE_INVALIDATION_CHANNEL = "cache:invalidate";

const setCache = async (key, value, ttl = 300) => {
  try {
    redisClient.set(key, JSON.stringify(value), { EX: ttl });
  } catch (err) {
    console.error("Error setting cache for key", key, err);
  }
};

const getCache = async (key) => {
  try {
    const cached = redisClient.get(key);
    if (!cached) return null;
    return JSON.parse(cached); // parse JSON
  } catch (err) {
    console.error("Error parsing cache for key", key, err);
    return null;
  }
};

const getOrSetCache = async (key, fetchFunction, ttl = 300) => {
  try {
    const cached = await redisClient.get(key);
    if (cached) return safeParse(cached);
    const data = await fetchFunction();

    redisClient.set(key, JSON.stringify(data), { EX: ttl });

    return data;
  } catch (err) {
    console.error("Error in getOrSetCache for key", key, err);
    return fetchFunction();
  }
};

// -------------------------
// 2️⃣ Publisher
// -------------------------

const publishInvalidation = async (payload) => {
  try {
    if (!payload || typeof payload !== "object")
      throw new Error("Invalid payload");
    const message = JSON.stringify(payload);
    await redisClient.publish(CACHE_INVALIDATION_CHANNEL, message);
    console.log("[CACHE INVALIDATION] Published:", message);
  } catch (err) {
    console.error("[CACHE INVALIDATION] Failed to publish:", err);
  }
};

// Tổng quát cho bất kỳ resource nào
const publishInvalidationResource = async ({
  resource,
  idOrQuery = null,
  userIds = [],
  type = null,
  pattern = null,
}) => {
  const keysToInvalidate = [];
  let payload = {};

  switch (resource) {
    case "song":
      type = type || "song:update";
      keysToInvalidate.push(keys.songMeta(idOrQuery), keys.topSongs());
      keysToInvalidate.push(...userIds.map((u) => keys.songList(1, 20, u)));
      payload = {
        type,
        keys: keysToInvalidate,
        resourceId: idOrQuery,
        userIds,
      };
      break;

    case "album":
      type = type || "album:update";
      keysToInvalidate.push(keys.album(idOrQuery));
      keysToInvalidate.push(...userIds.map((u) => keys.albumList(1, 20, u)));
      payload = {
        type,
        keys: keysToInvalidate,
        resourceId: idOrQuery,
        userIds,
      };
      break;

    case "artist":
      type = type || "artist:update";
      keysToInvalidate.push(keys.artist(idOrQuery));
      keysToInvalidate.push(...userIds.map((u) => keys.artistList(1, 20, u)));
      payload = {
        type,
        keys: keysToInvalidate,
        resourceId: idOrQuery,
        userIds,
      };
      break;

    case "search":
      type = type || "search:update";
      keysToInvalidate.push(keys.search(idOrQuery));
      payload = { type, keys: keysToInvalidate };
      break;

    case "autocomplete":
      type = type || "autocomplete:update";
      keysToInvalidate.push(keys.autocomplete(idOrQuery));
      payload = { type, keys: keysToInvalidate };
      break;

    case "topSongs":
      type = type || "topSongs:update";
      keysToInvalidate.push(keys.topSongs());
      payload = { type, keys: keysToInvalidate };
      break;

    default:
      throw new Error(`Unknown resource type: ${resource}`);
  }

  if (pattern) payload.pattern = pattern;

  await publishInvalidation(payload);
};

// -------------------------
// 3️⃣ Subscriber
// -------------------------
redisSub.subscribe(CACHE_INVALIDATION_CHANNEL, async (raw) => {
  try {
    const msg = JSON.parse(raw);
    if (!msg || typeof msg !== "object") return;

    // --- 1) Xóa key cụ thể ---
    if (msg.keys && Array.isArray(msg.keys)) {
      await Promise.all(msg.keys.map((k) => redisClient.del(k)));
    }

    // --- 2) Xóa cache chi tiết dựa vào type + resourceId ---
    if (msg.type && msg.resourceId) {
      switch (msg.type) {
        case "song:update":
        case "song:delete":
          await redisClient.del(keys.songMeta(msg.resourceId));
          break;

        case "album:update":
        case "album:delete":
          await redisClient.del(keys.album(msg.resourceId));
          break;

        case "artist:update":
        case "artist:delete":
          await redisClient.del(keys.artist(msg.resourceId));
          break;
      }
    }

    // --- 3) Xóa theo pattern (autocomplete/search) ---
    if (msg.pattern) {
      for await (const k of redisClient.scanIterator({ MATCH: msg.pattern })) {
        await redisClient.unlink(k); // non-blocking
      }
    }

    console.log("[CACHE INVALIDATION] Keys cleared:", msg.keys || msg.pattern);
  } catch (e) {
    console.error("[CACHE INVALIDATION] Invalid message:", e);
  }
});

// -------------------------
// 4️⃣ Update cache tổng quát
// -------------------------
const updateCacheResource = async ({
  resource,
  idOrQuery,
  newData,
  userIds = [],
  ttl = 3600,
}) => {
  await publishInvalidationResource({ resource, idOrQuery, userIds });

  // 2) Set cache mới nếu có
  if (newData) {
    const keysToSet = [];
    switch (resource) {
      case "song":
        keysToSet.push(keys.songMeta(idOrQuery), keys.topSongs());
        keysToSet.push(...userIds.map((u) => keys.songList(1, 20, u)));
        break;
      case "album":
        keysToSet.push(keys.album(idOrQuery));
        keysToSet.push(...userIds.map((u) => keys.albumList(1, 20, u)));
        break;
      case "artist":
        keysToSet.push(keys.artist(idOrQuery));
        keysToSet.push(...userIds.map((u) => keys.artistList(1, 20, u)));
        break;
      case "search":
        keysToSet.push(keys.search(idOrQuery));
        break;
      case "autocomplete":
        keysToSet.push(keys.autocomplete(idOrQuery));
        break;
      case "topSongs":
        keysToSet.push(keys.topSongs());
        break;
    }

    for (const k of keysToSet) {
      redisClient.set(k, JSON.stringify(newData), { EX: ttl });
    }
  }
};

const delByPattern = async (pattern) => {
  console.log("🚀 ~ delByPattern ~ pattern:", pattern);

  try {
    const iter = redisClient.scanIterator({
      MATCH: pattern,
      COUNT: 100,
    });

    for await (const key of iter) {
      console.log("🚀 Deleting key:", key);
      await redisClient.del(key); // đúng cú pháp
    }
  } catch (err) {
    console.error("❌ Error in delByPattern:", err);
  }
};

export default {
  redisClient,
  keys,
  safeParse,
  safeStringify,
  redisSub,
  setCache,
  getCache,
  getOrSetCache,
  publishInvalidation,
  publishInvalidationResource,
  updateCacheResource,
  delByPattern,
};
