import { Worker, Job } from "bullmq";
import { connection } from "../redis.js";
import { LOG_QUEUE_NAME } from "../queue/logQueue.js";
import { UserSettings } from "../../models/userSettings.js";
import { LogsDebug } from "../../models/logsDebugModel.js";
import { generateLogExplanation } from "../ai/index.js";
import { decrypt } from "../encryption.js";
import { AIProvider } from "../ai/providers.js";

interface ProcessLogJobData {
    projectLogId: string;
    userId: string;
    logContent: string;
}

export const logWorker = new Worker<ProcessLogJobData>(
    LOG_QUEUE_NAME,
    async (job: Job<ProcessLogJobData>) => {
        const { projectLogId, userId, logContent } = job.data;
        console.log(`\n======================================================`);
        console.log(`[AI Worker] 🚀 Started processing job ${job.id} for projectLogId: ${projectLogId}`);

        try {
            // 1. Fetch user's AI preferences
            const userSettings = await UserSettings.findOne({ user: userId });
            if (!userSettings) {
                console.warn(`No user settings found for user: ${userId}`);
                return;
            }

            const provider = userSettings.modelProvider as AIProvider;
            const modelName = userSettings.model;
            // The API keys are stored encrypted in the database
            const encryptedApiKey = userSettings.apiKeys?.[provider];

            if (!encryptedApiKey) {
                console.warn(`No API key configured for provider: ${provider} for user: ${userId}`);
                return;
            }

            const apiKey = decrypt(encryptedApiKey);

            // 2. Query the AI Service
            const metadata = { source: "debug-worker" };

            console.log(`[AI Worker] 🤖 Querying AI Provider: ${provider} (Model: ${modelName})...`);

            const aiResponse = await generateLogExplanation({
                provider,
                modelName,
                apiKey,
                log: logContent,
                metadata
            });

            console.log(`[AI Worker] ✅ Received generated insight from AI.`);

            // 3. Save to LogsDebug Collection
            const debugInsight = await LogsDebug.create({
                projectLogId,
                user: userId,
                explanation: aiResponse.explanation,
                solution: aiResponse.solution,
                severity: aiResponse.severity
            });

            console.log(`[AI Worker] 💾 Saved AI Insight to LogsDebug collection for ID: ${projectLogId}`);

            // 4. Trigger Socket event via Redis Pub/Sub
            console.log(`[AI Worker] 📡 Publishing Insight to Redis Pub/Sub channel 'ai-insight-channel' for User: ${userId}`);
            await connection.publish("ai-insight-channel", JSON.stringify({
                userId: userId.toString(),
                insight: debugInsight
            }));

            return debugInsight;
        } catch (error) {
            console.error(`Error processing job ${job.id}:`, error);
            throw error; // Let BullMQ handle the error/retry
        }
    },
    {
        connection: connection as any, // Cast to any to bypass ioredis vs ioredis type mismatch in bullmq
        concurrency: 5, // Process up to 5 logs concurrently
    }
);

logWorker.on('completed', (job) => {
    console.log(`Job ${job.id} completed successfully.`);
});

logWorker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed with error: ${err.message}`);
});
