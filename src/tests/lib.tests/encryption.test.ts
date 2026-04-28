/**
 * @file encryption.test.ts
 * @description Comprehensive unit tests for the Symmetric Encryption Utility.
 * 
 * CORE CONCEPT:
 * These tests validate the integrity and security properties of the aes-256-cbc 
 * encryption layer. They ensure that sensitive credentials (like API keys) can be 
 * safely transformed into ciphertext and restored to their original form without 
 * loss of entropy or data corruption.
 * 
 * Test Vectors:
 * 1. Reversibility: Encryption followed by Decryption must yield the exact original plaintext.
 * 2. Non-Determinism: Identical plaintexts must produce unique ciphertexts to prevent 
 *    frequency analysis attacks (via Random Initialization Vectors).
 * 3. Edge Cases: Graceful handling of empty or malformed inputs.
 */

import { encrypt, decrypt } from "../../lib/encryption.js";

describe("Encryption Utility", () => {
    const secretMessage = "Hello Krvyu!";

    /**
     * TEST: Reversibility (The Round Trip)
     * Validates that the encryption key derivation and initialization vector 
     * handling are consistent across both encrypt and decrypt operations.
     */
    it("should encrypt and then decrypt back to the original message", () => {
        const text = secretMessage;

        const encrypted = encrypt(text);
        const decrypted = decrypt(encrypted);

        expect(decrypted).toBe(text);
        expect(encrypted).not.toBe(text);    // Ensure it's actually changing the text
    });

    /**
     * TEST: Randomization (Semantic Security)
     * Even if the input message is the same, the output must be different every time.
     * This is achieved by generating a unique 16-byte IV for every operation.
     */
    it("should return different ciphertexts for the same plaintext (due to Random IV)", () => {
        const cipher1 = encrypt(secretMessage);
        const cipher2 = encrypt(secretMessage);

        expect(cipher1).not.toBe(cipher2);
    });

    /**
     * TEST: Boundary Conditions
     * Ensures the utility doesn't crash on empty strings or null values, 
     * which might occur if a project has no secrets configured.
     */
    it("should handle empty or null inputs gracefully", () => {
        expect(encrypt("")).toBe("");

        // @ts-ignore
        expect(encrypt(null)).toBe(null);
    })
});
