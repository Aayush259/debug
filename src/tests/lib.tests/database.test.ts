/**
 * @file database.test.ts
 * @description Infrastructure health checks for Mongoose and the native MongoDB driver.
 * 
 * CORE CONCEPT:
 * This test suite validates the "foundation" of the Krvyu platform. It ensures 
 * that our dual-layer database approach (Mongoose for domain models and 
 * MongoClient for auth) is correctly connected and synchronized.
 */

import mongoose from "mongoose";
import { db } from "../../lib/database/db.js";
import { connectDB } from "../../lib/database/database.js";
import config from "../../config/config.js";

describe("Database Infrastructure", () => {

    /**
     * TEST: Mongoose Connection Health
     * Verifies that the connectDB function (called in setup.ts) successfully 
     * established a Mongoose connection.
     */
    it("should have an active Mongoose connection", async () => {
        // Ensure connectDB is called (should return early since setup.ts already ran it)
        await connectDB();

        expect(mongoose.connection.readyState).toBe(1); // 1 = connected
        expect(mongoose.connection.db?.databaseName).toBe(config.mongo_db_name);
    });

    /**
     * TEST: Native Driver Health (db.ts)
     * Verifies that the MongoClient used by better-auth is functional 
     * and can communicate with the server.
     */
    it("should have a functional native driver (MongoClient)", async () => {
        // We perform a low-level command to verify connectivity
        const adminDb = db.admin();
        const info = await adminDb.ping();

        expect(info).toBeDefined();
        expect(info.ok).toBe(1);
    });

    /**
     * TEST: Data Source Synchronization
     * Ensures both Mongoose and the raw driver are looking at the 
     * same underlying database.
     */
    it("should point both Mongoose and the raw driver to the same database", () => {
        const mongooseDbName = mongoose.connection.db?.databaseName;
        const nativeDbName = db.databaseName;

        expect(mongooseDbName).toBe(nativeDbName);
        expect(nativeDbName).toBe(config.mongo_db_name);
    });
});
