/**
 * @file socket/index.ts
 * @description Real-time delivery engine for live AI insights.
 * 
 * CORE CONCEPT:
 * This component manages the Socket.IO server, facilitating immediate, 
 * bidirectional communication between the Zag Backend and the Zag Frontend.
 * 
 * Responsibilities:
 * 1. Connection Management: Tracks active developer sessions and handles 
 *    WebSocket lifecycle events (connect, disconnect).
 * 2. Targeted Event Routing: Automatically joins each socket to a "room" 
 *    named after the User's ID (via `socket.join(userId)`). This allows the 
 *    `RedisSubscriber` to target real-time AI insights to specific developers.
 * 3. Identity Awareness: Extends the socket instance with validated user 
 *    and session data derived from the Better Auth system.
 * 
 * Workflow:
 * - When the `logWorker` finishes an analysis, it publishes to Redis.
 * - The `RedisSubscriber` receives the message and calls `io.to(userId).emit()`.
 * - The Zag Frontend receives the payload and updates the UI instantly.
 */

import { Server, Socket } from "socket.io";
import { EVENTS } from "../lib/utils.js";
import { auth } from "../lib/auth.js";

type SessionType = typeof auth.$Infer.Session;

export interface SocketData {
    user?: SessionType["user"];
    session?: SessionType["session"];
}

export const setupSocketHandlers = (io: Server<any, any, any, SocketData>) => {
    io.on(EVENTS.CONNECTION, (socket: Socket<any, any, any, SocketData>) => {
        const userId = socket.data.user?.id;
        console.log(" => [SOCKET: index] User connected", socket.id, "User ID:", userId);

        // Join the socket to a room with their user ID to allow direct messages
        if (userId) {
            socket.join(userId);
        }

        socket.on(EVENTS.DISCONNECT, () => {
            console.log(" => [SOCKET: index] User disconnected", socket.id);
        });
    });
};
