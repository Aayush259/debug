/**
 * @file billing_bug_repro.test.ts
 * @description Reproduction suite for subscription-related bugs.
 * 
 * This file serves as a regression suite for issues identified in the billing 
 * flow. It ensures that once a bug is fixed, it does not reappear in future 
 * releases.
 */

import request from "supertest";
import crypto from "node:crypto";
import { app } from "../integration-app.js";
import { User } from "../../models/userModel.js";
import { UserPlan } from "../../models/userPlan.js";
import { setTestUser } from "../setup.js";
import config from "../../config/config.js";

describe("Billing Bug Reproduction", () => {
    let testUser: any;

    beforeEach(async () => {
        vi.clearAllMocks();

        testUser = await User.create({
            name: "Bug Tester",
            email: `bug-${Date.now()}@krvyu.test`,
        });

        // Initialize with Hobby plan and 1 insight USED (9 remaining)
        await UserPlan.create({
            user: testUser._id,
            planType: "hobby",
            remainingProjects: 1,
            totalProjects: 1,
            remainingFreeInsights: 9, // USED 1
            totalFreeInsights: 10,
            remainingPreservedLogs: 200,
            totalPreservedLogs: 200,
            status: "active"
        });

        setTestUser({
            id: testUser._id.toString(),
            name: testUser.name,
            email: testUser.email
        });
    });

    const generateSignature = (payload: string) => {
        const secret = config.lemon_squeezy_webhook_secret || "";
        return crypto.createHmac("sha256", secret).update(payload).digest("hex");
    };

    /**
     * TEST: AI Insight Carryover (Hobby -> Paid)
     * Verifies that usage from the free Hobby plan is subtracted from the 
     * new paid plan's quota, rather than being reset to zero used.
     */
    it("should carry over usage when upgrading from Hobby to Developer", async () => {
        const payload = {
            meta: {
                event_name: "subscription_created",
                custom_data: {
                    user_id: testUser._id.toString(),
                    planType: "developer"
                }
            },
            data: {
                id: "ls_sub_bug",
                attributes: {
                    status: "active",
                    variant_id: config.lemon_squeezy_variant_id_dev,
                    order_id: "ls_ord_bug",
                    customer_id: "ls_cust_bug",
                    product_id: "ls_prod_bug",
                    order_number: 999,
                    total: 2900,
                    currency: "USD",
                }
            }
        };

        const rawPayload = JSON.stringify(payload);
        const signature = generateSignature(rawPayload);

        const response = await request(app)
            .post("/webhooks/lemonsqueezy")
            .set("x-signature", signature)
            .set("Content-Type", "application/json")
            .send(rawPayload);

        expect(response.status).toBe(200);

        const updatedPlan = await UserPlan.findOne({ user: testUser._id });
        expect(updatedPlan?.planType).toBe("developer");
        expect(updatedPlan?.totalFreeInsights).toBe(200);

        // BUG: Current behavior is 200, but user wants 199
        // This test will FAIL if the bug is present and we expect 199
        expect(updatedPlan?.remainingFreeInsights).toBe(199);
    });

    /**
     * TEST: Quota Increase (Exhausted -> Paid)
     * Verifies that if a user has zero remaining insights on their previous plan,
     * they correctly receive the new quota minus their old usage, instead of 
     * resetting to zero remaining insights.
     */
    it("should increase quota and not reset to 0 when previous quota was exhausted", async () => {
        // 1. Exhaust the Hobby quota (0 remaining)
        await UserPlan.findOneAndUpdate({ user: testUser._id }, { remainingFreeInsights: 0 });

        const payload = {
            meta: {
                event_name: "subscription_created",
                custom_data: {
                    user_id: testUser._id.toString(),
                    planType: "developer"
                }
            },
            data: {
                id: "ls_sub_bug_exhausted",
                attributes: {
                    status: "active",
                    variant_id: config.lemon_squeezy_variant_id_dev,
                    order_id: "ls_ord_bug_2",
                    customer_id: "ls_cust_bug",
                    product_id: "ls_prod_bug",
                    order_number: 1000,
                    total: 2900,
                    currency: "USD",
                }
            }
        };

        const rawPayload = JSON.stringify(payload);
        const signature = generateSignature(rawPayload);

        await request(app)
            .post("/webhooks/lemonsqueezy")
            .set("x-signature", signature)
            .set("Content-Type", "application/json")
            .send(rawPayload);

        const updatedPlan = await UserPlan.findOne({ user: testUser._id });
        expect(updatedPlan?.planType).toBe("developer");
        expect(updatedPlan?.totalFreeInsights).toBe(200);

        // Old total: 10, Old rem: 0 -> Used: 10.
        // New total: 200, Used: 10 -> New rem: 190.
        expect(updatedPlan?.remainingFreeInsights).toBe(190);
    });
});
