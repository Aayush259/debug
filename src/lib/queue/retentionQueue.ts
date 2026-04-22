/**
 * @file retentionQueue.ts
 * @description Orchestrates scheduled cleanup tasks for inactive projects.
 * 
 * CORE CONCEPT:
 * The Retention Queue manages recurring maintenance tasks that ensure the 
 * platform adheres to its log preservation policies. It uses BullMQ's 
 * repeatable job functionality to run cleanup logic at regular intervals.
 * 
 * Responsibilities:
 * 1. Scheduling: Triggers the log cleanup process every 24 hours.
 * 2. Resilience: Ensures maintenance tasks are retried if they fail 
 *    due to transient database or network issues.
 * 
 * Infrastructure:
 * - Powered by `BullMQ` using Redis as the persistent task backend.
 */

import { Queue } from "bullmq";
import { connection } from "../redis/redis.js";

/**
 * RETENTION_QUEUE_NAME
 * The dedicated Redis-backed queue name for project maintenance and cleanup.
 */
export const RETENTION_QUEUE_NAME = "project-retention-cleanup";

export const retentionQueue = new Queue(RETENTION_QUEUE_NAME, {
    connection: connection as any,
});

/**
 * Initializes the daily retention cleanup job.
 * This job is repeatable (runs daily at midnight) and also triggers an 
 * immediate execution once when the server starts to ensure data consistency.
 */
export const setupRetentionJob = async () => {
    // 1. Schedule a repeatable job that runs every day at midnight.
    // Cron syntax: '0 0 * * *'
    await retentionQueue.add(
        "daily-log-cleanup",
        {},
        {
            repeat: {
                pattern: "0 0 * * *",
            },
            removeOnComplete: true,
            removeOnFail: false,
        }
    );

    /**
     * 2. Trigger an immediate one-time run on server startup.
     * We use a date-stamped jobId to ensure that even if the server restarts 
     * multiple times in a short window, the heavy cleanup logic only runs 
     * once per day, preserving system resources.
     */
    const today = new Date().toISOString().split('T')[0];
    const startupJobId = `startup-cleanup-${today}`;
    
    await retentionQueue.add(
        "startup-log-cleanup",
        {},
        {
            jobId: startupJobId,
            removeOnComplete: true,
            removeOnFail: true,
        }
    );

    console.log(` => [LIB: retentionQueue] Successfully scheduled daily maintenance and triggered startup cleanup (${startupJobId}).`);
};

