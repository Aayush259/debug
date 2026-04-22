/**
 * @file retentionWorker.ts
 * @description Background engine for enforcing project-level log retention policies.
 * 
 * CORE CONCEPT:
 * The Retention Worker ensures that log data is not stored indefinitely for 
 * inactive projects. It calculates the "last activity" for each project and 
 * compares it against plan-specific retention thresholds.
 * 
 * Retention Policy:
 * - Hobby: 1 Day
 * - Developer: 7 Days
 * - Enterprise: 30 Days
 * 
 * Workflow:
 * 1. Iteration: Scans all projects (SecretKeys) in the system.
 * 2. Activity Check: Determines last activity date using `lastLogAt` or falls 
 *    back to the latest log document / project creation date.
 * 3. Threshold Calculation: Resolves the owner's plan and determines if the 
 *    project has exceeded its inactivity retention limit.
 * 4. Cleanup: Deletes all logs and AI insights for inactive projects and 
 *    refunds the global log quota to the user.
 * 
 * Infrastructure:
 * - Powered by `BullMQ` for scheduled, reliable background execution.
 */

import { Worker, Job } from "bullmq";
import { connection } from "../redis/redis.js";
import { RETENTION_QUEUE_NAME } from "../queue/retentionQueue.js";
import { SecretKey } from "../../models/secretKeyModel.js";
import { ProjectLogs } from "../../models/projectLogsModel.js";
import { LogsDebug } from "../../models/logsDebugModel.js";
import { UserPlan } from "../../models/userPlan.js";

/**
 * Retention thresholds in days mapped by Plan Type.
 */
const RETENTION_DAYS: Record<string, number> = {
    hobby: 1,
    developer: 7,
    enterprise: 30
};

export const retentionWorker = new Worker(
    RETENTION_QUEUE_NAME,
    async (job: Job) => {
        console.log(` => [RETENTION WORKER] Starting daily log cleanup job ${job.id}...`);

        try {
            const projects = await SecretKey.find({});
            let projectsProcessed = 0;
            let projectsCleaned = 0;
            let totalLogsDeleted = 0;

            for (const project of projects) {
                projectsProcessed++;
                const userId = project.user;
                const secretKeyId = project._id;

                // 1. Resolve Last Activity Date
                let activityDate = project.lastLogAt;

                if (!activityDate) {
                    // Fallback: Check for the latest log document
                    const latestLog = await ProjectLogs.findOne({ secretKeyId })
                        .sort({ createdAt: -1 })
                        .select("createdAt");
                    
                    if (latestLog) {
                        activityDate = latestLog.createdAt;
                        // Cache it for efficiency in next runs
                        await SecretKey.findByIdAndUpdate(secretKeyId, { lastLogAt: activityDate });
                    } else {
                        // If no logs ever existed, use project creation date as the starting point
                        activityDate = project.createdAt;
                    }
                }

                // 2. Fetch User Plan and Retention Period
                const userPlan = await UserPlan.findOne({ user: userId });
                if (!userPlan) {
                    console.warn(` => [RETENTION WORKER] User plan not found for user ${userId}. Skipping project ${project.projectName}.`);
                    continue;
                }

                const retentionDays = RETENTION_DAYS[userPlan.planType] || 1; // Default to hobby if unknown
                const thresholdDate = new Date();
                thresholdDate.setDate(thresholdDate.getDate() - retentionDays);

                // 3. Perform Cleanup if Inactive
                if (activityDate < thresholdDate) {
                    console.log(` => [RETENTION WORKER] Project '${project.projectName}' (${secretKeyId}) is inactive since ${activityDate}. Threshold: ${retentionDays} days. Cleaning up...`);

                    // Count logs for quota recovery
                    const logsCount = await ProjectLogs.countDocuments({ secretKeyId });

                    if (logsCount > 0) {
                        // Atomic Deletion across Logs and AI Insights
                        await ProjectLogs.deleteMany({ secretKeyId });
                        await LogsDebug.deleteMany({ secretKey: secretKeyId });

                        // Quota Refund: Restore the deleted logs to the user's global quota
                        await UserPlan.findOneAndUpdate(
                            { user: userId },
                            { $inc: { remainingPreservedLogs: logsCount } }
                        );

                        totalLogsDeleted += logsCount;
                        projectsCleaned++;
                        console.log(` => [RETENTION WORKER] Deleted ${logsCount} logs for project '${project.projectName}'. Quota recovered.`);
                    }
                }
            }

            console.log(` => [RETENTION WORKER: COMPLETED] Job ${job.id} finished. Processed ${projectsProcessed} projects, cleaned up ${projectsCleaned} projects, deleted ${totalLogsDeleted} total logs.`);
            return { projectsProcessed, projectsCleaned, totalLogsDeleted };

        } catch (error) {
            console.error(` => [RETENTION WORKER: ERROR] Job ${job.id} failed:`, error);
            throw error;
        }
    },
    {
        connection: connection as any,
        concurrency: 1, // Single concurrency to avoid overloading the DB during maintenance
    }
);

retentionWorker.on('completed', (job) => {
    console.log(` => [RETENTION WORKER: COMPLETED] Job ${job.id} completed successfully.`);
});

retentionWorker.on('failed', (job, err) => {
    console.error(` => [RETENTION WORKER: FAILED] Job ${job?.id} failed with error: ${err.message}`);
});
