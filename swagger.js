import swaggerAutogen from "swagger-autogen";
import dotenv from "dotenv";

dotenv.config();

const swagger = swaggerAutogen(); // tạo instance

const doc = {
  info: {
    title: "API Documentation",
    description: "Swagger cho Node.js Express",
  },
  host: `${process.env.DB_HOST}:${process.env.PORT}`,
  schemes: ["http"],
  securityDefinitions: {
    bearerAuth: {
      type: "apiKey",
      name: "Authorization",
      in: "header",
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

export const outputFile = "./swagger-output.json";
const endpointsFiles = ["./src/routes/index.js"];

// Tạo file swagger JSON
swagger(outputFile, endpointsFiles, doc).then(() => {
  console.log("Swagger JSON generated!");
});
