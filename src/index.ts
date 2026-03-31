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
