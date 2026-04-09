/**
 * @file userModel.ts
 * @description Defines the User schema for the Zag SaaS platform.
 * 
 * CORE CONCEPT:
 * In the context of the Zag platform, a "User" is a developer or a client who utilizes 
 * our AI-powered debugging and log monitoring services.
 * 
 * A User's lifecycle involves:
 * 1. Registering/Authenticating with the Zag platform.
 * 2. Creating Projects and generating Secret Keys (via secretKeyModel).
 * 3. Integrating our SDK into their own external applications.
 * 4. Sending application logs to Zag for monitoring (via projectLogsModel).
 * 5. Reviewing and resolving AI-generated debugging insights (via logsDebugModel).
 * 
 * Thus, the User is the central entity managing the monitoring and debugging 
 * workflow for their respective software products.
 */

import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    emailVerified: {
        type: Boolean,
        default: false,
    },
    image: {
        type: String,
    },
}, {
    timestamps: true,
});

export const User = mongoose.models.User || mongoose.model("User", userSchema, "user");
