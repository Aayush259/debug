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

import mongoose, { Document, Model, Schema } from "mongoose";

export interface IProjectLogs extends Document {
    log: string;
    secretKeyId: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    level: "info" | "warn" | "error";
    createdAt: Date;
    updatedAt: Date;
}

const projectLogsSchema = new Schema<IProjectLogs>({
    /** The raw log message or data string captured from the application. */
    log: {
        type: String,
        required: true
    },
    /** Reference to the SecretKey used to authorize the transmission of this log. */
    secretKeyId: {
        type: Schema.Types.ObjectId,
        ref: "SecretKey",
        required: true
    },
    /** Reference to the developer (User) who owns the project that generated this log. */
    user: {
        type: Schema.Types.ObjectId,
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

/**
 * Middleware: Sync log quota on individual log deletion.
 * 
 * CORE LOGIC:
 * When a log entry is manually or programmatically deleted, we must "restore" 
 * that slot to the user's preserved logs quota. This ensures that the 
 * `remainingPreservedLogs` count accurately reflects the current storage state.
 */
projectLogsSchema.post("deleteOne", { document: true, query: false }, async function (doc) {
    try {
        // Atomically increment the user's log quota by 1
        await mongoose.model("UserPlan").findOneAndUpdate(
            { user: doc.user },
            { $inc: { remainingPreservedLogs: 1 } }
        );
        console.log(` => [MODEL: projectLogsModel] Incremented remainingPreservedLogs by 1 for user: ${doc.user}`);
    } catch (error) {
        console.error(" => [MODEL ERROR: projectLogsModel] Error syncing log quota on deletion:", error);
    }
});

export const ProjectLogs: Model<IProjectLogs> = mongoose.models.ProjectLogs || mongoose.model<IProjectLogs>("ProjectLogs", projectLogsSchema, "projectLogs");
