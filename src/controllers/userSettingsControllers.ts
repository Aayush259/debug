import { Request, Response } from "express";
import { UserSettings } from "../models/userSettings.js";
import { encrypt, decrypt } from "../lib/encryption.js";
import { z } from "zod";
import { allModels } from "../lib/ai/modelsRegistry.js";

const updateUserSettingsSchema = z.object({
    modelProvider: z.string().optional(),
    model: z.string().optional(),
    apiKeys: z.object({
        google: z.string().optional(),
        openai: z.string().optional(),
        anthropic: z.string().optional()
    }).optional(),
    useFreeQuota: z.boolean().optional()
});

// interface VercelModel {
//     id: string;
//     owned_by: string;
//     name: string;
// }

// Function to fetch models from the Vercel API
// const fetchAvailableModels = async () => {
//     try {
//         const response = await fetch("https://ai-gateway.vercel.sh/v1/models");
//         if (!response.ok) {
//             throw new Error(`Failed to fetch models: ${response.status}`);
//         }
//         const data = await response.json();
//         return (data as any).data as VercelModel[];
//     } catch (error) {
//         console.error("Error fetching models from Vercel:", error);
//         return [];
//     }
// };

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

        // const models = await fetchAvailableModels();

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
        console.error("Error fetching user settings:", error);
        return res.status(500).json({ status: "error", message: "Internal server error" });
    }
}

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

        const { modelProvider, model, apiKeys, useFreeQuota } = parsedResult.data;

        const currentSettings = await UserSettings.findOne({ user: user.id });

        const finalModelProvider = modelProvider !== undefined ? modelProvider : (currentSettings?.modelProvider || "google");
        const finalModel = model !== undefined ? model : (currentSettings?.model || "gemini-1.5-flash");
        const finalUseFreeQuota = useFreeQuota !== undefined ? useFreeQuota : (currentSettings?.useFreeQuota ?? true);

        // let validModels = await fetchAvailableModels();
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

        const updatedSettings = await UserSettings.findOneAndUpdate(
            { user: user.id },
            { $set: updateData },
            { new: true, upsert: true }
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
        console.error("Error updating user settings:", error);
        return res.status(500).json({ status: "error", message: "Internal server error" });
    }
}
