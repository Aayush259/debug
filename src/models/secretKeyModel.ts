/**
 * @file secretKeyModel.ts
 * @description Defines the SecretKey schema for the Zag SaaS platform.
 * 
 * CORE CONCEPT:
 * A "Secret Key" is a secure API token that acts as a bridge between a 
 * developer's external application and the Zag monitoring service.
 * 
 * Functional Overview:
 * 1. Each Secret Key is associated with a specific Project (projectName) and a User.
 * 2. Developers include this key in their application (via Zag SDK) to authenticate
 *    log data transmission to our servers.
 * 3. SECURITY: To protect against database leaks, the raw API key is never 
 *    stored. It is hashed using bcrypt before being saved to the database.
 * 4. VALIDATION: When logs are received, the provided key is compared against 
 *     the stored hash using the `compareKey` method.
 */

import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const secretKeySchema = new mongoose.Schema({
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
        type: mongoose.Schema.Types.ObjectId,
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
secretKeySchema.methods.compareKey = async function (key: string) {
    return await bcrypt.compare(key, this.key);
}

export const SecretKey = mongoose.models.SecretKey || mongoose.model("SecretKey", secretKeySchema);
