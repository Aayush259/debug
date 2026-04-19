/**
 * @file redis.ts
 * @description Centralized Redis connection management for the Krvyu platform.
 * 
 * CORE CONCEPT:
 * This file initializes the primary Redis client instance used across the 
 * backend for real-time operations, specifically Pub/Sub messaging.
 * 
 * Usage:
 * 1. Shared Connection: Provides a central `connection` instance used by 
 *    the `redisSubscriber` and various background workers (like `logWorker`).
 * 2. Configuration: Leverages the project's centralized `config` to 
 *    establish a connection with the appropriate host and port.
 * 3. Event Distribution: Serves as the backbone for real-time AI insight 
 *    notifications, enabling the server to push events to the **Krvyu Frontend**.
 */

import Redis from "ioredis";
import config from "../../config/config.js";

/**
 * redisOptions
 * Configuration object for the ioredis client.
 */
const redisOptions = {
    host: config.redis_host,
    port: parseInt(config.redis_port),
    maxRetriesPerRequest: null,
};

/**
 * connection
 * The primary exported Redis client instance.
 */
export const connection = new Redis(redisOptions);

connection.on("connect", () => {
    console.log(" => [LIB: redis] Connected to Redis successfully.");
});

connection.on("error", (error) => {
    console.error(" => [LIB ERROR: redis] Redis connection error:", error);
});
