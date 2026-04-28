/**
 * @file userSettings.test.ts
 * @description Integration tests for User Settings and AI preferences.
 */

import request from "supertest";
import { app } from "../integration-app.js";
import { User } from "../../models/userModel.js";
import { UserPlan } from "../../models/userPlan.js";
import { UserSettings } from "../../models/userSettings.js";
import { setTestUser } from "../setup.js";
import { encrypt, decrypt } from "../../lib/encryption.js";

describe("User Settings Controller (Integration)", () => {
    let testUser: any;

    beforeEach(async () => {
        vi.clearAllMocks();

        // 1. Create a test user
        testUser = await User.create({
            name: "Settings Tester",
            email: `settings-${Date.now()}@krvyu.test`,
        });

        // 2. Mock authentication
        setTestUser({
            id: testUser._id.toString(),
            name: testUser.name,
            email: testUser.email
        });
    });

    describe("GET /api/user-settings", () => {
        it("should retrieve user settings with decrypted API keys", async () => {
            const googleKey = "google-secret-key";
            await UserSettings.create({
                user: testUser._id,
                apiKeys: {
                    google: encrypt(googleKey)
                }
            });

            const response = await request(app).get("/api/user-settings");

            expect(response.status).toBe(200);
            expect(response.body.data.apiKeys.google).toBe(googleKey);
            expect(response.body.models).toBeDefined();
        });

        it("should create default settings if none exist", async () => {
            const response = await request(app).get("/api/user-settings");

            expect(response.status).toBe(200);
            expect(response.body.data.user).toBe(testUser._id.toString());
        });
    });

    describe("POST /api/user-settings", () => {
        it("should successfully update settings for a non-hobby user", async () => {
            // Set user to Developer plan
            await UserPlan.create({
                user: testUser._id,
                planType: "developer"
            });

            const updateData = {
                modelProvider: "openai",
                model: "openai/gpt-4o",
                apiKeys: {
                    openai: "sk-openai-key"
                },
                useFreeQuota: false
            };

            const response = await request(app)
                .post("/api/user-settings")
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.data.model).toBe("openai/gpt-4o");
            expect(response.body.data.apiKeys.openai).toBe("sk-openai-key");

            // Verify encryption in DB
            const settingsInDb = await UserSettings.findOne({ user: testUser._id });
            expect(settingsInDb?.apiKeys?.openai).not.toBe("sk-openai-key");
            expect(decrypt(settingsInDb?.apiKeys?.openai || "")).toBe("sk-openai-key");
        });

        it("should prevent Hobby users from modifying restricted fields", async () => {
            // Set user to Hobby plan
            await UserPlan.create({
                user: testUser._id,
                planType: "hobby"
            });

            const response = await request(app)
                .post("/api/user-settings")
                .send({ modelProvider: "openai" });

            expect(response.status).toBe(403);
            expect(response.body.message).toBe("Plan restriction");
        });

        it("should require an API key when disabling free quota", async () => {
            await UserPlan.create({
                user: testUser._id,
                planType: "developer"
            });

            const response = await request(app)
                .post("/api/user-settings")
                .send({
                    modelProvider: "google",
                    model: "google/gemini-1.5-flash",
                    useFreeQuota: false,
                    apiKeys: { google: "" } // Empty key
                });

            expect(response.status).toBe(400);
            expect(response.body.errors.useFreeQuota).toBeDefined();
            expect(response.body.errors.useFreeQuota).toMatch(/API key .* is required/);
        });

        it("should allow Hobby users to modify non-restricted fields (e.g. aiInsightsEnabled)", async () => {
            await UserPlan.create({
                user: testUser._id,
                planType: "hobby"
            });

            const response = await request(app)
                .post("/api/user-settings")
                .send({ aiInsightsEnabled: false });

            expect(response.status).toBe(200);
            expect(response.body.data.aiInsightsEnabled).toBe(false);
        });
    });
});
