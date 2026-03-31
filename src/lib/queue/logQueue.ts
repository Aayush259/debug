import { Queue } from "bullmq";
import { connection } from "../redis.js";

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
