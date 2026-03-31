import mongoose from "mongoose";

const logsDebugSchema = new mongoose.Schema({
    projectLogId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ProjectLogs",
        required: true
    },
    secretKey: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SecretKey",
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    explanation: {
        type: String,
        required: true
    },
    solution: {
        type: String,
        default: null
    },
    severity: {
        type: String,
        enum: ["high", "medium", "low"],
        default: "medium"
    },
    status: {
        type: String,
        enum: ["pending", "resolved"],
        default: "pending"
    }
}, { timestamps: true });

export const LogsDebug = mongoose.models.LogsDebug || mongoose.model("LogsDebug", logsDebugSchema, "logsDebug");
