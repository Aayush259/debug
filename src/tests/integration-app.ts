/**
 * @file integration-app.ts
 * @description Replicated Express application for integration testing.
 * 
 * CORE CONCEPT:
 * To perform integration testing with Supertest WITHOUT modifying index.ts 
 * (to avoid triggering server.listen), we recreate the application wiring here.
 * This ensures we test the actual Routes, Middlewares, and Controllers.
 */

import express from "express";
import { auth } from "../lib/auth.js";
import { toNodeHandler } from "better-auth/node";
import secretKeyRoutes from "../routes/secretKeyRoutes.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import projectLogsRoutes from "../routes/projectLogsRoutes.js";
import userSettingsRoutes from "../routes/userSettingsRoutes.js";
import logsDebugRoutes from "../routes/logsDebugRoutes.js";
import billingRoutes from "../routes/billingRoutes.js";
import { saveProjectLogs } from "../controllers/projectLogsControllers.js";
import { handleLemonWebhook } from "../controllers/billingController.js";

const app = express();

// Mock Socket.IO for testing
const mockIo = {
    to: vi.fn().mockReturnThis(),
    emit: vi.fn().mockReturnThis(),
};
app.set("io", mockIo);

// 1. Webhook Integration (Raw Body)
app.post("/webhooks/lemonsqueezy", express.raw({ type: "application/json" }), handleLemonWebhook);

// 2. Auth Handlers
app.use("/api/auth", toNodeHandler(auth));

// 3. Global Middleware
app.use(express.json());

// 4. Route Registration (matching index.ts)
app.use("/api/secret-key", requireAuth, secretKeyRoutes);
app.use("/api/project-logs", requireAuth, projectLogsRoutes);
app.use("/api/user-settings", requireAuth, userSettingsRoutes);
app.use("/api/ai-insights", requireAuth, logsDebugRoutes);
app.use("/api/billing", requireAuth, billingRoutes);

app.post("/api/logs/:keyId", saveProjectLogs);

app.get("/", (req, res) => {
    res.send("Hello world!");
});

export { app, mockIo };
