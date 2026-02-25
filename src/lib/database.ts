import mongoose from "mongoose";
import config from "../config/config.js";

const MONGODB_URI = config.mongo_uri;

if (!MONGODB_URI) {
    throw new Error("Please define the MONGO_URI environment variable");
}

let isConnected = false;

/**
 * Connects to MongoDB using Mongoose.
 * Implements a singleton pattern to prevent multiple connections during hot-reloads
 * or if called multiple times in controllers.
 */
export const connectDB = async () => {
    mongoose.set("strictQuery", true);

    // Return early if already connected
    if (isConnected) {
        console.log("=> Using existing database connection");
        return;
    }

    // If mongoose has already an active connection, use it
    if (mongoose.connection.readyState === 1) {
        isConnected = true;
        console.log("=> Using active mongoose connection");
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
        console.log("=> MongoDB connected successfully (Mongoose)");
    } catch (error) {
        console.error("=> MongoDB connection error:", error);
        throw new Error("Failed to connect to MongoDB");
    }
};

// Handle connection events for robustness
mongoose.connection.on("disconnected", () => {
    console.warn("=> MongoDB disconnected!");
    isConnected = false;
});

mongoose.connection.on("error", (err) => {
    console.error("=> MongoDB connection error:", err);
});
