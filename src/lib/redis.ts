import Redis from "ioredis";
import config from "../config/config.js";

// Optional: allow passing a custom REDIS_URL or fallback to localhost
const redisOptions = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: null,
};

export const connection = new Redis(redisOptions);

connection.on("connect", () => {
    console.log("Connected to Redis successfully.");
});

connection.on("error", (error) => {
    console.error("Redis connection error:", error);
});
