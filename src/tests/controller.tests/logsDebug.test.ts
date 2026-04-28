/**
 * @file logsDebug.test.ts
 * @description Integration tests for AI Log Insights management.
 */

import request from "supertest";
import mongoose from "mongoose";
import { app } from "../integration-app.js";
import { User } from "../../models/userModel.js";
import { SecretKey } from "../../models/secretKeyModel.js";
import { LogsDebug } from "../../models/logsDebugModel.js";
import { setTestUser } from "../setup.js";

describe("Logs Debug Controller (Integration)", () => {
    let testUser: any;
    let testProject: any;

    beforeEach(async () => {
        vi.clearAllMocks();

        // 1. Create a test user
        testUser = await User.create({
            name: "Debug Tester",
            email: `debug-${Date.now()}@krvyu.test`,
        });

        // 2. Create a test project
        testProject = await SecretKey.create({
            projectName: "Debug Project",
            user: testUser._id,
            key: "test-key-debug"
        });

        // 3. Mock authentication
        setTestUser({
            id: testUser._id.toString(),
            name: testUser.name,
            email: testUser.email
        });
    });

    describe("GET /api/ai-insights/pending", () => {
        it("should retrieve unique project IDs that have pending insights", async () => {
            // Seed some insights with valid ObjectIds
            await LogsDebug.create([
                {
                    user: testUser._id,
                    secretKey: testProject._id,
                    projectLogId: new mongoose.Types.ObjectId(),
                    explanation: "Reason 1",
                    status: "pending"
                },
                {
                    user: testUser._id,
                    secretKey: testProject._id,
                    projectLogId: new mongoose.Types.ObjectId(),
                    explanation: "Reason 2",
                    status: "pending"
                }
            ]);

            const response = await request(app).get("/api/ai-insights/pending");

            expect(response.status).toBe(200);
            expect(response.body.data).toContain(testProject._id.toString());
            expect(response.body.data.length).toBe(1); // Unique IDs
        });
    });

    describe("GET /api/ai-insights/project-log/:secretKey", () => {
        it("should retrieve insights for a specific project with pagination", async () => {
            await LogsDebug.create(
                Array.from({ length: 5 }).map((_, i) => ({
                    user: testUser._id,
                    secretKey: testProject._id,
                    projectLogId: new mongoose.Types.ObjectId(),
                    explanation: `Exp ${i}`,
                    status: "pending"
                }))
            );

            const response = await request(app)
                .get(`/api/ai-insights/project-log/${testProject._id}`)
                .query({ page: 1, limit: 2 });

            expect(response.status).toBe(200);
            expect(response.body.data.length).toBe(2);
            expect(response.body.totalInsights).toBe(5);
            expect(response.body.hasMore).toBe(true);
        });
    });

    describe("POST /api/ai-insights/mark-resolved/:id", () => {
        it("should successfully mark an insight as resolved", async () => {
            const insight = await LogsDebug.create({
                user: testUser._id,
                secretKey: testProject._id,
                projectLogId: new mongoose.Types.ObjectId(),
                explanation: "Something",
                status: "pending"
            });

            const response = await request(app)
                .post(`/api/ai-insights/mark-resolved/${insight._id}`);

            expect(response.status).toBe(200);
            expect(response.body.data.status).toBe("resolved");

            // Verify persistence
            const updated = await LogsDebug.findById(insight._id);
            expect(updated?.status).toBe("resolved");
        });

        it("should return 404 for non-existent insight", async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const response = await request(app)
                .post(`/api/ai-insights/mark-resolved/${fakeId}`);

            expect(response.status).toBe(404);
        });
    });

    describe("GET /api/ai-insights/history", () => {
        it("should retrieve historical insights for the project", async () => {
            await LogsDebug.create({
                user: testUser._id,
                secretKey: testProject._id,
                projectLogId: new mongoose.Types.ObjectId(),
                explanation: "Hist exp",
                status: "resolved"
            });

            const response = await request(app)
                .get("/api/ai-insights/history")
                .query({ id: testProject._id.toString() });

            expect(response.status).toBe(200);
            expect(response.body.data.length).toBe(1);
            expect(response.body.message).toContain("history fetched successfully");
        });
    });
});
