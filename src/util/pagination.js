// helpers/pagination.js
const getPagination = (page, size) => {
  const limit = size ? +size : 10; // Mặc định 10 sản phẩm mỗi trang
  const offset = page ? (page - 1) * limit : 0;

  return { limit, offset };
};

const getPagingData = (data, page, limit) => {
  const { count: totalItems, rows: items } = data;
  const currentPage = page ? +page : 1;
  const totalPages = Math.ceil(totalItems / limit);

  return { totalItems, items, totalPages, currentPage };
};

export { getPagination, getPagingData };
