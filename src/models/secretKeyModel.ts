/**
 * @file secretKeyModel.ts
 * @description Defines the SecretKey schema for the Krvyu SaaS platform.
 * 
 * CORE CONCEPT:
 * A "Secret Key" is a secure API token that acts as a bridge between a 
 * developer's external application and the Krvyu monitoring service.
 * 
 * Functional Overview:
 * 1. Each Secret Key is associated with a specific Project (projectName) and a User.
 * 2. Developers include this key in their application (via Krvyu SDK) to authenticate
 *    log data transmission to our servers.
 * 3. SECURITY: To protect against database leaks, the raw API key is never 
 *    stored. It is hashed using bcrypt before being saved to the database.
 * 4. VALIDATION: When logs are received, the provided key is compared against 
 *     the stored hash using the `compareKey` method.
 */

import bcrypt from "bcryptjs";
import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISecretKey extends Document {
    projectName: string;
    key: string;
    user: mongoose.Types.ObjectId;
    image?: string | null;
    createdAt: Date;
    updatedAt: Date;
    compareKey(key: string): Promise<boolean>;
}

const secretKeySchema = new Schema<ISecretKey>({
    /** The name of the project this key is assigned to. */
    projectName: {
        type: String,
        required: true
    },
    /** The hashed version of the API token. */
    key: {
        type: String,
        required: true
    },
    /** Reference to the developer (User) who owns this project/key. */
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    image: {
        type: String,
        required: false,
        default: null
    }
}, { timestamps: true });

/**
 * Middleware: Hashing the key before saving.
 * Ensures that if the database is compromised, the actual API keys remain secure.
 */
secretKeySchema.pre("save", async function () {
    if (!this.isModified("key")) return;
    const salt = await bcrypt.genSalt(10);
    this.key = await bcrypt.hash(this.key, salt);
});

/**
 * Validates a provided plain-text key against the stored hash.
 * @param {string} key - The raw API key provided by the client's application.
 * @returns {Promise<boolean>} True if the key is valid, false otherwise.
 */
secretKeySchema.methods.compareKey = async function (key: string): Promise<boolean> {
    return await bcrypt.compare(key, this.key);
}

/**
 * Middleware: Cascading deletion & Quota Recovery.
 * 
 * CORE RESPONSIBILITIES:
 * 1. Cleanup: Deletes all associated `ProjectLogs` and `LogsDebug` insights 
 *    when a SecretKey (Project) is removed to avoid orphaned data.
 * 2. Quota Syncing: Calculates the total number of deleted logs and 
 *    "refunds" them to the user's `remainingPreservedLogs` quota.
 * 
 * This ensures that deleting a project frees up storage space for the 
 * user's other projects.
 */
secretKeySchema.post("deleteOne", { document: true, query: false }, async function (doc) {
    try {
        const secretKeyId = doc._id;
        // Delete associated project logs and capture the count for quota refund
        const result = await mongoose.model("ProjectLogs").deleteMany({ secretKeyId });
        const deletedCount = result.deletedCount || 0;

        // Delete associated AI insights (LogsDebug)
        await mongoose.model("LogsDebug").deleteMany({ secretKey: secretKeyId });

        console.log(` => [MODEL: secretKeyModel] Cascading deletion complete for SecretKey: ${secretKeyId}. Deleted ${deletedCount} logs.`);

        // Update the user's log quota (refund the deleted capacity)
        if (deletedCount > 0) {
            await mongoose.model("UserPlan").findOneAndUpdate(
                { user: doc.user },
                { $inc: { remainingPreservedLogs: deletedCount } }
            );
            console.log(` => [MODEL: secretKeyModel] Incremented remainingPreservedLogs by ${deletedCount} for user: ${doc.user}`);
        }
    } catch (error) {
        console.error(" => [MODEL ERROR: secretKeyModel] Error in SecretKey cascading deletion:", error);
    }
});

export const SecretKey: Model<ISecretKey> = mongoose.models.SecretKey || mongoose.model<ISecretKey>("SecretKey", secretKeySchema);
