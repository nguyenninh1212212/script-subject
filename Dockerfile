# --- Giai đoạn 1: Build dependencies ---
FROM node:20-alpine AS builder

# Thiết lập thư mục làm việc
WORKDIR /app

# Sao chép file định nghĩa package để cache npm install
COPY package*.json ./

# Cài dependencies (bao gồm devDependencies nếu có build)
RUN npm ci

# Sao chép toàn bộ mã nguồn vào container
COPY . .

# Nếu có TypeScript hoặc build step (ví dụ React server, Prisma generate...)
# RUN npm run build


# --- Giai đoạn 2: Production runtime ---
FROM node:20-alpine

WORKDIR /app

# Chỉ copy file package để cài đúng dependencies
COPY package*.json ./

# Cài đặt dependencies production (omit dev)
RUN npm ci --omit=dev

# Sao chép output từ giai đoạn builder
COPY --from=builder /app ./

# Nếu bạn có thư mục build (TypeScript hoặc Babel)
# COPY --from=builder /app/dist ./dist

# Mở port ứng dụng
EXPOSE 8000

# Đảm bảo khi container restart thì code mới nhất được dùng
# (Cách chuẩn là dùng bind mount khi dev)
# => Ví dụ docker run -v $(pwd):/app ...

# Lệnh khởi chạy
CMD [ "node", "./bin/www" ]
