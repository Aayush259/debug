/**
 * @file index.ts
 * @description Application entry point and main bootstrap orchestrator.
 * 
 * CORE CONCEPT:
 * This file is the central "wiring" hub of the Krvyu Backend. It initializes 
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
 * 6. Webhook Integration: Implements raw-body capture for Lemon Squeezy 
 *    webhooks to enable cryptographic signature verification.
 * 7. Worker Invocation: Triggers the native initialization of the 
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
import fs from "node:fs";
import path from "node:path";
import { connectDB } from "./lib/database/database.js";
import { toNodeHandler } from "better-auth/node";
import secretKeyRoutes from "./routes/secretKeyRoutes.js";
import { requireAuth } from "./middleware/authMiddleware.js";
import projectLogsRoutes from "./routes/projectLogsRoutes.js";
import userSettingsRoutes from "./routes/userSettingsRoutes.js";
import logsDebugRoutes from "./routes/logsDebugRoutes.js";
import billingRoutes from "./routes/billingRoutes.js";
import { setupSocketHandlers, SocketData } from "./socket/index.js";
import { setupRedisSubscriber } from "./lib/redis/redisSubscriber.js";
import { saveProjectLogs } from "./controllers/projectLogsControllers.js";
import { handleLemonWebhook } from "./controllers/billingController.js";
import "./lib/workers/logWorker.js"; // Initialize background worker natively
import "./lib/workers/retentionWorker.js"; // Initialize retention worker natively
import { setupRetentionJob } from "./lib/queue/retentionQueue.js";
import { socketAuthMiddleware } from "./middleware/socketAuthMiddleware.js";

const app = express();
const server = createServer(app);

// --- WEBHOOK INTEGRATION ---
// Special Route: Lemon Squeezy Webhook
// CRITICAL: We use express.raw() here to capture the un-parsed body.
// This is required for crypto.timingSafeEqual verification of the HMAC signature 
// inside handleLemonWebhook. This MUST be mounted before the global express.json() parser.
app.post("/webhooks/lemonsqueezy", express.raw({ type: "application/json" }), handleLemonWebhook);

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
    try {
        const filePath = path.join(process.cwd(), "src", "forbidden.html");
        const html = fs.readFileSync(filePath, "utf-8");
        const renderedHtml = html.replace(/{{FRONTEND_URL}}/g, config.frontend_url);
        res.status(401).send(renderedHtml);
    } catch (error) {
        console.error("Error reading forbidden.html:", error);
        res.status(401).send("401 Forbidden");
    }
});

// Authentication handled by better-auth
app.use("/api/auth", toNodeHandler(auth));

// Global Middleware
// Standardizes request body parsing to JSON for all internal API routes.
// NOTE: Must be placed AFTER the /webhooks/lemonsqueezy raw-body route.
app.use(express.json());    // Parse JSON request bodies middleware
app.use("/api/secret-key", requireAuth, secretKeyRoutes);  // Secret key routes
app.use("/api/project-logs", requireAuth, projectLogsRoutes);  // Project logs routes
app.use("/api/user-settings", requireAuth, userSettingsRoutes);  // User settings routes
app.use("/api/ai-insights", requireAuth, logsDebugRoutes);  // AI insights routes
app.use("/api/billing", requireAuth, billingRoutes);    // Billing routes

app.post("/api/logs/:keyId", saveProjectLogs);  // Save project logs (for client's project to send logs)

// Socket.IO middleware for authentication
io.use(socketAuthMiddleware);

setupSocketHandlers(io);
setupRedisSubscriber(io); // Attach custom AI insight Redis subscriber to Socket

server.listen(config.port, async () => {
    await connectDB();
    await setupRetentionJob(); // Schedule the daily log cleanup job
    console.log(" > Server running on port", config.port);
});
