import { Client } from "@elastic/elasticsearch";
import { getUrlCloudinary } from "../util/cloudinary.js";
import { transformPropertyInList } from "../util/help.js";
import dotenv from "dotenv";
import clientAudio from "../grpc/audioSearch.js";
import { promisify } from "util";
import { Song } from "../model/entity/index.js";
import redis from "../config/redis.config.js";
import { normalizeTextForAutocomplete } from "../util/help.js";

dotenv.config();

const AUTOCOMPLETE_CACHE_TTL = 3000;
const SEARCH_CACHE_TTL = 3000;

const client = new Client({
  node: process.env.ELASTIC_URL,
});
const { keys, redisClient, redisSub, getOrSetCache, safeParse, safeStringify } =
  redis;

const searchData = async (queryText, { from = 0, size = 30 } = {}) => {
  console.log("🚀 ~ searchData ~ queryText:", queryText);
  try {
    const normalizedQuery = queryText;
    console.log("🚀 ~ searchData ~ normalizedQuery:", normalizedQuery);
    const cacheKey = keys.search(`${normalizedQuery}:${from}:${size}`);

    return getOrSetCache(
      cacheKey,
      async () => {
        const indexes = ["artists", "songs"];
        const existingIndexes = [];

        // --- Kiểm tra Index Tồn tại (Giữ nguyên) ---
        for (const index of indexes) {
          const exists = await client.indices.exists({ index });
          if (exists) existingIndexes.push(index);
        }

        if (existingIndexes.length === 0)
          return { artists: [], songs: [], suggestions: [] };

        const response = await client.search({
          index: existingIndexes,
          from,
          size,

          // 1. KHỐI SUGGEST: Dùng để truy vấn trường 'autocomplete' (type: completion)
          suggest: {
            "all-autocomplete": {
              prefix: normalizedQuery,
              completion: {
                field: "autocomplete", // Áp dụng Suggester cho tất cả các index
                size: 10,
              },
            },
          },

          // 2. KHỐI QUERY: Dùng cho tìm kiếm chính xác, prefix, fuzziness (trên các trường TEXT)
          query: {
            bool: {
              should: [
                // A. MATCH CHÍNH XÁC & KEYWORD (Boost cao nhất)
                {
                  multi_match: {
                    query: normalizedQuery,
                    // Giữ '.keyword' cho artists. Khả năng cao 'songs' chỉ có 'title' thường.
                    fields: ["name.keyword^5", "title.keyword^5", "title^4"],
                    type: "best_fields",
                    boost: 5,
                  },
                },
                // B. PHRASE PREFIX (Loại bỏ 'autocomplete' để tránh lỗi)
                {
                  multi_match: {
                    query: normalizedQuery,
                    // Chỉ tìm kiếm trên các trường text an toàn: 'name' và 'title'
                    fields: ["name^3", "title^3"],
                    type: "phrase_prefix",
                    boost: 3,
                  },
                },
                // C. FUZZINESS (Xử lý lỗi chính tả, cũng loại bỏ 'autocomplete')
                {
                  multi_match: {
                    query: normalizedQuery,
                    fields: ["name", "title"], // Chỉ tìm kiếm trên name và title
                    fuzziness: "AUTO",
                    operator: "and",
                    boost: 1,
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        });

        // console.log("🚀 ~ searchData ~ response:", response);

        let artists = [];
        let songs = [];
        let suggestions = [];
        console.log(response.hits?.hits);

        // --- Xử lý Kết quả Tìm kiếm (Hits) ---
        for (const hit of response.hits?.hits || []) {
          const doc = { id: hit._id, ...hit._source };
          if (hit._index === "artists") artists.push(doc);
          else if (hit._index === "songs") songs.push(doc);
        }

        // --- Xử lý Kết quả Gợi ý (Suggestions) ---
        // Lấy các gợi ý từ block 'suggest'
        suggestions =
          response.suggest?.["all-autocomplete"]?.[0]?.options.map((opt) => ({
            text: opt.text,
            index: opt._index,
            source: opt._source,
          })) || [];

        // --- Transform URL (Giữ nguyên) ---
        [songs, artists] = await Promise.all([
          transformPropertyInList(songs, ["coverImage"], getUrlCloudinary),
          transformPropertyInList(artists, ["avatarUrl"], getUrlCloudinary),
        ]);

        const result = { artists, songs, suggestions }; // Thêm suggestions vào kết quả

        return result;
      },
      3600
    );
  } catch (error) {
    console.error("❌ Lỗi khi tìm kiếm:", error.message);
    return { artists: [], songs: [], suggestions: [] };
  }
};

const addDataElastic = async (doc, id, index) => {
  try {
    const response = await client.index({
      index: index,
      id: id,
      document: doc,
      refresh: "wait_for",
    });
    return response;
  } catch (error) {
    console.error("Lỗi khi thêm tài liệu:", error);
  }
};

const deleteDataElastic = async (id, index) => {
  try {
    const response = await client.delete({
      index: index,
      id: id,
      refresh: "wait_for",
    });

    return response;
  } catch (error) {
    if (error.statusCode === 404) {
      console.warn(`Không tìm thấy tài liệu ID: ${id} để xóa.`);
    } else {
      console.error("Lỗi khi xóa tài liệu:", error);
    }
  }
};

const searchAudio = async (audioFile) => {
  const request = { audio: audioFile.buffer };
  const SearchSongAsync = promisify(clientAudio.SearchSong.bind(clientAudio));
  const song = await SearchSongAsync(request).catch((error) => {
    console.error("Error embedding song:", error);
  });

  if (!song) return null;

  const data = await Song.findByPk(song.songId, {
    attributes: ["title", "id", "coverImage"],
  });
  if (!data) return null;

  data.coverImage = data?.coverImage
    ? await getUrlCloudinary(data.coverImage)
    : null;

  const key = redis.keys.waveform(song.songId);

  return redis.getOrSetCache(key, async () => data);
};

const autocomplete = async (q, size = 20) => {
  const normalized = q.trim().toLowerCase();
  const key = keys.autocomplete(normalized + ":" + size);
  const cached = await redisClient.get(key);
  if (cached) return safeParse(cached);

  const indexes = ["artists", "songs"];

  const resp = await client.search({
    index: indexes.join(","),
    size,
    query: {
      match_phrase_prefix: {
        autocomplete: normalized,
      },
    },
    _source: ["title", "name", "coverImage", "autocomplete"], // các field cần
  });

  // Map kết quả
  const suggestions = resp.hits.hits.map((h) => ({
    id: h._id,
    ...h._source,
  }));

  // Lưu vào Redis
  await redisClient.set(key, safeStringify(suggestions), {
    EX: AUTOCOMPLETE_CACHE_TTL,
  });

  return suggestions;
};

export {
  searchData,
  addDataElastic,
  deleteDataElastic,
  searchAudio,
  autocomplete,
};
