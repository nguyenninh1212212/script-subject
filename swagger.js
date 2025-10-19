// src/swagger/swagger.js
import swaggerAutogen from "swagger-autogen";
import dotenv from "dotenv";

dotenv.config();

const swagger = swaggerAutogen({ openapi: "3.0.0" }); // auto-gen dùng chuẩn OpenAPI 3.0

const doc = {
  info: {
    title: "Music API 🎵",
    description: "API quản lý bài hát, playlist và nghệ sĩ.",
    version: "1.0.0",
  },
  host: `${process.env.HOSTPORT}`,
  schemes: ["https"],
  tags: [
    { name: "User", description: "Đăng ký, đăng nhập, thông tin người dùng" },
    { name: "Artist", description: "Quản lý nghệ sĩ" },
    { name: "Song", description: "Quản lý bài hát" },
    { name: "Playlist", description: "Quản lý playlist" },
    { name: "Album", description: "" },
    { name: "Payment", description: "Thanh toán và gói dịch vụ" },
    { name: "Ads", description: "Quảng cáo" },
    { name: "Subscription", description: "" },
    { name: "Subscription plan", description: "" },
  ],
  securityDefinitions: {
    bearerAuth: {
      type: "apiKey",
      name: "Authorization",
      in: "header",
    },
  },
  components: {
    schemas: {
      PaymentType: {
        type: "string",
        enum: ["subscription", "album", "renewSubscription"],
      },
    },
  },
  security: [{ bearerAuth: [] }],
};

export const outputFile = "./swagger-output.json";
export const endpointsFiles = ["./src/routes/index.js"];

swagger(outputFile, endpointsFiles, doc).then(() => {
  console.log("✅ Swagger JSON generated!");
});
