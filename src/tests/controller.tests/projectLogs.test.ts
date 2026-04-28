/**
 * @file projectLogs.test.ts
 * @description Integration tests for Project Logs ingestion and retrieval.
 */

import request from "supertest";
import { app, mockIo } from "../integration-app.js";
import { User } from "../../models/userModel.js";
import { UserPlan } from "../../models/userPlan.js";
import { SecretKey } from "../../models/secretKeyModel.js";
import { ProjectLogs } from "../../models/projectLogsModel.js";
import { setTestUser } from "../setup.js";
import { EVENTS } from "../../lib/utils.js";

describe("Project Logs Controller (Integration)", () => {
    let testUser: any;
    let testProject: any;
    const rawKey = "test-api-key-123";

    beforeEach(async () => {
        vi.clearAllMocks();

        // 1. Create a test user
        testUser = await User.create({
            name: "Log Tester",
            email: `logs-${Date.now()}@krvyu.test`,
        });

        // 2. Create a plan
        await UserPlan.create({
            user: testUser._id,
            planType: "hobby",
            remainingPreservedLogs: 100,
            totalPreservedLogs: 100,
            remainingProjects: 1,
            totalProjects: 1,
            remainingFreeInsights: 10,
            totalFreeInsights: 10,
            price: 0,
            status: "active"
        });

        // 3. Create a project/secret key
        testProject = await SecretKey.create({
            projectName: "Test App",
            user: testUser._id,
            key: rawKey
        });

        // 4. Mock session for dashboard routes
        setTestUser({
            id: testUser._id.toString(),
            name: testUser.name,
            email: testUser.email
        });
    });

    describe("POST /api/logs/:keyId", () => {
        it("should successfully ingest logs and emit via Socket.IO", async () => {
            const logsData = ["Error: Database connection failed", "Info: User logged in"];

            const response = await request(app)
                .post(`/api/logs/${testProject._id}`)
                .send({
                    key: rawKey,
                    logs: logsData
                });

            expect(response.status).toBe(201);
            expect(response.body.message).toBe("Logs saved successfully");

            // Verify DB persistence
            const savedLogs = await ProjectLogs.find({ secretKeyId: testProject._id });
            expect(savedLogs.length).toBe(2);
            expect(savedLogs.some(l => l.level === "error")).toBe(true);

            // Verify Socket.IO emission
            expect(mockIo.to).toHaveBeenCalledWith(testUser._id.toString());
            expect(mockIo.emit).toHaveBeenCalledWith(EVENTS.GET_LOGS, expect.any(Array));
            
            // Verify quota decrement
            const updatedPlan = await UserPlan.findOne({ user: testUser._id });
            expect(updatedPlan?.remainingPreservedLogs).toBe(98);
        });

        it("should return 401 if the secret key is invalid", async () => {
            const response = await request(app)
                .post(`/api/logs/${testProject._id}`)
                .send({
                    key: "wrong-key",
                    logs: ["some log"]
                });

            expect(response.status).toBe(401);
            expect(response.body.message).toBe("Invalid secret key");
        });

        it("should return 403 if project limit is exceeded (Inactive Project)", async () => {
            // Simulate that this project is over the plan limit
            // Hobby plan has totalProjects: 1. If we have 2 projects, the newer one is inactive.
            await SecretKey.create({ projectName: "Older Project", user: testUser._id, key: "older", createdAt: new Date(0) });
            
            const response = await request(app)
                .post(`/api/logs/${testProject._id}`)
                .send({
                    key: rawKey,
                    logs: ["log from newer project"]
                });

            expect(response.status).toBe(403);
            expect(response.body.message).toContain("Project inactive");
        });
    });

    describe("GET /api/project-logs/:projectId", () => {
        it("should retrieve paginated logs for the dashboard", async () => {
            // Seed 10 logs
            const logs = Array.from({ length: 10 }).map((_, i) => ({
                log: `Log ${i}`,
                level: "info",
                secretKeyId: testProject._id,
                user: testUser._id
            }));
            await ProjectLogs.insertMany(logs);

            const response = await request(app)
                .get(`/api/project-logs/get-all/${testProject._id}`)
                .query({ page: 1, limit: 5 });

            expect(response.status).toBe(200);
            expect(response.body.data.length).toBe(5);
            expect(response.body.totalLogs).toBe(10);
            expect(response.body.hasMore).toBe(true);
        });
    });
});
