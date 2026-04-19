/**
 * @file encryption.ts
 * @description Secure data-at-rest protection for the Krvyu platform.
 * 
 * CORE CONCEPT:
 * The Encryption Utility provides a cryptographic layer for protecting 
 * sensitive user information stored in the database. Its primary role 
 * is to secure external service credentials (like OpenAI/Anthropic API keys).
 * 
 * Security Approach:
 * 1. Symmetric Encryption: Uses the `aes-256-cbc` algorithm for high-performance, 
 *    secure data protection.
 * 2. Key Derivation: Leverages `crypto.scryptSync` with a project-wide 
 *    `encryption_key` to derive a strong 256-bit cryptographic key.
 * 3. Random Initialization Vectors (IV): Each encryption operation generates 
 *    a unique IV to ensure that the same plaintext results in different 
 *    ciphertext every time.
 * 4. Graceful Degradation: The utility is designed to handle non-encrypted 
 *    (legacy) data gracefully, returning it as-is if decryption fails.
 */

import crypto from "crypto";
import config from "../config/config.js";

/**
 * ENCRYPTION_KEY
 * The derived 32-byte key used for AES-256-CBC encryption.
 */
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
        console.error(" => [LIB ERROR: encrypt]", error);
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
        console.error(" => [LIB ERROR: decrypt]", error);
        return text; // Return as is for graceful failure
    }
}
