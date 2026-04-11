/**
 * @file database.ts
 * @description Centralized Mongoose connection management for the Zag platform.
 * 
 * CORE CONCEPT:
 * This file serves as the primary gateway for Object-Relational Mapping (ORM) 
 * style database access. It initializes and manages the Mongoose connection 
 * used by all domain models (Users, ProjectLogs, AI Insights, etc.).
 * 
 * Implementation Details:
 * 1. Singleton Pattern: Ensures that only one database connection is active 
 *    at any time, preventing resource leakage during hot-reloads.
 * 2. Robustness: Includes event listeners for monitoring connection health 
 *    (e.g., handling unexpected disconnections).
 * 3. Configuration: Optimizes connection parameters (pool size, timeouts) 
 *    for a responsive SaaS environment.
 * 4. Separation of Concerns: This connection is dedicated to domain-level 
 *    data, while the raw driver (in `db.ts`) handles system-level authentication.
 */

import mongoose from "mongoose";
import config from "../../config/config.js";

const MONGODB_URI = config.mongo_uri;

if (!MONGODB_URI) {
    throw new Error("Please define the MONGO_URI environment variable");
}

let isConnected = false;

/**
 * connectDB
 * Initializes the Mongoose connection to MongoDB.
 */
export const connectDB = async () => {
    mongoose.set("strictQuery", true);

    // Return early if already connected
    if (isConnected) {
        console.log(" => [LIB: connectDB] Using existing database connection");
        return;
    }

    // If mongoose has already an active connection, use it
    if (mongoose.connection.readyState === 1) {
        isConnected = true;
        console.log(" => [LIB: connectDB] Using active mongoose connection");
        return;
    }

    try {
        const db = await mongoose.connect(MONGODB_URI, {
            dbName: config.mongo_db_name,
            maxPoolSize: 10, // Maintain up to 10 socket connections
            serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        });

        isConnected = !!db.connections[0].readyState;
        console.log(" => [LIB: connectDB] MongoDB connected successfully (Mongoose)");
    } catch (error) {
        console.error(" => [LIB ERROR: connectDB] MongoDB connection error:", error);
        throw new Error("Failed to connect to MongoDB");
    }
};

// Handle connection events for robustness
mongoose.connection.on("disconnected", () => {
    console.warn(" => [LIB: connectDB] MongoDB disconnected!");
    isConnected = false;
});

mongoose.connection.on("error", (err) => {
    console.error(" => [LIB ERROR: connectDB] MongoDB connection error:", err);
});
