/**
 * @file projectLogsModel.ts
 * @description Defines the ProjectLogs schema for the Zag SaaS platform.
 * 
 * CORE CONCEPT:
 * A "Project Log" represents an individual event or message emitted by a 
 * developer's application and captured by the Zag monitoring service.
 * 
 * Data Flow:
 * 1. External applications send logs via the public API endpoint, authenticated by a Secret Key.
 * 2. Zag identifies the `User` and `SecretKey` associated with the incoming log.
 * 3. Each log is stored as a `ProjectLog` document.
 * 4. RAW DATA: These logs serve as the raw input for our background workers (e.g., logWorker)
 *    which use AI to generate debugging insights (stored in logsDebugModel).
 */

import mongoose from "mongoose";

const projectLogsSchema = new mongoose.Schema({
    /** The raw log message or data string captured from the application. */
    log: {
        type: String,
        required: true
    },
    /** Reference to the SecretKey used to authorize the transmission of this log. */
    secretKeyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SecretKey",
        required: true
    },
    /** Reference to the developer (User) who owns the project that generated this log. */
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    /** The severity level of the log entry. */
    level: {
        type: String,
        enum: ["info", "warn", "error"],
        default: "info"
    }
}, { timestamps: true });

export const ProjectLogs = mongoose.models.ProjectLogs || mongoose.model("ProjectLogs", projectLogsSchema, "projectLogs");
