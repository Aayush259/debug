import mongoose from "mongoose";

const userSettingsSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },
    modelProvider: {
        type: String,
        default: "google"
    },
    model: {
        type: String,
        default: "google/gemini-2.0-flash"
    },
    apiKeys: {
        google: { type: String, default: "" },
        openai: { type: String, default: "" },
        anthropic: { type: String, default: "" }
    },
    useFreeQuota: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

export const UserSettings = mongoose.models.UserSettings || mongoose.model("UserSettings", userSettingsSchema, "userSettings");
