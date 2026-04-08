/**
 * A Secret Key is an API token that acts as a secure bridge between a User's external application and Zag.
 */

import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const secretKeySchema = new mongoose.Schema({
    projectName: {
        type: String,
        required: true
    },
    key: {
        type: String,
        required: true
    },
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

// Before saving, the key is hashed, preventing attackers from reading keys from a database leak.
secretKeySchema.pre("save", async function () {
    if (!this.isModified("key")) return;
    const salt = await bcrypt.genSalt(10);
    this.key = await bcrypt.hash(this.key, salt);
});

// Method to compare the provided key with the hashed key
secretKeySchema.methods.compareKey = async function (key: string) {
    return await bcrypt.compare(key, this.key);
}

export const SecretKey = mongoose.models.SecretKey || mongoose.model("SecretKey", secretKeySchema);
