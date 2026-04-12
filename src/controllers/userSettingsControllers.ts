/**
 * @file userSettingsControllers.ts
 * @description Management engine for AI preferences and encrypted provider credentials.
 * 
 * CORE CONCEPT:
 * This controller allows developers to personalize their AI analysis 
 * experience on the Zag platform. It serves as the secure interface for 
 * managing third-party LLM credentials and selecting preferred models.
 * 
 * Responsibilities:
 * 1. Secure Credential Storage: Orchestrates the encryption and decryption 
 *    of provider API keys (OpenAI, Anthropic, Gemini) using the AES-256 utility.
 * 2. Model Configuration: Validates and updates the developer's preferred 
 *    AI model and provider selection.
 * 3. Quota Management: Tracks and updates preferences for using internal 
 *    free quotas vs. personal API keys.
 * 4. Model Discovery: Provides a validated list of supported models from 
 *    the central registry to the Zag Frontend.
 * 
 * Consumer:
 * - These functions are exclusively called by the dashboard internal 
 *   routes to populate the Zag Dashboard UI.
 * 
 * Security:
 * - Sensitive API keys are NEVER sent to the frontend in their encrypted 
 *   form; they are decrypted on-the-fly for the authorized user and 
 *   encrypted before storage.
 */

import { Request, Response } from "express";
import { UserSettings } from "../models/userSettings.js";
import { UserPlan } from "../models/userPlan.js";
import { encrypt, decrypt } from "../lib/encryption.js";
import { z } from "zod";
import { allModels } from "../lib/ai/modelsRegistry.js";

/**
 * Validation schema for updating user settings.
 */
const updateUserSettingsSchema = z.object({
    modelProvider: z.string().optional(),
    model: z.string().optional(),
    apiKeys: z.object({
        google: z.string().optional(),
        openai: z.string().optional(),
        anthropic: z.string().optional()
    }).optional(),
    useFreeQuota: z.boolean().optional(),
    aiInsightsEnabled: z.boolean().optional(),
    emailErrorLogs: z.boolean().optional()
});

/**
 * Retrieves the AI settings for the authenticated user.
 * 
 * @param req - Express request object.
 * @param res - Express response object.
 * @returns JSON response containing current settings, decrypted keys, and available models.
 */
export const getUserSettings = async (req: Request, res: Response) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ status: "error", message: "Unauthorized" });
        }

        let userSettings = await UserSettings.findOne({ user: user.id });

        if (!userSettings) {
            userSettings = await UserSettings.create({ user: user.id });
        }

        // Decrypt API keys before sending to frontend
        const apiKeys = {
            google: decrypt(userSettings.apiKeys?.google || ""),
            openai: decrypt(userSettings.apiKeys?.openai || ""),
            anthropic: decrypt(userSettings.apiKeys?.anthropic || "")
        };

        const resultData = {
            ...userSettings.toObject(),
            apiKeys,
        };

        return res.status(200).json({
            status: "success",
            message: "User settings fetched successfully",
            data: resultData,
            models: allModels
        });
    } catch (error) {
        console.error(" => [API ERROR: getUserSettings]", error);
        return res.status(500).json({ status: "error", message: "Internal server error" });
    }
}

/**
 * Updates the AI settings and provider credentials for the authenticated user.
 * 
 * @param req - Express request object containing the partial settings update.
 * @param res - Express response object.
 * @returns JSON response containing the updated settings and decrypted keys.
 */
