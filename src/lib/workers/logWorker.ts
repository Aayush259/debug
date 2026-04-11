/**
 * @file logWorker.ts
 * @description Background processing engine for AI-powered log analysis.
 * 
 * CORE CONCEPT:
 * The Log Worker is the "brain" of the Zag platform. It operates 
 * asynchronously to transform raw log data into actionable AI insights.
 * 
 * Workflow:
 * 1. Ingestion & Deduplication: Receives logs from the queue and checks for 
 *    identical existing insights to avoid redundant AI costs.
 * 2. Settings Check: Verifies user preferences to determine if AI analysis 
 *    and email notifications are enabled.
 * 3. Secret Decryption: Retrieves the user's encrypted AI provider keys and 
 *    decrypts them for secure use.
 * 4. AI Analysis: (Optional) Communicates with external AI providers (OpenAI, 
 *    Anthropic) to generate explanations and solutions if enabled in settings.
 * 5. Persistence & Distribution: Saves the insight to the database and 
 *    triggers real-time notifications via Redis Pub/Sub.
 * 6. Notifications: (Optional) Sends email alerts for critical issues discovered 
 *    during analysis if enabled in settings.
 * 
 * Infrastructure:
 * - Powered by `BullMQ` for robust, scalable background processing.
 * - Utilizes Redis as the task backend and real-time messaging bridge.
 */

import { Worker, Job } from "bullmq";
import { connection } from "../redis/redis.js";
import { LOG_QUEUE_NAME } from "../queue/logQueue.js";
import { LogsDebug } from "../../models/logsDebugModel.js";
import { logWorkerService } from "../services/logWorkerService.js";
import { UserSettings } from "../../models/userSettings.js";

export const logWorker = new Worker<ProcessLogJobData>(
    LOG_QUEUE_NAME,
    async (job: Job<ProcessLogJobData>) => {
        const { projectLogId, secretKeyId, userId, logContent } = job.data;
        console.log(` => [LOG WORKER] Started processing job ${job.id} for projectLogId: ${projectLogId} for user: ${userId}`);

        try {
            let debugInsight;

            const userSettings = await UserSettings.findOne({ user: userId });


            // PHASE 1: AI Insight Generation
            // Check if user has enabled AI-powered analysis in their settings
            if (userSettings?.aiInsightsEnabled) {
                const existingInsight = await logWorkerService.checkExistingLog({ secretKeyId, projectLogId, logContent });

                if (existingInsight) {
                    // Logic for reusing existing insights to save costs
                    debugInsight = await LogsDebug.create({
                        projectLogId,
                        secretKey: secretKeyId,
                        user: userId,
                        explanation: existingInsight.explanation,
                        solution: existingInsight.solution,
                        severity: existingInsight.severity
                    });
                } else {
                    // Request new analysis from the configured AI provider
                    const aiResponse = await logWorkerService.getAiInsight({ userId, logContent });

                    if (!aiResponse) {
                        throw new Error("Failed to generate AI insight");
                    }

                    debugInsight = await LogsDebug.create({
                        projectLogId,
                        secretKey: secretKeyId,
                        user: userId,
                        explanation: aiResponse.explanation,
                        solution: aiResponse.solution,
                        severity: aiResponse.severity
                    });
                }

                await debugInsight.populate("secretKey", "-key");

                // Trigger real-time dashboard updates via Redis Pub/Sub
                console.log(` => [LOG WORKER] Publishing Insight to Redis Pub/Sub channel 'ai-insight-channel' for User: ${userId}`);
                await connection.publish("ai-insight-channel", JSON.stringify({
                    userId: userId.toString(),
                    insight: debugInsight
                }));
            } else {
                console.log(` => [LOG WORKER] AI Insights disabled for user: ${userId}. Skipping analysis.`);
            }

            // PHASE 2: Email Notifications
            // Send an email alert only if the user has opted in for error log notifications
            if (userSettings?.emailErrorLogs) {
                // Note: debugInsight may be undefined if AI analysis was skipped or failed
                await logWorkerService.sendInsightMail({ userId, secretKeyId, insight: debugInsight, logContent });
            }

            return debugInsight;
        } catch (error) {
            console.error(` => [LOG WORKER] Error processing job ${job.id}:`, error);
            throw error;
        }
    },
    {
        connection: connection as any,
        concurrency: 5,
    }
);

logWorker.on('completed', (job) => {
    console.log(` => [LOG WORKER: COMPLETED] Job ${job.id} completed successfully.`);
});

logWorker.on('failed', (job, err) => {
    console.error(` => [LOG WORKER: FAILED] Job ${job?.id} failed with error: ${err.message}`);
});
