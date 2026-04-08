import { Worker, Job } from "bullmq";
import { connection } from "../redis.js";
import { LOG_QUEUE_NAME } from "../queue/logQueue.js";
import { UserSettings } from "../../models/userSettings.js";
import { LogsDebug } from "../../models/logsDebugModel.js";
import { ProjectLogs } from "../../models/projectLogsModel.js";
import { generateLogExplanation } from "../ai/index.js";
import { decrypt } from "../encryption.js";
import { AIProvider } from "../ai/providers.js";
import { User } from "../../models/userModel.js";
import { mailService } from "../mailService.js";
import config from "../../config/config.js";

interface ProcessLogJobData {
    projectLogId: string;
    secretKeyId: string;
    userId: string;
    logContent: string;
}

export const logWorker = new Worker<ProcessLogJobData>(
    LOG_QUEUE_NAME,
    async (job: Job<ProcessLogJobData>) => {
        const { projectLogId, secretKeyId, userId, logContent } = job.data;
        console.log(`\n======================================================`);
        console.log(`[AI Worker] 🚀 Started processing job ${job.id} for projectLogId: ${projectLogId}`);

        try {
            const sendInsightEmail = async (insight: any) => {
                try {
                    const user = await User.findById(userId);
                    if (user && user.email) {
                        const projectName = (insight.secretKey as any).projectName || "Unknown Project";
                        const appLink = `${config.frontend_url}/console/projects/${secretKeyId}`;
                        const glimpse = insight.explanation.length > 150
                            ? insight.explanation.substring(0, 150) + "..."
                            : insight.explanation;

                        console.log(`[AI Worker] 📧 Sending AI Insight email to: ${user.email}`);
                        await mailService.sendAIInsightEmail({
                            email: user.email,
                            name: user.name,
                            projectName,
                            errorMessage: logContent,
                            insightGlimpse: glimpse,
                            appLink
                        });
                    }
                } catch (mailError) {
                    console.error(`[AI Worker] ❌ Failed to send email notification:`, mailError);
                }
            };

            // 0. Check if the exact same error already has an insight
            console.log(`[AI Worker] 🔍 Checking for existing identical insights...`);
            const existingLogs = await ProjectLogs.find({
                log: logContent,
                secretKeyId,
                _id: { $ne: projectLogId }
            }).sort({ createdAt: -1 }).limit(10);

            let existingInsight = null;
            for (const prevLog of existingLogs) {
                existingInsight = await LogsDebug.findOne({ projectLogId: prevLog._id });
                if (existingInsight) {
                    break;
                }
            }

            if (existingInsight) {
                console.log(`[AI Worker] ♻️ Found existing insight for identical error. Duplicating...`);

                // Save to LogsDebug Collection (Duplicated)
                const debugInsight = await LogsDebug.create({
                    projectLogId,
                    secretKey: secretKeyId,
                    user: userId,
                    explanation: existingInsight.explanation,
                    solution: existingInsight.solution,
                    severity: existingInsight.severity
                });

                await debugInsight.populate("secretKey", "-key");

                console.log(`[AI Worker] 💾 Saved Duplicated AI Insight to LogsDebug collection for ID: ${projectLogId}`);

                // Trigger Socket event via Redis Pub/Sub
                console.log(`[AI Worker] 📡 Publishing Insight to Redis Pub/Sub channel 'ai-insight-channel' for User: ${userId}`);
                await connection.publish("ai-insight-channel", JSON.stringify({
                    userId: userId.toString(),
                    insight: debugInsight
                }));

                await sendInsightEmail(debugInsight);

                return debugInsight;
            }

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
                secretKey: secretKeyId,
                user: userId,
                explanation: aiResponse.explanation,
                solution: aiResponse.solution,
                severity: aiResponse.severity
            });

            await debugInsight.populate("secretKey", "-key");

            console.log(`[AI Worker] 💾 Saved AI Insight to LogsDebug collection for ID: ${projectLogId}`);

            // 4. Trigger Socket event via Redis Pub/Sub
            console.log(`[AI Worker] 📡 Publishing Insight to Redis Pub/Sub channel 'ai-insight-channel' for User: ${userId}`);
            await connection.publish("ai-insight-channel", JSON.stringify({
                userId: userId.toString(),
                insight: debugInsight
            }));

            // 5. Send Email Notification
            await sendInsightEmail(debugInsight);

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
