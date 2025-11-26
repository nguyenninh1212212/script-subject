export const toMidnight = (date) => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export const transformPropertyInList = async (
  items,
  keyToTransforms = [],
  asyncTransformFn
) => {
  if (!Array.isArray(items)) return [];

  const transformedItems = await Promise.all(
    items.map(async (item) => {
      if (!item) return null;

      const transformed = { ...item };

      await Promise.all(
        keyToTransforms.map(async (key) => {
          const originalValue = item[key];
          if (originalValue !== undefined && originalValue !== null) {
            transformed[key] = await asyncTransformFn(originalValue, key);
          }
        })
      );

      return transformed;
    })
  );

  return transformedItems;
};

export const parseDateDMY = (dateStr) => {
  if (!dateStr) return null;

  // Chấp nhận cả dd-mm-yy và dd-mm-yyyy
  const parts = dateStr.split("-");
  if (parts.length < 3) return null;

  let [day, month, year] = parts.map((p) => parseInt(p, 10));

  // Nếu là 2 chữ số (vd 25-10-25), tự hiểu là 20xx
  if (year < 100) {
    year += 2000;
  }

  // JS month bắt đầu từ 0
  return new Date(year, month - 1, day);
};

export function normalizeTextForAutocomplete(text) {
  return text
    .normalize("NFD") // tách dấu ra
    .replace(/[\u0300-\u036f]/g, "") // loại bỏ dấu
    .replace(/[^a-zA-Z0-9]/g, "") // loại bỏ ký tự đặc biệt & khoảng trắng
    .toLowerCase();
}

export const cosineSimilarity = (vecA, vecB) => {
  const dot = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
  const magB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
  return dot / (magA * magB);
};
