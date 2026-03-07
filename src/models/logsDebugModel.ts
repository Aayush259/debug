import mongoose from "mongoose";

const logsDebugSchema = new mongoose.Schema({
    projectLogId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ProjectLogs",
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
    }
}, { timestamps: true });

export const LogsDebug = mongoose.models.LogsDebug || mongoose.model("LogsDebug", logsDebugSchema, "logsDebug");
