import crypto from "crypto";
import config from "../config/config.js";

const ENCRYPTION_KEY = crypto.scryptSync(config.encryption_key, "salt", 32);
const IV_LENGTH = 16;

export function encrypt(text: string): string {
    if (!text) return text;
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString("hex") + ":" + encrypted.toString("hex");
    } catch (error) {
        console.error("Encryption error", error);
        return text;
    }
}

export function decrypt(text: string): string {
    if (!text) return text;
    try {
        const textParts = text.split(":");
        if (textParts.length !== 2) return text; // Not encrypted with this format, maybe old data

        const ivPart = textParts.shift();
        if (!ivPart) return text;
        const iv = Buffer.from(ivPart, "hex");
        const encryptedText = Buffer.from(textParts.join(":"), "hex");
        const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (error) {
        // If decryption fails, it might not be encrypted or encrypted with a different key
        console.error("Decryption error", error);
        return text; // Return as is for graceful failure
    }
}
