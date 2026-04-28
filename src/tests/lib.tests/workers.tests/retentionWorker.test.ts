/**
 * @file retentionWorker.test.ts
 * @description Unit tests for the Project Retention policy enforcement worker.
 * 
 * CORE CONCEPT:
 * This suite verifies the "Cleanup" logic of the platform. It confirms that 
 * inactive projects are purged based on their plan-specific retention periods 
 * and that users are correctly credited for the freed-up log capacity.
 */

import { RETENTION_QUEUE_NAME } from "../../../lib/queue/retentionQueue.js";
import { User } from "../../../models/userModel.js";
import { UserPlan } from "../../../models/userPlan.js";
import { SecretKey } from "../../../models/secretKeyModel.js";
import { ProjectLogs } from "../../../models/projectLogsModel.js";

describe("Retention Worker (Policy Enforcement)", () => {
    let handler: Function;

    beforeAll(async () => {
        // 1. Manually trigger the retentionWorker initialization (as a side effect)
        await import("../../../lib/workers/retentionWorker.js");

        // 2. Retrieve the captured handler from the global registry (set in setup.ts)
        handler = (globalThis as any).workerProcessors.get(RETENTION_QUEUE_NAME);
        if (!handler) throw new Error("Retention Worker handler not found in registry!");
    });

    beforeEach(async () => {
        vi.clearAllMocks();
    });

    /**
     * Helper to create a complete testing environment for a project.
     */
    async function seedProjectAndLogs({ planType, daysAgo, logCount }: { planType: string, daysAgo: number, logCount: number }) {
        const user = await User.create({
            name: `${planType} User`,
            email: `${planType}-${Date.now()}@test.com`
        });

        const plan = await UserPlan.create({
            user: user._id,
            planType,
            remainingFreeInsights: 10,
            totalFreeInsights: 10,
            remainingProjects: 5,
            totalProjects: 5,
            remainingPreservedLogs: 1000,
            totalPreservedLogs: 1000,
            price: 0
        });

        const activityDate = new Date();
        activityDate.setDate(activityDate.getDate() - daysAgo);

        const project = await SecretKey.create({
            projectName: `${planType} Inactive Project`,
            key: "sk_test_key",
            user: user._id,
            lastLogAt: activityDate
        });

        // Seed logs
        const logs = [];
        for (let i = 0; i < logCount; i++) {
            logs.push({
                log: `Test log ${i}`,
                secretKeyId: project._id,
                user: user._id,
                level: "info"
            });
        }
        await ProjectLogs.insertMany(logs);

        return { user, plan, project };
    }

    /**
     * TEST: Hobby Retention (1 Day)
     * Verifies that hobby projects inactive for > 1 day are cleaned up.
     */
    it("should purge logs for a Hobby project inactive for more than 1 day", async () => {
        const { project, user } = await seedProjectAndLogs({
            planType: "hobby",
            daysAgo: 2,
            logCount: 5
        });

        await handler({ id: "job_hobby" });

        // 1. Verify logs are deleted
        const remainingLogs = await ProjectLogs.countDocuments({ secretKeyId: project._id });
        expect(remainingLogs).toBe(0);

        // 2. Verify quota refund (1000 initial + 5 deleted = 1005)
        const updatedPlan = await UserPlan.findOne({ user: user._id });
        expect(updatedPlan?.remainingPreservedLogs).toBe(1005);
    });

    /**
     * TEST: Retention Protection
     * Verifies that projects within their retention period are NOT touched.
     */
    it("should NOT purge logs for a Developer project inactive for only 3 days (Threshold is 7)", async () => {
        const { project } = await seedProjectAndLogs({
            planType: "developer",
            daysAgo: 3,
            logCount: 10
        });

        await handler({ id: "job_dev_active" });

        // Logs should still exist
        const remainingLogs = await ProjectLogs.countDocuments({ secretKeyId: project._id });
        expect(remainingLogs).toBe(10);
    });

    /**
     * TEST: Fallback Logic (lastLogAt missing)
     * Verifies that the worker can determine activity from log documents if 
     * the project's lastLogAt field is null.
     */
    it("should correctly identify activity from log timestamps if lastLogAt is missing", async () => {
        const { user } = await seedProjectAndLogs({ planType: "hobby", daysAgo: 0, logCount: 0 });

        // Manual setup for a project with NO lastLogAt but RECENT logs
        const project = await SecretKey.create({
            projectName: "Fallback Test",
            key: "sk_fallback",
            user: user._id,
            lastLogAt: null
        });

        // Add a recent log
        await ProjectLogs.create({
            log: "Recent Log",
            secretKeyId: project._id,
            user: user._id,
            createdAt: new Date()
        });

        await handler({ id: "job_fallback" });

        // Should NOT be purged because it has a recent log
        const remainingLogs = await ProjectLogs.countDocuments({ secretKeyId: project._id });
        expect(remainingLogs).toBe(1);
    });
});
