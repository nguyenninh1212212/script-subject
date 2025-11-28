import amqp from "amqplib";
import dotenv from "dotenv";
dotenv.config();

const RABBIT_URL = process.env.RABBIT_URL; // hoặc URL RabbitMQ cloud
let channel;

const initRabbit = async () => {
  if (channel) return channel; // reuse
  const conn = await amqp.connect(RABBIT_URL);
  channel = await conn.createChannel();
  return channel;
};

const sendMessage = async (queue, message) => {
  const channel = await initRabbit();
  await channel.assertQueue(queue, { durable: true });
  channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
    persistent: true, // để message không mất khi RabbitMQ restart
  });
  console.log("Sent message:", message);
};

export { initRabbit, sendMessage };
