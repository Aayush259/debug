/**
 * @file logQueue.test.ts
 * @description Unit tests for the AI analysis background queue.
 * 
 * CORE CONCEPT:
 * This suite validates the reliable "buffering" layer of the platform.
 * We verify that the system correctly configures logs for background 
 * processing with the intended retry strategies and cleanup policies.
 */

import { enqueueLogForAnalysis, logQueue } from "../../../lib/queue/logQueue.js";

describe("Log Queue (Background Processing)", () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    /**
     * TEST: Job Packaging
     * Verifies that the queue-addition wrapper correctly maps internal 
     * IDs and content to the background job data.
     */
    it("should add a log analysis job with the correct identification data", async () => {
        const projectLogId = "log_001";
        const secretKeyId = "key_abc";
        const userId = "user_789";
        const logContent = "Auth error in payment flow";

        await enqueueLogForAnalysis(projectLogId, secretKeyId, userId, logContent);

        // Verify the background job was created with the right data payload
        expect(logQueue.add).toHaveBeenCalledWith(
            "process-log-explanation", // Job Name
            expect.objectContaining({
                projectLogId,
                secretKeyId,
                userId,
                logContent
            }),
            expect.any(Object) // Options
        );
    });

    /**
     * TEST: Resilience Configuration
     * Verifies that the queue implements our required "Triple-Retry" policy 
     * with exponential backoff to handle AI downtime.
     */
    it("should apply robust retry and cleanup policies to analysis jobs", async () => {
        await enqueueLogForAnalysis("id", "sec", "user", "log");

        expect(logQueue.add).toHaveBeenCalledWith(
            expect.any(String),
            expect.any(Object),
            expect.objectContaining({
                attempts: 3,
                backoff: expect.objectContaining({
                    type: "exponential",
                    delay: 1000
                }),
                removeOnComplete: true, // Keep Redis clean
                removeOnFail: false     // Important for manual investigation of crashes
            })
        );
    });
});
