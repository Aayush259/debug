/**
 * @file index.ts
 * @description Application entry point and main bootstrap orchestrator.
 * 
 * CORE CONCEPT:
 * This file is the central "wiring" hub of the Zag Backend. It initializes 
 * the Express server and bootstraps all critical internal services (Database, 
 * Redis, Sockets, and Background Workers).
 * 
 * Orchestration Responsibilities:
 * 1. Server Bootstrap: Initializes the Express and HTTP servers on the 
 *    configured port.
 * 2. Real-Time Setup: Configures the Socket.IO server and binds it to the 
 *    Express application for centralized access via `app.get("io")`.
 * 3. Connection Management: Establishes connections to MongoDB (Mongoose) 
 *    and Redis (via the Subscriber bootstrap).
 * 4. Security & Auth: Configures global CORS policies and initializes the 
 *    Better Auth session handlers for both REST and WebSocket layers.
 * 5. Route Registration: Hooks up all domain-specific routes (Secrets, 
 *    Logs, Settings, Insights) and the Public Ingestion endpoint.
 * 6. Worker Invocation: Triggers the native initialization of the 
 *    `logWorker` to begin processing the AI queue.
 * 
 * Infrastructure:
 * - Framework: Express.js + Socket.IO.
 * - Middleware: CORS, express.json(), better-auth.
 */

import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import { auth } from "./lib/auth.js";
import config from "./config/config.js";
import { createServer } from "node:http";
import { connectDB } from "./lib/database.js";
import { toNodeHandler } from "better-auth/node";
import secretKeyRoutes from "./routes/secretKeyRoutes.js";
import { requireAuth } from "./middleware/authMiddleware.js";
import projectLogsRoutes from "./routes/projectLogsRoutes.js";
import userSettingsRoutes from "./routes/userSettingsRoutes.js";
import logsDebugRoutes from "./routes/logsDebugRoutes.js";
import { setupSocketHandlers, SocketData } from "./socket/index.js";
import { setupRedisSubscriber } from "./lib/redisSubscriber.js";
import { saveProjectLogs } from "./controllers/projectLogsControllers.js";
import "./lib/workers/logWorker.js"; // Initialize background worker natively

const app = express();
const server = createServer(app);

// Socket.IO server with CORS
const io = new Server<any, any, any, SocketData>(server, {
    cors: {
        origin: config.frontend_url,
        credentials: true,
    },
});

// CORS for Express
app.use(cors({
    origin: config.frontend_url,
    credentials: true,
}));

app.set("io", io);

app.get("/", (req, res) => {
    res.send("Hello world!");
});

// Authentication handled by better-auth
app.use("/api/auth", toNodeHandler(auth));

app.use(express.json());    // Parse JSON request bodies middleware
app.use("/api/secret-key", requireAuth, secretKeyRoutes);  // Secret key routes
app.use("/api/project-logs", requireAuth, projectLogsRoutes);  // Project logs routes
app.use("/api/user-settings", requireAuth, userSettingsRoutes);  // User settings routes
app.use("/api/ai-insights", requireAuth, logsDebugRoutes);  // AI insights routes

app.post("/api/logs/:keyId", saveProjectLogs);  // Save project logs (for client's project to send logs)

// Socket.IO middleware for authentication
io.use(async (socket, next) => {
    try {
        const webHeaders = new Headers();
        for (const [key, value] of Object.entries(socket.request.headers)) {
            if (value !== undefined) {
                if (Array.isArray(value)) {
                    value.forEach((v) => webHeaders.append(key, v));
                } else {
                    webHeaders.append(key, value);
                }
            }
        }

        const sessionPayload = await auth.api.getSession({
            headers: webHeaders,
        });

        if (!sessionPayload) {
            return next(new Error("Unauthorized"));
        }

        socket.data.user = sessionPayload.user;
        socket.data.session = sessionPayload.session;
        next();
    } catch (error) {
        next(new Error("Internal Server Error"));
    }
});

setupSocketHandlers(io);
setupRedisSubscriber(io); // Attach custom AI insight Redis subscriber to Socket

server.listen(config.port, async () => {
    await connectDB();
    console.log("Server running on port", config.port);
});
