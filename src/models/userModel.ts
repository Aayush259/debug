/**
 * A User represents a developer, team lead, or system administrator who registers to use the platform to monitor their application logs in real-time.
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