export const updateUserSettings = async (req: Request, res: Response) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ status: "error", message: "Unauthorized" });
        }

        const parsedResult = updateUserSettingsSchema.safeParse(req.body);

        if (!parsedResult.success) {
            return res.status(400).json({
                status: "error",
                message: "Validation error",
                errors: z.treeifyError(parsedResult.error)
            });
        }

        const { modelProvider, model, apiKeys, useFreeQuota, aiInsightsEnabled, emailErrorLogs } = parsedResult.data;

        // --- PLAN-BASED FEATURE GATING ---
        // We fetch the user's plan to enforce tier-specific restrictions.
        // The "Hobby" plan is restricted from modifying AI providers, personal API keys, 
        // free quota settings, and advanced notification preferences.
        const userPlan = await UserPlan.findOne({ user: user.id });
        const isHobby = userPlan?.planType === "hobby";

        if (isHobby) {
            const forbiddenFields = [];
            if (modelProvider !== undefined) forbiddenFields.push("modelProvider");
            if (model !== undefined) forbiddenFields.push("model");
            if (apiKeys !== undefined) forbiddenFields.push("apiKeys");
            if (useFreeQuota !== undefined) forbiddenFields.push("useFreeQuota");
            if (emailErrorLogs !== undefined) forbiddenFields.push("emailErrorLogs");

            if (forbiddenFields.length > 0) {
                console.log(` => [API: updateUserSettings] Hobby user ${user.id} attempted to modify restricted fields: ${forbiddenFields.join(", ")}`);
                return res.status(403).json({
                    status: "error",
                    message: "Plan restriction",
                    errors: {
                        plan: `The following settings are not available for modification on the Hobby plan: ${forbiddenFields.join(", ")}. Please upgrade your plan to unlock these features.`
                    }
                });
            }
        }

        const currentSettings = await UserSettings.findOne({ user: user.id });

        const finalModelProvider = modelProvider !== undefined ? modelProvider : (currentSettings?.modelProvider || "google");
        const finalModel = model !== undefined ? model : (currentSettings?.model || "gemini-1.5-flash");
        const finalUseFreeQuota = useFreeQuota !== undefined ? useFreeQuota : (currentSettings?.useFreeQuota ?? true);

        let validModels = allModels;

        const isValidModel = validModels.some(m => m.id === finalModel && m.owned_by === finalModelProvider);

        if (!isValidModel && (modelProvider !== undefined || model !== undefined)) {
            return res.status(400).json({
                status: "error",
                message: "Validation error",
                errors: {
                    model: `The model ${finalModel} is not valid or does not belong to the provider ${finalModelProvider}.`
                }
            });
        }

        const finalApiKeys = {
            google: apiKeys?.google !== undefined ? apiKeys.google : (currentSettings?.apiKeys?.google ? decrypt(currentSettings.apiKeys.google) : ""),
            openai: apiKeys?.openai !== undefined ? apiKeys.openai : (currentSettings?.apiKeys?.openai ? decrypt(currentSettings.apiKeys.openai) : ""),
            anthropic: apiKeys?.anthropic !== undefined ? apiKeys.anthropic : (currentSettings?.apiKeys?.anthropic ? decrypt(currentSettings.apiKeys.anthropic) : "")
        };

        if (finalUseFreeQuota === false) {
            const requiredApiKey = finalApiKeys[finalModelProvider as keyof typeof finalApiKeys];
            if (!requiredApiKey || requiredApiKey.trim() === "") {
                return res.status(400).json({
                    status: "error",
                    message: "Validation error",
                    errors: {
                        useFreeQuota: `API key for the selected provider (${finalModelProvider}) is required to disable free quota.`
                    }
                });
            }
        }

        const updateData: any = {};

        if (modelProvider !== undefined) updateData.modelProvider = modelProvider;
        if (model !== undefined) updateData.model = model;
        if (useFreeQuota !== undefined) updateData.useFreeQuota = useFreeQuota;

        if (apiKeys !== undefined) {
            const keysToUpdate: any = currentSettings ? { ...currentSettings.apiKeys } : {};

            if (apiKeys.google !== undefined) keysToUpdate.google = encrypt(apiKeys.google);
            if (apiKeys.openai !== undefined) keysToUpdate.openai = encrypt(apiKeys.openai);
            if (apiKeys.anthropic !== undefined) keysToUpdate.anthropic = encrypt(apiKeys.anthropic);

            updateData.apiKeys = keysToUpdate;
        }

        if (aiInsightsEnabled !== undefined) updateData.aiInsightsEnabled = aiInsightsEnabled;
        if (emailErrorLogs !== undefined) updateData.emailErrorLogs = emailErrorLogs;

        const updatedSettings = await UserSettings.findOneAndUpdate(
            { user: user.id },
            { $set: updateData },
            { returnDocument: 'after', upsert: true }
        );

        // Decrypt keys before sending back in the response
        const decryptedApiKeys = {
            google: decrypt(updatedSettings.apiKeys?.google || ""),
            openai: decrypt(updatedSettings.apiKeys?.openai || ""),
            anthropic: decrypt(updatedSettings.apiKeys?.anthropic || "")
        };

        const resultData = {
            ...updatedSettings.toObject(),
            apiKeys: decryptedApiKeys
        };

        return res.status(200).json({
            status: "success",
            message: "User settings updated successfully",
            data: resultData
        });

    } catch (error) {
        console.error(" => [API ERROR: updateUserSettings]", error);
        return res.status(500).json({ status: "error", message: "Internal server error" });
    }
}
