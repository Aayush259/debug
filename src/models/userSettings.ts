/**
 * @file userSettings.ts
 * @description Defines the UserSettings schema for the Zag SaaS platform.
 * 
 * CORE CONCEPT:
 * "UserSettings" manage the personalized configuration of the Zag analysis 
 * engine for each developer. It determines which AI models are used to 
 * process logs and how those models are authenticated.
 * 
 * Key Features:
 * 1. Model Configuration: Allows users to specify their preferred AI provider 
 *    (e.g., Google, OpenAI) and specific model version.
 * 2. API Key Management: Stores (and facilitates usage of) user-provided API keys 
 *    for different AI services.
 * 3. Quota Management: Tracks whether the user is utilizing their own API keys 
 *    or the platform's free quota.
 */

import mongoose from "mongoose";

const userSettingsSchema = new mongoose.Schema({
    /** Reference to the developer (User) these settings belong to. */
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },
    /** The AI service provider selected for analysis (e.g., "google", "openai"). */
    modelProvider: {
        type: String,
        default: "google"
    },
    /** The specific AI model identifier (e.g., "google/gemini-2.0-flash"). */
    model: {
        type: String,
        default: "google/gemini-2.0-flash"
    },
    /** Collection of API keys for various providers, supplied by the user. */
    apiKeys: {
        google: { type: String, default: "" },
        openai: { type: String, default: "" },
        anthropic: { type: String, default: "" }
    },
    /** Flag to determine if the user is using the platform's free tier quota. */
    useFreeQuota: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

export const UserSettings = mongoose.models.UserSettings || mongoose.model("UserSettings", userSettingsSchema, "userSettings");
