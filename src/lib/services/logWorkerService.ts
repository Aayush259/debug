/**
 * @file logWorkerService.ts
 * @description Orchestration service for log analysis and insight delivery.
 * 
 * CORE CONCEPT:
 * The Log Worker Service acts as the coordination layer between the background 
 * worker and the various subsystems required to process a log. It abstracts 
 * the complexity of deduplication, AI provider selection, and notifications.
 * 
 * Key Responsibilities:
 * 1. Deduplication: Inspects historical logs to find matching insights, 
 *    minimizing redundant AI processing and costs.
 * 2. AI Orchestration: Manages the logic for selecting AI providers, 
 *    handling API keys, and managing free vs. paid quotas.
 * 3. Insight Communication: Formats and dispatches AI-generated insights 
 *    to users via email notifications.
 */

import config from "../../config/config.js";
import { ILogsDebug, LogsDebug } from "../../models/logsDebugModel.js";
import { ProjectLogs } from "../../models/projectLogsModel.js";
import { SecretKey } from "../../models/secretKeyModel.js";
import { User } from "../../models/userModel.js";
import { generateLogExplanation } from "../ai/index.js";
import { mailService } from "./mailService.js";
import { decrypt } from "../encryption.js";
import { UserSettings } from "../../models/userSettings.js";
import { UserPlan } from "../../models/userPlan.js";


class LogWorkerService {
    /**
     * Sends an AI Insight notification email to the user.
     * 
     * @param userId - The ID of the user to notify.
     * @param secretKeyId - The ID of the secret key associated with the project.
     * @param insight - The generated AI insight document.
     * @param logContent - The original log content that was analyzed.
     */
    async sendInsightMail({ userId, secretKeyId, insight, logContent }: {
        userId: string;
        secretKeyId: string;
        insight?: ILogsDebug;
        logContent: string;
    }) {
        try {
            const user = await User.findById(userId);
            if (user && user.email) {
                // We check the user's plan to determine if they are entitled to off-platform alerts.
                // The "Hobby" plan does not include email notifications for AI insights.
                const userPlan = await UserPlan.findOne({ user: userId });

                if (!userPlan || userPlan.planType === "hobby") {
                    console.log(` => [LOG WORKER SERVICE:sendInsightMail] User ${userId} is on hobby plan, skipping email notification`);
                    return;
                }

                const project = await SecretKey.findById(secretKeyId);
                const projectName = project?.projectName || "Unknown Project";
                const appLink = `${config.frontend_url}/console/projects/${secretKeyId}`;
                const glimpse = insight ? (insight.explanation.length > 150
                    ? insight.explanation.substring(0, 150) + "..."
                    : insight.explanation) : undefined;

                console.log(` => [LOG WORKER SERVICE:sendInsightMail] Sending AI Insight email to: ${user.email} for secret key ${secretKeyId}`);
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
            console.error(` => [LOG WORKER SERVICE:sendInsightMail] Failed to send email notification:`, mailError);
        }
    }

    /**
     * Checks if an identical log has already been processed to reuse its insight.
     * 
     * This method searches for recent logs with the same content and returns 
     * the existing AI insight if found, effectively deduplicating efforts.
     * 
     * @param secretKeyId - The project's secret key ID.
     * @param projectLogId - The current log ID to exclude from the search.
     * @param logContent - The raw content of the log to match.
     * @returns The existing insight if found, otherwise null.
     */
    async checkExistingLog({ secretKeyId, projectLogId, logContent }: {
        secretKeyId: string,
        projectLogId: string,
        logContent: string
    }) {
        console.log(` => [LOG WORKER SERVICE:checkExistingLog] Checking for existing identical insights for log ${projectLogId}`);
        const existingLogs = await ProjectLogs.find({
            log: logContent,
            secretKeyId,
            _id: { $ne: projectLogId }
        }).sort({ createdAt: -1 }).limit(10);

        let existingInsight = null;
        for (const prevLog of existingLogs) {
            existingInsight = await LogsDebug.findOne({ projectLogId: prevLog._id });
            if (existingInsight) {
                console.log(` => [LOG WORKER SERVICE:checkExistingLog] Found existing identical insight ${existingInsight._id} for log ${projectLogId}`);
                break;
            }
        }

        return existingInsight;
    }

    /**
     * Retrieves AI-powered insights for a given log.
     * 
     * Handles the selection of AI provider and model based on user settings.
     * Supports both the platform's free quota and the user's personal 
     * API keys (which are decrypted before use).
     * 
     * @param userId - The ID of the user requesting the insight.
     * @param logContent - The log message to be analyzed by the AI.
     * @returns The AI-generated response containing explanation, solution, and severity.
     */
    async getAiInsight({ userId, logContent }: {
        userId: string,
        logContent: string
    }) {
        const userSettings = await UserSettings.findOne({ user: userId });

        if (!userSettings) {
            console.warn(` => [LOG WORKER SERVICE:getAiInsight] No user settings found for user: ${userId}`);
            return;
        }

        const userPlan = await UserPlan.findOne({ user: userId });

        if (!userPlan) {
            console.log(` => [LOG WORKER SERVICE:getAiInsight] No user plan found for user: ${userId}`);
            return;
        }

        let provider: AIProvider;
        let modelName: string;
        let apiKey: string;

        if (userSettings.useFreeQuota) {
            console.log(" => [LOG WORKER SERVICE:getAiInsight] Using free quota for user: ", userId);

            // --- QUOTA GATE ---
            // Verify if the user has any free AI insight credits remaining for the current period.
            if (userPlan.remainingFreeInsights <= 0) {
                console.log(` => [LOG WORKER SERVICE:getAiInsight] No free insights remaining for user: ${userId}`);
                return;
            }
            // --- END QUOTA GATE ---

            apiKey = config.llm_api_key;
            provider = config.llm_provider as AIProvider;
            modelName = config.llm_model;
        } else {
            console.log(" => [LOG WORKER SERVICE:getAiInsight] Using BYOK for user: ", userId);

            // Modification of AI providers and use of personal API keys (BYOK) is a premium feature not available to the "Hobby" tier.
            if (userPlan.planType === "hobby") {
                console.log(` => [LOG WORKER SERVICE:getAiInsight] User ${userId} is on hobby plan, skipping AI analysis`);
                return;
            }

            provider = userSettings.modelProvider as AIProvider;
            modelName = userSettings.model;
            // The API keys are stored encrypted in the database
            const encryptedApiKey = userSettings.apiKeys?.[provider];
            if (!encryptedApiKey) {
                console.log(` => [LOG WORKER SERVICE:getAiInsight] No API key configured for provider: ${provider} for user: ${userId}`);
                return;
            } else {
                console.log(` => [LOG WORKER SERVICE:getAiInsight] Decrypting API key for provider: ${provider} for user: ${userId}`);
                apiKey = decrypt(encryptedApiKey);
            }
        }

        const metadata = { source: "debug-worker" };

        console.log(` => [LOG WORKER SERVICE:getAiInsight] Querying AI Provider: ${provider} (Model: ${modelName})...`);

        const aiResponse = await generateLogExplanation({
            provider,
            modelName,
            apiKey,
            log: logContent,
            metadata
        });

        console.log(` => [LOG WORKER SERVICE:getAiInsight] Received generated insight from AI for user: ${userId}`);

        if (userSettings.useFreeQuota) {
            // Atomically decrement the user's AI Insight quota after successful generation
            await UserPlan.findOneAndUpdate(
                { user: userId },
                { $inc: { remainingFreeInsights: -1 } }
            );
        }

        return aiResponse;
    }
}

export const logWorkerService = new LogWorkerService();
