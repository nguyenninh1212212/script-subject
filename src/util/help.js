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
