/**
 * @file logQueue.ts
 * @description Decoupling and buffering layer for the AI analysis pipeline.
 * 
 * CORE CONCEPT:
 * The Log Queue acts as a robust task buffer between the synchronous 
 * ingestion API and the asynchronous AI analysis worker.
 * 
 * Why it exists:
 * 1. Resilience: Prevents the API from being overwhelmed during log bursts 
 *    by offloading heavy processing to the background.
 * 2. Reliability: Implements automatic retries with exponential backoff 
 *    to handle transient AI provider errors or rate limits.
 * 3. Scalability: Allows the `logWorker` to process logs at its own pace 
 *    without blocking the ingestion flow.
 * 
 * Infrastructure:
 * - Powered by `BullMQ` using Redis as the persistent task backend.
 */

import { Queue } from "bullmq";
import { connection } from "../redis/redis.js";

/**
 * LOG_QUEUE_NAME
 * The dedicated Redis-backed queue name for all AI log processing tasks.
 */
export const LOG_QUEUE_NAME = "ai-log-processing";

export const logQueue = new Queue(LOG_QUEUE_NAME, {
    connection: connection as any,
});

/**
 * Enqueues a log processing job to be handled by the AI worker.
 * 
 * @param projectLogId - The ObjectID of the saved ProjectLog document
 * @param userId - The ObjectID of the User who owns the project
 * @param logContent - The raw log content that needs explanation
 */
export const enqueueLogForAnalysis = async (
    projectLogId: string,
    secretKeyId: string,
    userId: string,
    logContent: string
) => {
    await logQueue.add("process-log-explanation", {
        projectLogId,
        secretKeyId,
        userId,
        logContent
    }, {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 1000,
        },
        removeOnComplete: true, // Keep Redis clean
        removeOnFail: false,    // Retain failed jobs for inspection
    });

    console.log(`[BullMQ Queue] Successfully added log ${projectLogId} into queue: ${LOG_QUEUE_NAME}`);
};
