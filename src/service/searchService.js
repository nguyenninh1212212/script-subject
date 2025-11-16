import { Client } from "@elastic/elasticsearch";
import { getUrlCloudinary } from "../util/cloudinary.js";
import { transformPropertyInList } from "../util/help.js";
import dotenv from "dotenv";
dotenv.config();

const client = new Client({
  node: process.env.ELASTIC_URL, // Đảm bảo ES đang chạy ở đây
});
const searchData = async (queryText) => {
  try {
    const indexes = ["artists", "songs"];
    const existingIndexes = [];

    // Kiểm tra xem index nào đang tồn tại
    for (const index of indexes) {
      const exists = await client.indices.exists({ index });
      if (exists) existingIndexes.push(index);
    }

    // Nếu không có index nào -> trả về rỗng
    if (existingIndexes.length === 0) {
      return { artists: [], songs: [] };
    }

    // Tìm kiếm trên tất cả index có sẵn
    const response = await client.search({
      index: existingIndexes,
      query: {
        multi_match: {
          query: queryText,
          fields: ["title", "name"], // 'title' cho songs, 'name' cho artists
          fuzziness: "AUTO",
        },
      },
    });

    // Gom kết quả theo index
    let artists = [];
    let songs = [];

    for (const hit of response.hits?.hits || []) {
      const doc = { id: hit._id, ...hit._source }; // thêm id từ Elasticsearch
      if (hit._index === "artists") {
        artists.push(doc);
      } else if (hit._index === "songs") {
        songs.push(doc);
      }
    }

    // Transform coverImage / avatarUrl cùng lúc
    [songs, artists] = await Promise.all([
      transformPropertyInList(songs, ["coverImage"], getUrlCloudinary),
      transformPropertyInList(artists, ["avatarUrl"], getUrlCloudinary),
    ]);

    return { artists, songs };
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
      refresh: "wait_for", // Đảm bảo xóa xong là có hiệu lực ngay
    });

    console.log(`Xóa tài liệu ID: ${id} thành công!`, response);
    return response;
  } catch (error) {
    if (error.statusCode === 404) {
      console.warn(`Không tìm thấy tài liệu ID: ${id} để xóa.`);
    } else {
      console.error("Lỗi khi xóa tài liệu:", error);
    }
  }
};

export { searchData, addDataElastic, deleteDataElastic };
