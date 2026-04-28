/**
 * @file billing.test.ts
 * @description Integration tests for subscription management and billing.
 */

import request from "supertest";
import crypto from "node:crypto";
import { app } from "../integration-app.js";
import { User } from "../../models/userModel.js";
import { UserPlan } from "../../models/userPlan.js";
import { LemonSqueezyOrder } from "../../models/lemonSqueezyOrder.js";
import { setTestUser } from "../setup.js";
import config from "../../config/config.js";
import { createCheckout, getSubscription } from "@lemonsqueezy/lemonsqueezy.js";

describe("Billing Controller (Integration)", () => {
    let testUser: any;

    beforeEach(async () => {
        vi.clearAllMocks();

        // 1. Create a test user
        testUser = await User.create({
            name: "Billing Tester",
            email: `bill-${Date.now()}@krvyu.test`,
        });

        // 2. Initialize with Hobby plan
        await UserPlan.create({
            user: testUser._id,
            planType: "hobby",
            remainingProjects: 1,
            totalProjects: 1,
            remainingFreeInsights: 10,
            totalFreeInsights: 10,
            remainingPreservedLogs: 200,
            totalPreservedLogs: 200,
            status: "active"
        });

        // 3. Mock authentication
        setTestUser({
            id: testUser._id.toString(),
            name: testUser.name,
            email: testUser.email
        });
    });

    /**
     * TEST: Checkout Session Creation
     */
    describe("POST /api/billing/create-checkout-session", () => {
        it("should successfully generate a checkout URL for valid plans", async () => {
            const mockUrl = "https://checkout.lemonsqueezy.com/mock-id";
            
            // Mock the Lemon Squeezy SDK response
            vi.mocked(createCheckout).mockResolvedValue({
                data: {
                    data: {
                        attributes: { url: mockUrl }
                    }
                }
            } as any);

            const response = await request(app)
                .post("/api/billing/create-checkout-session")
                .send({ plan: "developer" });

            expect(response.status).toBe(200);
            expect(response.body.status).toBe("success");
            expect(response.body.data).toBe(mockUrl);
            
            // Verify SDK was called with correct parameters
            expect(createCheckout).toHaveBeenCalledWith(
                config.lemon_squeezy_store_id,
                config.lemon_squeezy_variant_id_dev,
                expect.any(Object)
            );
        });

        it("should return 400 for invalid plan types", async () => {
            const response = await request(app)
                .post("/api/billing/create-checkout-session")
                .send({ plan: "unlimited" });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe("Invalid plan");
        });
    });

    /**
     * TEST: Customer Portal Retrieval
     */
    describe("GET /api/billing/get-customer-portal-url", () => {
        it("should return generic portal URL if no orders exist in DB", async () => {
            const response = await request(app).get("/api/billing/get-customer-portal-url");

            expect(response.status).toBe(200);
            expect(response.body.data).toContain(config.lemon_squeezy_store_subdomain);
            expect(response.body.data).toContain("lemonsqueezy.com/billing");
        });

        it("should return authenticated portal URL if subscription exists", async () => {
            const subId = "sub_123";
            const portalUrl = "https://customer.portal/123";

            // Seed a previous order
            await LemonSqueezyOrder.create({
                user: testUser._id,
                lsOrderId: "ord_1",
                lsSubscriptionId: subId,
                lsCustomerId: "cust_1",
                variantId: "var_1",
                productId: "prod_1",
                status: "active",
                orderNumber: 1001,
                total: 2900,
                currency: "USD"
            });

            vi.mocked(getSubscription).mockResolvedValue({
                data: {
                    data: {
                        attributes: {
                            urls: { customer_portal: portalUrl }
                        }
                    }
                }
            } as any);

            const response = await request(app).get("/api/billing/get-customer-portal-url");

            expect(response.status).toBe(200);
            expect(response.body.data).toBe(portalUrl);
            expect(getSubscription).toHaveBeenCalledWith(subId);
        });
    });

    /**
     * TEST: Webhook Lifecycle
     */
    describe("POST /webhooks/lemonsqueezy", () => {
        const secret = config.lemon_squeezy_webhook_secret || "";

        const generateSignature = (payload: string) => {
            return crypto.createHmac("sha256", secret).update(payload).digest("hex");
        };

        it("should process 'subscription_created' and upgrade user plan limits", async () => {
            const payload = {
                meta: {
                    event_name: "subscription_created",
                    custom_data: {
                        user_id: testUser._id.toString(),
                        planType: "developer"
                    }
                },
                data: {
                    id: "ls_sub_999",
                    attributes: {
                        status: "active",
                        order_id: "ls_ord_555",
                        customer_id: "ls_cust_777",
                        variant_id: config.lemon_squeezy_variant_id_dev,
                        product_id: "ls_prod_111",
                        order_number: 123,
                        total: 2900,
                        currency: "USD",
                        renews_at: new Date(Date.now() + 30 * 86400000).toISOString()
                    }
                }
            };

            const rawPayload = JSON.stringify(payload);
            const signature = generateSignature(rawPayload);

            // Webhook testing REQUIRES raw body for signature verification
            const response = await request(app)
                .post("/webhooks/lemonsqueezy")
                .set("x-signature", signature)
                .set("Content-Type", "application/json")
                .send(rawPayload); // Send string to preserve raw body

            expect(response.status).toBe(200);
            expect(response.text).toBe("Webhook received successfully");
            
            // Verify internal DB state changes
            const updatedPlan = await UserPlan.findOne({ user: testUser._id });
            expect(updatedPlan?.planType).toBe("developer");
            expect(updatedPlan?.totalProjects).toBe(10);
            expect(updatedPlan?.remainingFreeInsights).toBe(200);
            expect(updatedPlan?.status).toBe("active");

            // Verify order history was recorded
            const order = await LemonSqueezyOrder.findOne({ user: testUser._id });
            expect(order).not.toBeNull();
            expect(order?.lsSubscriptionId).toBe("ls_sub_999");
            expect(order?.status).toBe("active");
        });

        it("should return 400 for payload with invalid signature", async () => {
            const response = await request(app)
                .post("/webhooks/lemonsqueezy")
                .set("x-signature", "a".repeat(64))
                .set("Content-Type", "application/json")
                .send(JSON.stringify({ some: "data" }));

            expect(response.status).toBe(400);
            expect(response.body.message).toBe("Invalid signature");
        });

        it("should return 400 if x-signature header is missing", async () => {
            const response = await request(app)
                .post("/webhooks/lemonsqueezy")
                .send(JSON.stringify({ some: "data" }));

            expect(response.status).toBe(400);
            expect(response.body.message).toBe("Missing signature header");
        });

        it("should process 'subscription_payment_success' and reset monthly AI insights", async () => {
            // 1. Setup user on Developer plan with some usage
            await UserPlan.findOneAndUpdate(
                { user: testUser._id },
                {
                    planType: "developer",
                    totalFreeInsights: 200,
                    remainingFreeInsights: 50, // 150 USED
                    status: "active"
                }
            );

            const payload = {
                meta: {
                    event_name: "subscription_payment_success",
                    custom_data: {
                        user_id: testUser._id.toString()
                    }
                },
                data: {
                    id: "ls_sub_999",
                    attributes: {
                        status: "active",
                        variant_id: config.lemon_squeezy_variant_id_dev,
                        ends_at: new Date(Date.now() + 30 * 86400000).toISOString()
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
            // RENEWAL should reset to 200 regardless of previous usage
            expect(updatedPlan?.remainingFreeInsights).toBe(200);
        });
    });
});
