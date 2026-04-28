/**
 * @file secretKey.test.ts
 * @description Integration tests for Secret Key management API.
 * 
 * CORE CONCEPT:
 * This suite validates the "Secret Key Lifecycle" through HTTP requests. 
 * We use a replicated app instance to ensure we test the actual 
 * Route -> Middleware -> Controller flow without modifying index.ts.
 */

import request from "supertest";
import { app } from "../integration-app.js";
import { User } from "../../models/userModel.js";
import { UserPlan } from "../../models/userPlan.js";
import { SecretKey } from "../../models/secretKeyModel.js";
import { setTestUser } from "../setup.js";

describe("Secret Key Controller (Integration)", () => {
    let testUser: any;

    beforeEach(async () => {
        // 1. Create a test user in the DB
        testUser = await User.create({
            name: "Integration Tester",
            email: `tester-${Date.now()}@krvyu.test`,
        });

        // 2. Create a plan for the user
        await UserPlan.create({
            user: testUser._id,
            planType: "developer",
            remainingProjects: 5,
            totalProjects: 5,
            remainingFreeInsights: 10,
            totalFreeInsights: 10,
            remainingPreservedLogs: 1000,
            totalPreservedLogs: 1000,
            price: 29,
            status: "active"
        });

        // 3. Mock the session globally
        setTestUser({
            id: testUser._id.toString(),
            name: testUser.name,
            email: testUser.email
        });
    });

    describe("POST /api/secret-key/generate", () => {
        it("should successfully generate a new secret key and decrement quota", async () => {
            const response = await request(app)
                .post("/api/secret-key/generate")
                .send({ projectName: "Integration Project" });

            expect(response.status).toBe(201);
            expect(response.body.status).toBe("success");
            expect(response.body.data.projectName).toBe("Integration Project");

            // Verify persistence
            const keyInDb = await SecretKey.findOne({ user: testUser._id });
            expect(keyInDb).not.toBeNull();

            // Verify quota decrement
            const updatedPlan = await UserPlan.findOne({ user: testUser._id });
            expect(updatedPlan?.remainingProjects).toBe(4);
        });

        it("should return 401 if unauthorized", async () => {
            setTestUser(null);

            const response = await request(app)
                .post("/api/secret-key/generate")
                .send({ projectName: "Unauthorized" });

            expect(response.status).toBe(401);
        });
    });

    describe("GET /api/secret-key/all", () => {
        it("should retrieve all projects for the user", async () => {
            await SecretKey.create([
                { projectName: "Project A", user: testUser._id, key: "key-a" },
                { projectName: "Project B", user: testUser._id, key: "key-b" }
            ]);

            const response = await request(app).get("/api/secret-key/all");

            expect(response.status).toBe(200);
            expect(response.body.data.length).toBe(2);
            expect(response.body.data[0].key).toBeUndefined(); // Security check
        });
    });

    describe("DELETE /api/secret-key/:id", () => {
        it("should delete the project and refund the slot", async () => {
            const keyDoc = await SecretKey.create({
                projectName: "To Delete",
                user: testUser._id,
                key: "temp"
            });

            const response = await request(app).delete(`/api/secret-key/${keyDoc._id}`);

            expect(response.status).toBe(200);

            const exists = await SecretKey.findById(keyDoc._id);
            expect(exists).toBeNull();

            const updatedPlan = await UserPlan.findOne({ user: testUser._id });
            expect(updatedPlan?.remainingProjects).toBe(6);
        });
    });
});
