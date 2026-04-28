/**
 * @file logWorker.test.ts
 * @description Unit tests for the AI Log Processing Worker handler.
 * 
 * CORE CONCEPT:
 * This suite tests the actual "unit of work" performed by the background 
 * worker. We capture the handler function and execute it against various 
 * user setting configurations (Enabled vs Disabled) to verify that the 
 * worker correctly orchestrates AI analysis and notifications.
 */

import mongoose from "mongoose";
import { LOG_QUEUE_NAME } from "../../../lib/queue/logQueue.js";
import { UserSettings } from "../../../models/userSettings.js";
import { User } from "../../../models/userModel.js";
import { logWorkerService } from "../../../lib/services/logWorkerService.js";
import { connection } from "../../../lib/redis/redis.js";

describe("Log Worker (Job Handler)", () => {
    let handler: Function;
    let testUser: any;
    const secretKeyId = new mongoose.Types.ObjectId();
    const projectLogId = new mongoose.Types.ObjectId();

    beforeAll(async () => {
        // 1. Manually trigger the logWorker initialization (as a side effect)
        await import("../../../lib/workers/logWorker.js");

        // 2. Retrieve the captured handler from the global registry
        handler = (globalThis as any).workerProcessors.get(LOG_QUEUE_NAME);
        if (!handler) throw new Error("Log Worker handler not found in registry!");
    });

    beforeEach(async () => {
        vi.clearAllMocks();

        // 1. Seed a test user
        testUser = await User.create({
            name: "Worker Test User",
            email: `worker-${Date.now()}@test.com`
        });

        // 2. Create default settings
        await UserSettings.create({
            user: testUser._id,
            aiInsightsEnabled: true,
            emailErrorLogs: true,
            useFreeQuota: true
        });

        // 3. Mock service methods to avoid deep integration failures
        vi.spyOn(logWorkerService, "checkExistingLog").mockResolvedValue(null);
        vi.spyOn(logWorkerService, "getAiInsight").mockResolvedValue({
            explanation: "Mocked explanation",
            severity: "low",
            solution: "Do nothing"
        });
        vi.spyOn(logWorkerService, "sendInsightMail").mockResolvedValue(undefined);
        vi.spyOn(connection, "publish").mockResolvedValue(1);
    });

    /**
     * TEST: Full Pipeline Execution
     * Verifies that when everything is enabled, the worker runs AI analysis, 
     * publishes to Redis, and sends an email.
     */
    it("should process AI analysis and trigger notifications when enabled", async () => {
        const mockJob: any = {
            id: "job_1",
            data: {
                projectLogId: projectLogId.toString(),
                secretKeyId: secretKeyId.toString(),
                userId: testUser._id.toString(),
                logContent: "Something went wrong"
            }
        };

        await handler(mockJob);

        // Check AI call
        expect(logWorkerService.getAiInsight).toHaveBeenCalled();

        // Check Redis Pub/Sub call
        expect(connection.publish).toHaveBeenCalledWith(
            "ai-insight-channel",
            expect.stringContaining(testUser._id.toString())
        );

        // Check Email call
        expect(logWorkerService.sendInsightMail).toHaveBeenCalled();
    });

    /**
     * TEST: Settings Opt-out
     * Ensures the worker respects the user's decision to disable AI insights.
     */
    it("should skip AI analysis if aiInsightsEnabled is false", async () => {
        await UserSettings.findOneAndUpdate({ user: testUser._id }, { aiInsightsEnabled: false });

        const mockJob: any = {
            id: "job_2",
            data: {
                projectLogId: projectLogId.toString(),
                secretKeyId: secretKeyId.toString(),
                userId: testUser._id.toString(),
                logContent: "Something went wrong"
            }
        };

        await handler(mockJob);

        expect(logWorkerService.getAiInsight).not.toHaveBeenCalled();
        expect(connection.publish).not.toHaveBeenCalled();

        // But email might still happen if enabled
        expect(logWorkerService.sendInsightMail).toHaveBeenCalled();
    });

    /**
     * TEST: Error Resilience
     * Verifies that errors in the handler are correctly caught and re-thrown 
     * to trigger BullMQ's automatic retry mechanism.
     */
    it("should re-throw errors to trigger BullMQ retries", async () => {
        vi.spyOn(logWorkerService, "getAiInsight").mockRejectedValue(new Error("AI Provider Down"));

        const mockJob: any = {
            id: "job_3",
            data: { userId: testUser._id.toString() }
        };

        await expect(handler(mockJob)).rejects.toThrow("AI Provider Down");
    });
});
