/**
 * @file logWorker.test.ts
 * @description Integration tests for the Log Worker orchestration layer.
 */

import mongoose from "mongoose";
import { logWorkerService } from "../../../lib/services/logWorkerService.js";
import { User } from "../../../models/userModel.js";
import { UserPlan } from "../../../models/userPlan.js";
import { UserSettings } from "../../../models/userSettings.js";
import { ProjectLogs } from "../../../models/projectLogsModel.js";
import { LogsDebug } from "../../../models/logsDebugModel.js";
import { generateText } from "ai";
import { mockSendMail } from "../../setup.js";
import { encrypt } from "../../../lib/encryption.js";
import { SecretKey } from "../../../models/secretKeyModel.js";
import { getLanguageModel } from "../../../lib/ai/providers.js";
import { mailService } from "../../../lib/services/mailService.js";

describe("Log Worker Service (Orchestration)", () => {
    let testUser: any;
    const logContent = "Error: Connection timeout at 10.0.0.1";

    beforeEach(async () => {
        vi.clearAllMocks();

        // 1. Seed a test user
        testUser = await User.create({
            name: "Test Developer",
            email: `dev-${Date.now()}@krvyu.test`, // Ensure unique email
        });

        // 2. Create a valid plan with all REQUIRED fields
        await UserPlan.create({
            user: testUser._id,
            planType: "developer",
            remainingFreeInsights: 10,
            totalFreeInsights: 10,
            remainingProjects: 5,
            totalProjects: 5,
            remainingPreservedLogs: 1000,
            totalPreservedLogs: 1000,
            price: 29
        });

        await UserSettings.create({
            user: testUser._id,
            useFreeQuota: true
        });
    });

    /**
     * TEST: Quota Management
     */
    it("should decrement user's free insights quota after successful AI analysis", async () => {
        vi.mocked(generateText).mockResolvedValue({ text: "{\"explanation\": \"Mocked insight\"}" } as any);

        await logWorkerService.getAiInsight({
            userId: testUser._id,
            logContent
        });

        const updatedPlan = await UserPlan.findOne({ user: testUser._id });
        expect(updatedPlan?.remainingFreeInsights).toBe(9);
    });

    it("should return undefined and skip analysis if free quota is exhausted", async () => {
        await UserPlan.findOneAndUpdate({ user: testUser._id }, { remainingFreeInsights: 0 });

        const result = await logWorkerService.getAiInsight({
            userId: testUser._id,
            logContent
        });

        expect(result).toBeUndefined();
        expect(generateText).not.toHaveBeenCalled();
    });

    /**
     * TEST: Deduplication Logic
     */
    it("should reuse an existing insight for an identical log (deduplication)", async () => {
        const secretKeyId = new mongoose.Types.ObjectId();

        const prevLog = await ProjectLogs.create({
            log: logContent,
            secretKeyId,
            user: testUser._id
        });

        const existingInsight = await LogsDebug.create({
            projectLogId: prevLog._id,
            secretKey: secretKeyId,
            user: testUser._id,
            explanation: "Existing Insight",
            severity: "high"
        });

        const newLog = await ProjectLogs.create({
            log: logContent,
            secretKeyId,
            user: testUser._id
        });

        const result = await logWorkerService.checkExistingLog({
            secretKeyId: secretKeyId.toString(),
            projectLogId: newLog._id.toString(),
            logContent
        });

        expect(result?._id.toString()).toBe(existingInsight._id.toString());
        expect(result?.explanation).toBe("Existing Insight");
    });

    /**
     * TEST: Plan Gating (Email)
     */
    it("should skip email notifications for users on the hobby plan", async () => {
        await UserPlan.findOneAndUpdate({ user: testUser._id }, { planType: "hobby" });

        await logWorkerService.sendInsightMail({
            userId: testUser._id,
            secretKeyId: new mongoose.Types.ObjectId().toString(),
            logContent: "Some error"
        });

        expect(mockSendMail).not.toHaveBeenCalled();
    });

    it("should send email notifications for eligible users", async () => {
        const secretKey = await SecretKey.create({
            projectName: "Test Project",
            user: testUser._id,
            key: "test-key"
        });

        await logWorkerService.sendInsightMail({
            userId: testUser._id,
            secretKeyId: secretKey._id.toString(),
            logContent: "Critical Error"
        });

        expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
            to: testUser.email,
            subject: expect.stringContaining("Error Log Detected"),
            html: expect.stringContaining("Test Project")
        }));
    });

    it("should use 'Unknown Project' if the project is not found", async () => {
        await logWorkerService.sendInsightMail({
            userId: testUser._id,
            secretKeyId: new mongoose.Types.ObjectId().toString(), // Non-existent
            logContent: "Critical Error"
        });

        expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
            html: expect.stringContaining("Unknown Project")
        }));
    });

    /**
     * TEST: Resilience
     */
    it("should return undefined if UserSettings is missing during AI insight retrieval", async () => {
        await UserSettings.deleteOne({ user: testUser._id });

        const result = await logWorkerService.getAiInsight({
            userId: testUser._id,
            logContent
        });

        expect(result).toBeUndefined();
    });

    it("should return undefined if UserPlan is missing during AI insight retrieval", async () => {
        await UserPlan.deleteOne({ user: testUser._id });

        const result = await logWorkerService.getAiInsight({
            userId: testUser._id,
            logContent
        });

        expect(result).toBeUndefined();
    });

    it("should handle errors during email dispatch gracefully", async () => {
        const secretKey = await SecretKey.create({
            projectName: "Error Test Project",
            user: testUser._id,
            key: "test-key"
        });

        vi.spyOn(mailService, "sendAIInsightEmail").mockRejectedValue(new Error("SMTP Down"));
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        await logWorkerService.sendInsightMail({
            userId: testUser._id,
            secretKeyId: secretKey._id.toString(),
            logContent: "Error"
        });

        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining("Failed to send email notification"),
            expect.any(Error)
        );
        consoleSpy.mockRestore();
    });

    /**
     * TEST: Plan Gating (BYOK)
     */
    it("should block BYOK analysis for hobby plan users", async () => {
        await UserSettings.findOneAndUpdate({ user: testUser._id }, { useFreeQuota: false });
        await UserPlan.findOneAndUpdate({ user: testUser._id }, { planType: "hobby" });

        const result = await logWorkerService.getAiInsight({
            userId: testUser._id,
            logContent
        });

        expect(result).toBeUndefined();
        expect(generateText).not.toHaveBeenCalled();
    });

    it("should allow BYOK analysis for developer plan users with a valid key", async () => {
        const encryptedKey = encrypt("personal-api-key");
        await UserSettings.findOneAndUpdate({ user: testUser._id }, {
            useFreeQuota: false,
            modelProvider: "openai",
            model: "gpt-4",
            apiKeys: { openai: encryptedKey }
        });

        vi.mocked(generateText).mockResolvedValue({ text: "{\"explanation\": \"BYOK insight\"}" } as any);

        const result = await logWorkerService.getAiInsight({
            userId: testUser._id,
            logContent
        });

        expect(result?.explanation).toBe("BYOK insight");
        expect(getLanguageModel).toHaveBeenCalledWith(
            "openai",
            "gpt-4",
            "personal-api-key"
        );
    });

    it("should return undefined if the BYOK key is missing for the provider", async () => {
        await UserSettings.findOneAndUpdate({ user: testUser._id }, {
            useFreeQuota: false,
            modelProvider: "anthropic",
            apiKeys: {} // Missing key
        });

        const result = await logWorkerService.getAiInsight({
            userId: testUser._id,
            logContent
        });

        expect(result).toBeUndefined();
    });
});
