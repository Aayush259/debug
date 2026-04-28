/**
 * @file retentionQueue.test.ts
 * @description Unit tests for the scheduled project retention and cleanup logic.
 * 
 * CORE CONCEPT:
 * This suite validates the platform's maintenance orchestration. It ensures 
 * that cleanup tasks are correctly scheduled and that the system prevents 
 * redundant processing during server restarts (idempotency).
 */

import { setupRetentionJob, retentionQueue } from "../../../lib/queue/retentionQueue.js";

describe("Retention Queue (Maintenance Scheduling)", () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    /**
     * TEST: Daily Maintenance Schedule
     * Verifies that the repeatable cleanup job is registered with the 
     * correct CRON pattern.
     */
    it("should schedule a repeatable daily maintenance job at midnight", async () => {
        await setupRetentionJob();

        expect(retentionQueue.add).toHaveBeenCalledWith(
            "daily-log-cleanup",
            expect.any(Object),
            expect.objectContaining({
                repeat: expect.objectContaining({
                    pattern: "0 0 * * *",
                })
            })
        );
    });

    /**
     * TEST: Startup Idempotency
     * Verifies that the startup job uses a date-specific jobId to avoid 
     * redundant runs during server crashes/restarts.
     */
    it("should trigger an idempotent startup cleanup with a date-based jobId", async () => {
        const today = new Date().toISOString().split('T')[0];
        const expectedJobId = `startup-cleanup-${today}`;

        await setupRetentionJob();

        expect(retentionQueue.add).toHaveBeenCalledWith(
            "startup-log-cleanup",
            expect.any(Object),
            expect.objectContaining({
                jobId: expectedJobId,
                removeOnComplete: true,
                removeOnFail: true
            })
        );
    });
});
