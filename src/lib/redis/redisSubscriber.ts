/**
 * @file redisSubscriber.ts
 * @description Real-time bridge between background analysis and the Krvyu console.
 * 
 * CORE CONCEPT:
 * The Redis Subscriber is a critical component for the platform's "real-time" 
 * value proposition. It listens for events published by background workers 
 * (like the logWorker) and immediately pushes them to the **Krvyu Frontend**.
 * 
 * Data Flow:
 * 1. Listening: Subscribes to the `ai-insight-channel` in Redis.
 * 2. Interception: When a worker finishes an AI analysis, it publishes a 
 *    message containing the `userId` and the new `insight`.
 * 3. Emission: The subscriber parses the message and uses Socket.IO to 
 *    emit a `NEW_AI_INSIGHT` event to the specific user's web session.
 * 4. Experience: This enables the "Instant Resolve" experience where 
 *    developers see AI insights pop up on their dashboard without refreshing.
 */

import { Server } from "socket.io";
import { connection } from "./redis.js";
import { EVENTS } from "../utils.js";

/**
 * setupRedisSubscriber
 * Configures the real-time listener for AI insights.
 * 
 * @param io - The Socket.IO server instance responsible for client communication.
 */
export const setupRedisSubscriber = (io: Server) => {
    // Create a duplicate connection specifically for subscribing (Redis requirement)
    const subscriber = connection.duplicate();

    subscriber.subscribe("ai-insight-channel", (err, count) => {
        if (err) {
            console.error(" => [LIB ERROR: redisSubscriber] Failed to subscribe to AI insight channel:", err);
            return;
        }
        console.log(` => [LIB: redisSubscriber] Subscribed to ${count} channel(s).`);
    });

    subscriber.on("message", (channel, message) => {
        if (channel === "ai-insight-channel") {
            try {
                const { userId, insight } = JSON.parse(message);

                console.log(` => [LIB: redisSubscriber] Intercepted Redis Pub/Sub message on 'ai-insight-channel'. Emitting 'NEW_AI_INSIGHT' to Socket Room: ${userId}`);

                // Emit the new insight only to the specific user's room
                io.to(userId).emit(EVENTS.NEW_AI_INSIGHT, insight);

                console.log(` => [LIB: redisSubscriber] Successfully delivered AI Insight to client!`);
            } catch (error) {
                console.error(" => [LIB ERROR: redisSubscriber] Error processing Redis pub/sub message:", error);
            }
        }
    });
};
