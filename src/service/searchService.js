import { Client } from "@elastic/elasticsearch";

const client = new Client({
  node: "http://localhost:9200", // Đảm bảo ES đang chạy ở đây
});
const searchData = async (queryText) => {
  try {
    const indexes = ["artists", "songs"];
    const existingIndexes = [];

    for (const index of indexes) {
      const exists = await client.indices.exists({ index });
      if (exists) existingIndexes.push(index);
    }

    if (existingIndexes.length === 0) return [];

    const response = await client.search({
      index: existingIndexes,
      query: {
        multi_match: {
          query: queryText,
          fields: ["title", "name"],
          fuzziness: "AUTO",
        },
      },
    });

    return response.hits?.hits?.map((hit) => hit._source) || [];
  } catch (error) {
    console.error("❌ Lỗi khi tìm kiếm:", error.message);
    return [];
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
