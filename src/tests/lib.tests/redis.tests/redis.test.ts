/**
 * @file redis.test.ts
 * @description Integration tests for real-time Pub/Sub and Redis connectivity.
 * 
 * CORE CONCEPT:
 * This suite validates the platform's real-time communication backbone. 
 * We use `ioredis-mock` to simulate a Redis server in-memory, allowing us 
 * to test the Subscriber pattern—from message interception to Socket.IO 
 * emission—without any external infrastructure.
 */

import { connection } from "../../../lib/redis/redis.js";
import { setupRedisSubscriber } from "../../../lib/redis/redisSubscriber.js";
import { EVENTS } from "../../../lib/utils.js";

describe("Redis & Subscriber Logic", () => {

    // Mock for Socket.IO Server
    const mockIo: any = {
        to: vi.fn().mockReturnThis(),
        emit: vi.fn(),
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        // Clear all data from mock Redis between tests
        await connection.flushall();
    });

    /**
     * TEST: Connection Lifecycle
     * Ensures the initialization logic for the Redis client is sound.
     */
    it("should establish a connection instance based on config", () => {
        expect(connection).toBeDefined();
    });

    /**
     * TEST: Real-time Pub/Sub Bridge
     * Simulates the full cycle: 
     * 1. Background worker publishes an insight to Redis.
     * 2. Subscriber intercepts it.
     * 3. Subscriber pushes it to the correct user via Socket.IO.
     */
    it("should intercept worker insights and emit them over Socket.IO", async () => {
        // 1. Initialize the subscriber with our mocked Socket.IO
        setupRedisSubscriber(mockIo);

        const testData = {
            userId: "user_67890",
            insight: {
                _id: "insight_123",
                explanation: "Rate limit exceeded.",
                severity: "medium"
            }
        };

        // 2. Simulate a worker publishing a message to the AI channel
        await connection.publish("ai-insight-channel", JSON.stringify(testData));

        // 3. We use a small delay or periodic check since Pub/Sub is inherently async
        await vi.waitUntil(() => mockIo.emit.mock.calls.length > 0, {
            timeout: 1000,
            interval: 50
        });

        // 4. Verify the Socket.IO delivery
        expect(mockIo.to).toHaveBeenCalledWith(testData.userId);
        expect(mockIo.emit).toHaveBeenCalledWith(EVENTS.NEW_AI_INSIGHT, testData.insight);
    });

    /**
     * TEST: Resilience to Malformed Data
     * Ensures the subscriber doesn't crash if it receives invalid JSON 
     * on the insight channel.
     */
    it("should gracefully handle malformed JSON messages without crashing", async () => {
        setupRedisSubscriber(mockIo);

        const malformedMessage = "{ invalid json ... }";

        // 1. Publish bad data
        await connection.publish("ai-insight-channel", malformedMessage);

        // 2. Wait a bit to ensure processing 
        await new Promise(resolve => setTimeout(resolve, 100));

        // 3. Verify no socket emission happened
        expect(mockIo.emit).not.toHaveBeenCalled();
    });
});
