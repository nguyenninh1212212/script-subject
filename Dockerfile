# --- Giai đoạn 1: "Build" ---
# Sử dụng image Node.js 20 (bản LTS) làm image cơ sở
# Đặt tên giai đoạn này là "builder"
FROM node:20-alpine AS builder

# Thiết lập thư mục làm việc bên trong container
WORKDIR /app

# Sao chép file package.json và package-lock.json (hoặc yarn.lock)
COPY package*.json ./

# Cài đặt tất cả dependencies (bao gồm devDependencies để build nếu cần)
RUN npm install

# Sao chép toàn bộ mã nguồn còn lại của dự án vào
COPY . .

# (Tùy chọn) Nếu dự án của bạn dùng TypeScript hoặc cần build
# Hãy thêm lệnh build của bạn ở đây. Ví dụ:
# RUN npm run build

# --- Giai đoạn 2: "Production" ---
# Bắt đầu lại từ một image node-alpine mới, sạch và nhẹ
FROM node:20-alpine

WORKDIR /app

# Sao chép file package.json và package-lock.json
COPY package*.json ./

# Chỉ cài đặt dependencies cần thiết cho production
RUN npm install --omit=dev

# Sao chép mã nguồn đã build (nếu có) hoặc mã nguồn .js từ giai đoạn "builder"
# Nếu bạn có bước RUN npm run build ở trên, bạn sẽ copy thư mục build (ví dụ: /app/dist)
# COPY --from=builder /app/dist ./dist

# Nếu app của bạn là JavaScript thuần (không build), copy như sau:
COPY --from=builder /app .

# Mở port mà ứng dụng của bạn đang chạy (thay 3000 bằng port của bạn)
EXPOSE 8000

# Lệnh để khởi chạy ứng dụng
# Dựa trên log lỗi của bạn, có vẻ bạn dùng "bin/www" để khởi động
CMD [ "node", "./bin/www" ]