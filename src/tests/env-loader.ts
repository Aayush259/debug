/**
 * @file env-loader.ts
 * @description Synchronous-style environment loader for Vitest.
 */

import dotenv from "dotenv";
import { MongoMemoryServer } from "mongodb-memory-server";

// 1. Load the test environment FIRST.
dotenv.config({ path: ".env.test", override: true });

// 2. Initialize In-Memory MongoDB synchronously at module load time.
// This ensures process.env.MONGO_URI is set before any file that 
// imports this one proceeds to its next import.
export const mongod = await MongoMemoryServer.create();
process.env.MONGO_URI = mongod.getUri();
