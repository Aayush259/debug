/**
 * @file logsDebugModel.ts
 * @description Defines the LogsDebug schema for the Zag SaaS platform.
 * 
 * CORE CONCEPT:
 * A "LogsDebug" entry (referred to as an "AI Insight") is the end-product 
 * of the Zag analysis pipeline. It provides developers with an AI-generated 
 * explanation and a potential solution for errors captured in `ProjectLogs`.
 * 
 * Insights Cycle:
 * 1. ANALYSIS: The logWorker detects an error in `ProjectLogs` and triggers AI analysis.
 * 2. STORAGE: The resulting explanation, solution, and severity are stored here.
 * 3. NOTIFICATION: The platform notifies the `User` about the new insight via WebSockets.
 * 4. RESOLUTION: The developer reviews the insight on the console and marks it as "resolved".
 */

import mongoose, { Document, Model, Schema } from "mongoose";

export interface ILogsDebug extends Document {
    projectLogId: mongoose.Types.ObjectId;
    secretKey: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    explanation: string;
    solution?: string | null;
    severity: "high" | "medium" | "low";
    status: "pending" | "resolved";
    createdAt: Date;
    updatedAt: Date;
}

const logsDebugSchema = new Schema<ILogsDebug>({
    /** Reference to the specific log entry that triggered this AI analysis. */
    projectLogId: {
        type: Schema.Types.ObjectId,
        ref: "ProjectLogs",
        required: true
    },
    /** Reference to the SecretKey associated with the originating project. */
    secretKey: {
        type: Schema.Types.ObjectId,
        ref: "SecretKey",
        required: true
    },
    /** Reference to the developer (User) who owns the project. */
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    /** AI-generated explanation of why the error occurred. */
    explanation: {
        type: String,
        required: true
    },
    /** AI-suggested code or logic fix for the error. */
    solution: {
        type: String,
        default: null
    },
    /** The priority level of the error as determined by the AI. */
    severity: {
        type: String,
        enum: ["high", "medium", "low"],
        default: "medium"
    },
    /** The current state of the insight in the developer's workflow. */
    status: {
        type: String,
        enum: ["pending", "resolved"],
        default: "pending"
    }
}, { timestamps: true });

export const LogsDebug: Model<ILogsDebug> = mongoose.models.LogsDebug || mongoose.model<ILogsDebug>("LogsDebug", logsDebugSchema, "logsDebug");
