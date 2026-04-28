/**
 * @file auth.test.ts
 * @description Integration tests for the Authentication logic using In-Memory MongoDB.
 * 
 * CORE CONCEPT:
 * These tests verify that our custom authentication hooks (like user initialization)
 * work correctly with a real database instance, ensuring data integrity 
 * without needing external credentials or a persistent database.
 */

import { onUserCreated } from "../../lib/auth.js";
import { UserPlan } from "../../models/userPlan.js";
import { UserSettings } from "../../models/userSettings.js";

import mongoose from "mongoose";

describe("Authentication Hooks (Integration)", () => {
    
    /**
     * TEST: User Initialization Flow
     * Validates that when a user is "created" (per the auth hook), 
     * the system correctly populates the secondary domain models.
     */
    it("should initialize default UserPlan and UserSettings for a new user", async () => {
        const testUserId = new mongoose.Types.ObjectId().toString();

        // Execute the hook that normally runs after Better-Auth creates a user
        await onUserCreated({ id: testUserId });

        // 1. Verify UserPlan matches the "hobby" defaults
        const plan = await UserPlan.findOne({ user: testUserId });
        expect(plan).not.toBeNull();
        expect(plan?.planType).toBe("hobby");
        expect(plan?.remainingProjects).toBe(1);
        expect(plan?.remainingFreeInsights).toBe(10);
        expect(plan?.status).toBe("active");

        // 2. Verify UserSettings exists
        const settings = await UserSettings.findOne({ user: testUserId });
        expect(settings).not.toBeNull();
        expect(settings?.user.toString()).toBe(testUserId);
    });

    /**
     * TEST: Data Isolation
     * Ensuring that tests don't leak state between each other.
     * (Crucial when using a shared in-memory instance).
     */
    it("should start with a clean database for each test", async () => {
        // This test counts on the afterEach hook in setup.ts working correctly.
        const planCount = await UserPlan.countDocuments();
        expect(planCount).toBe(0);
    });
});
