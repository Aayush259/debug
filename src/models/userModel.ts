/**
 * @file userModel.ts
 * @description Defines the User schema for the Krvyu SaaS platform.
 * 
 * CORE CONCEPT:
 * In the context of the Krvyu platform, a "User" is a developer or a client who utilizes 
 * our AI-powered debugging and log monitoring services.
 * 
 * A User's lifecycle involves:
 * 1. Registering/Authenticating with the Krvyu platform.
 * 2. Creating Projects and generating Secret Keys (via secretKeyModel).
 * 3. Integrating our SDK into their own external applications.
 * 4. Sending application logs to Krvyu for monitoring (via projectLogsModel).
 * 5. Reviewing and resolving AI-generated debugging insights (via logsDebugModel).
 * 
 * Thus, the User is the central entity managing the monitoring and debugging 
 * workflow for their respective software products.
 */

import mongoose, { Document, Model, Schema } from "mongoose";

export interface IUser extends Document {
    name: string;
    email: string;
    emailVerified: boolean;
    image?: string;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<IUser>({
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

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", userSchema, "user");
