/**
 * @file db.ts
 * @description Raw MongoDB driver connection for the Zag platform.
 * 
 * CORE CONCEPT:
 * This file initializes a low-level MongoDB connection using the native 
 * `MongoClient`. 
 * 
 * Usage:
 * 1. Auth Integration: Primarily used by the `better-auth` system to 
 *    manage sessions, accounts, and authentication data directly in MongoDB.
 * 2. Distinction: This is separate from the Mongoose connection (in `database.ts`) 
 *    which handles the project's domain models (Users, Logs, Insights).
 * 3. Configuration: Uses the project's centralized `config` to establish 
 *    the connection to the appropriate database name and URI.
 */

import { MongoClient } from "mongodb";
import config from "../config/config";

/**
 * client
 * The native MongoDB client instance.
 */
const client = new MongoClient(config.mongo_uri);

/**
 * db
 * The exported database instance for low-level collection access.
 */
export const db = client.db(config.mongo_db_name);
