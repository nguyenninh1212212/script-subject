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
  try {
    const normalizedQuery = normalizeTextForAutocomplete(queryText);
    const cacheKey = keys.search(`${normalizedQuery}:${from}:${size}`);
    return getOrSetCache(
      cacheKey,
      async () => {
        const indexes = ["artists", "songs"];
        const existingIndexes = [];

        for (const index of indexes) {
          const exists = await client.indices.exists({ index });
          console.log("🚀 ~ searchData ~ exists:", exists);
          if (exists) existingIndexes.push(index);
        }

        if (existingIndexes.length === 0) return { artists: [], songs: [] };

        const response = await client.search({
          index: existingIndexes,
          from,
          size,
          query: {
            bool: {
              should: [
                // Tìm kiếm chính xác (boost cao nhất)
                {
                  multi_match: {
                    query: normalizedQuery,
                    fields: ["name^3", "title^3", "autocomplete^2"],
                    type: "phrase",
                    boost: 3,
                  },
                },
                // Tìm kiếm wildcard - giống LIKE '%keyword%'
                {
                  multi_match: {
                    query: `*${normalizedQuery}*`,
                    fields: ["name.keyword", "title.keyword"],
                    boost: 2,
                  },
                },
                // Tìm kiếm prefix - giống LIKE 'keyword%'
                {
                  multi_match: {
                    query: normalizedQuery,
                    fields: ["name", "title", "autocomplete"],
                    type: "phrase_prefix",
                    boost: 1.5,
                  },
                },
                // Tìm kiếm với fuzziness
                {
                  multi_match: {
                    query: normalizedQuery,
                    fields: ["name", "title", "autocomplete"],
                    fuzziness: "AUTO",
                    operator: "or", // Đổi thành "or" để linh hoạt hơn
                    boost: 1,
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        });

        console.log("🚀 ~ searchData ~ response:", response);

        let artists = [];
        let songs = [];

        for (const hit of response.hits?.hits || []) {
          const doc = { id: hit._id, ...hit._source };
          if (hit._index === "artists") artists.push(doc);
          else if (hit._index === "songs") songs.push(doc);
        }

        // --- Transform URL ---
        [songs, artists] = await Promise.all([
          transformPropertyInList(songs, ["coverImage"], getUrlCloudinary),
          transformPropertyInList(artists, ["avatarUrl"], getUrlCloudinary),
        ]);

        const result = { artists, songs };

        redisClient.set(cacheKey, safeStringify(result), {
          EX: SEARCH_CACHE_TTL,
        });

        return result;
      },
      3600
    );
  } catch (error) {
    console.error("❌ Lỗi khi tìm kiếm:", error.message);
    return { artists: [], songs: [] };
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
