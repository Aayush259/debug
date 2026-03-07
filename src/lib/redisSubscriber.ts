import { Server } from "socket.io";
import { connection } from "./redis.js";
import { EVENTS } from "./utils.js";

/**
 * Subscribes to the Redis Pub/Sub channel for AI insights and forwards them 
 * directly to the connected Socket.IO clients.
 * 
 * @param io - The Socket.IO server instance
 */
export const setupRedisSubscriber = (io: Server) => {
    // Create a duplicate connection specifically for subscribing (Redis requirement)
    const subscriber = connection.duplicate();

    subscriber.subscribe("ai-insight-channel", (err, count) => {
        if (err) {
            console.error("Failed to subscribe to AI insight channel:", err);
            return;
        }
        console.log(`Subscribed to ${count} channel(s).`);
    });

    subscriber.on("message", (channel, message) => {
        if (channel === "ai-insight-channel") {
            try {
                const { userId, insight } = JSON.parse(message);

                console.log(`[Socket.IO Subscriber] 📩 Intercepted Redis Pub/Sub message on 'ai-insight-channel'. Emitting 'NEW_AI_INSIGHT' to Socket Room: ${userId}`);

                // Emit the new insight only to the specific user's room
                io.to(userId).emit(EVENTS.NEW_AI_INSIGHT, insight);

                console.log(`[Socket.IO Subscriber] 🟢 Successfully delivered AI Insight to client!`);
            } catch (error) {
                console.error("Error processing Redis pub/sub message:", error);
            }
        }
    });
};
