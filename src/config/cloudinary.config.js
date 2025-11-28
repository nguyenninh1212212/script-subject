// Require the cloudinary library
import cloudinary from "cloudinary";
const client = cloudinary.v2;

client.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_KEY,
  api_secret: process.env.CLOUD_SECRET,
});

export default client;
