// swagger.js
const swaggerAutogen = require("swagger-autogen")();
require("dotenv").config();
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

const outputFile = "./swagger-output.json";
const endpointsFiles = ["./src/routes/index.js"];

swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
  console.log("Swagger JSON generated!");
});

module.exports = { outputFile };
