/**
 * @file billingController.ts
 * @description Subscription management and billing orchestrator for the Krvyu platform.
 * 
 * CORE CONCEPT:
 * This controller serves as the primary bridge between the Krvyu platform and 
 * the Lemon Squeezy payment gateway. It handles the complete lifecycle of 
 * user subscriptions, from checkout creation to webhook-driven quota management.
 * 
 * Responsibilities:
 * 1. Checkout Orchestration: Generates secure checkout sessions for Developer 
 *    and Enterprise plans.
 * 2. Webhook Processing: Safely validates and processes Lemon Squeezy 
 *    webhooks (orders, subscriptions) to automate plan provisioning.
 * 3. Quota Synchronization: Calculates and updates user resource limits 
 *    (projects, insights, logs) based on their active subscription tier.
 * 4. Billing Audit: Maintains a detailed history of all billing events and 
 *    order states for customer support and reliability.
 * 
 * Integration:
 * - Gateway: Lemon Squeezy (via @lemonsqueezy/lemonsqueezy.js).
 * - Security: HMAC signature verification for all incoming webhooks.
 */

import { Request, Response } from "express";
import { lemonSqueezySetup, createCheckout, getSubscription } from "@lemonsqueezy/lemonsqueezy.js";
import config from "../config/config.js";
import crypto from "node:crypto";
import { UserPlan } from "../models/userPlan.js";
import { LemonSqueezyHistory } from "../models/lemonSqueezyHistory.js";
import { LemonSqueezyOrder } from "../models/lemonSqueezyOrder.js";

const PLAN_LIMITS = {
    hobby: {
        totalProjects: 1,
        totalFreeInsights: 10, // FIXED POOL (Lifetime/Initial)
        totalPreservedLogs: 200,
        byok: false,
        emailAlerts: false,
        price: 0
    },
    developer: {
        totalProjects: 10,
        totalFreeInsights: 200, // MONTHLY RECURRING
        totalPreservedLogs: 10000,
        byok: true,
        emailAlerts: true,
        price: 29
    },
    enterprise: {
        totalProjects: 1000000, // Unlimited
        totalFreeInsights: 2000, // MONTHLY RECURRING
        totalPreservedLogs: 50000,
        byok: true,
        emailAlerts: true,
        price: 89
    }
} as const;

/**
 * Shared logic to update or reset a user's plan tier and calculate remaining quotas.
 * 
 * @param userId - Unique identifier of the developer.
 * @param planType - The slug of the target plan (hobby, developer, enterprise).
 * @param status - The current subscription status from Lemon Squeezy.
 * @param endsAt - Optional expiration date for the plan.
 * @param resetInsights - If true, refills the AI insight quota to its maximum. 
 *                        Used for new subscriptions, monthly renewals, and plan upgrades.
 * @returns The updated UserPlan document.
 */
async function updateUserPlanLimits(
    userId: string,
    planType: keyof typeof PLAN_LIMITS,
    status: "active" | "expired" | "cancelled" = "active",
    endsAt: Date | null = null,
    resetInsights: boolean = false
) {
    const limits = PLAN_LIMITS[planType];
    const userPlan = await UserPlan.findOne({ user: userId });

    if (!userPlan) return null;

    // 1. Calculate current usage BEFORE updating totals
    const projectsCreated = userPlan.totalProjects - userPlan.remainingProjects;
    const insightsUsed = userPlan.totalFreeInsights - userPlan.remainingFreeInsights;
    const logsUsed = userPlan.totalPreservedLogs - userPlan.remainingPreservedLogs;

    // 2. Apply new totals
    userPlan.planType = planType;
    userPlan.totalProjects = limits.totalProjects;
    userPlan.totalFreeInsights = limits.totalFreeInsights;
    userPlan.totalPreservedLogs = limits.totalPreservedLogs;

    // 3. Apply Quotas (Subtract usage from new totals)
    userPlan.remainingProjects = Math.max(0, limits.totalProjects - projectsCreated);
    userPlan.remainingPreservedLogs = Math.max(0, limits.totalPreservedLogs - logsUsed);

    if (resetInsights) {
        // Refill quota (Monthly Renewal)
        userPlan.remainingFreeInsights = limits.totalFreeInsights;
    } else {
        // Carry over usage (Status updates, Upgrades, or Downgrades)
        userPlan.remainingFreeInsights = Math.max(0, limits.totalFreeInsights - insightsUsed);
    }

    userPlan.price = limits.price;
    userPlan.byok = limits.byok;
    userPlan.emailAlerts = limits.emailAlerts;
    userPlan.status = status;

    if (status === "active") {
        userPlan.planStartDate = new Date();
    }
    // If the plan is expired or resetting to hobby, the end date should be null.
    userPlan.planEndDate = (status === "expired" || planType === "hobby") ? null : endsAt;

    return await userPlan.save();
}

lemonSqueezySetup({
    apiKey: config.lemon_squeezy_api_key,
    onError: (error) => {
        console.error(" => [API ERROR: lemonSqueezySetup]", error);
    },
});

/**
 * Generates a Lemon Squeezy checkout session for a specific plan upgrade.
 * 
 * @param req - Express request object containing the desired plan.
 * @param res - Express response object.
 * @returns JSON response with the hosted checkout URL.
 */
export const createCheckoutSession = async (req: Request, res: Response) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ status: "error", message: "Unauthorized" });
        }

        const { plan } = req.body;

        if (!plan || (plan !== "developer" && plan !== "enterprise")) {
            return res.status(400).json({ status: "error", message: "Invalid plan" });
        }

        const storeId = config.lemon_squeezy_store_id;
        const variantId = plan === "developer" ? config.lemon_squeezy_variant_id_dev : config.lemon_squeezy_variant_id_enterprise;

        const { data: checkout, error } = await createCheckout(storeId, variantId, {
            checkoutOptions: {
                embed: true,
                media: false,
                logo: true,
            },
            checkoutData: {
                email: user.email,
                custom: {
                    user_id: user.id.toString(),
                    planType: plan,
                    variant_id: variantId,
                }
            },
            productOptions: {
                redirectUrl: config.frontend_url + "/dashboard?checkout=true&plan=" + plan
            }
        })

        if (error) {
            console.error(" => [API ERROR: createCheckoutSession]", error);
            return res.status(500).json({ status: "error", message: "Internal server error" });
        }

        const checkoutUrl = checkout.data.attributes.url;

        return res.status(200).json({ status: "success", data: checkoutUrl });
    } catch (error) {
        console.error(" => [API ERROR: createCheckoutSession]", error);
        return res.status(500).json({ status: "error", message: "Internal server error" });
    }
}

/**
 * Retrieves the customer portal URL for subscription management.
 * 
 * @param req - Express request object.
 * @param res - Express response object.
 * @returns JSON response with the authenticated portal URL.
 */
export const getCustomerPortalUrl = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ status: "error", message: "Unauthorized" });
        }

        const lastOrder = await LemonSqueezyOrder.findOne({ user: user.id }).sort({ createdAt: -1 });

        if (!lastOrder) {
            const genericPortalUrl = `https://${config.lemon_squeezy_store_subdomain}.lemonsqueezy.com/billing`;
            return res.status(200).json({ status: "success", data: genericPortalUrl });
        }

        if (!lastOrder.lsSubscriptionId) {
            const genericPortalUrl = `https://${config.lemon_squeezy_store_subdomain}.lemonsqueezy.com/billing`;
            return res.status(200).json({ status: "success", data: genericPortalUrl });
        }

        const { data: subscription, error } = await getSubscription(lastOrder.lsSubscriptionId);

        if (error) {
            console.error(" => [API ERROR: getCustomerPortalUrl]", error);
            return res.status(500).json({ status: "error", message: "Internal server error" });
        }

        const portalUrl = subscription.data.attributes.urls.customer_portal;

        return res.status(200).json({ status: "success", data: portalUrl });
    } catch (error) {
        console.error(" => [API ERROR: getCustomerPortalUrl]", error);
        return res.status(500).json({ status: "error", message: "Internal server error" });
    }
}

/**
 * Retrieves the complete payment and subscription history for the authenticated user.
 * 
 * @param req - Express request object.
 * @param res - Express response object.
 * @returns JSON response with an array of LemonSqueezyOrder documents.
 */
export const getBillingHistory = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ status: "error", message: "Unauthorized" });
        }

        const history = await LemonSqueezyOrder.find({ user: user.id }).sort({ createdAt: -1 });

        return res.status(200).json({
            status: "success",
            message: "Billing history fetched successfully",
            data: history
        });
    } catch (error) {
        console.error(" => [API ERROR: getBillingHistory]", error);
        return res.status(500).json({ status: "error", message: "Internal server error" });
    }
}


/**
 * Primary webhook consumer for Lemon Squeezy events.
 * 
 * CORE LOGIC:
 * Validates HMAC signatures before processing lifecycle events.
 * Maps incoming payloads to internal plan states and updates order history.
 * 
 * @param req - Express request object containing the raw payload and x-signature.
 * @param res - Express response object.
 * @returns 200 status upon successful processing or appropriate error code.
 */
export const handleLemonWebhook = async (req: Request, res: Response) => {
    try {
        const secret = config.lemon_squeezy_webhook_secret;
        const signatureHeader = req.headers["x-signature"] as string;

        if (!signatureHeader) {
            return res.status(400).json({ status: "error", message: "Missing signature header" });
        }

        const hmac = crypto.createHmac("sha256", secret);
        const digest = Buffer.from(hmac.update(req.body).digest("hex"), "utf-8");
        const signature = Buffer.from(signatureHeader, "utf-8");

        if (!crypto.timingSafeEqual(digest, signature)) {
            console.error(" => [API ERROR: handleLemonWebhook]", "Invalid signature");
            return res.status(400).json({ status: "error", message: "Invalid signature" });
        }

        const payload = JSON.parse(req.body.toString());
        const eventName = payload.meta.event_name;
        const customData = payload.meta.custom_data;
        const attributes = payload.data.attributes;
        const lsId = payload.data.id;

        // If meta.custom_data.user_id is missing (common in updates), we'll try to find it from our Order DB later.
        let userId = customData?.user_id;

        // 2. Resolve userId if missing from existing orders
        if (!userId && (eventName.startsWith("subscription_") || eventName === "order_created")) {
            const existingOrder = await LemonSqueezyOrder.findOne({
                $or: [{ lsSubscriptionId: lsId }, { lsOrderId: lsId }]
            });
            if (existingOrder) {
                userId = existingOrder.user.toString();
            }
        }

        if (userId) {
            await LemonSqueezyHistory.create({
                user: userId,
                lsId: lsId,
                event: eventName,
                payload: payload
            });
        }

        switch (eventName) {
            case "order_created":
            case "subscription_created": {
                let planType = customData?.planType as keyof typeof PLAN_LIMITS;

                // If planType is missing in payload, resolve it from variant_id
                if (!planType) {
                    const variantId = (attributes.variant_id || attributes.first_order_item?.variant_id)?.toString();
                    if (variantId === config.lemon_squeezy_variant_id_dev) planType = "developer";
                    else if (variantId === config.lemon_squeezy_variant_id_enterprise) planType = "enterprise";
                    else planType = "hobby";
                }

                if (!userId || !PLAN_LIMITS[planType]) {
                    console.error(" => [WEBHOOK ERROR] Missing userId or invalid planType");
                    break;
                }

                // Update or Create Lemon Squeezy Order
                await LemonSqueezyOrder.findOneAndUpdate(
                    { lsOrderId: attributes.order_id?.toString() || lsId },
                    {
                        user: userId,
                        lsOrderId: attributes.order_id?.toString() || lsId,
                        lsSubscriptionId: eventName === "subscription_created" ? lsId : attributes.subscription_id?.toString(),
                        lsCustomerId: attributes.customer_id?.toString(),
                        variantId: (attributes.variant_id || attributes.first_order_item?.variant_id)?.toString(),
                        productId: (attributes.product_id || attributes.first_order_item?.product_id)?.toString(),
                        status: attributes.status,
                        orderNumber: attributes.order_number,
                        total: attributes.total,
                        currency: attributes.currency,
                        renewsAt: attributes.renews_at ? new Date(attributes.renews_at) : null,
                        endsAt: attributes.ends_at ? new Date(attributes.ends_at) : null,
                        trialEndsAt: attributes.trial_ends_at ? new Date(attributes.trial_ends_at) : null,
                    },
                    { upsert: true, returnDocument: 'after' }
                );

                // Update User Plan Limits (Carry over Hobby usage to the first paid plan)
                await updateUserPlanLimits(userId, planType, "active", attributes.ends_at ? new Date(attributes.ends_at) : null, false);

                break;
            }

            case "subscription_payment_success": {
                if (!userId) break;

                // Resolve planType from variant_id for the current payment
                const variantId = attributes.variant_id?.toString();
                let planType: keyof typeof PLAN_LIMITS = "hobby";
                if (variantId === config.lemon_squeezy_variant_id_dev) planType = "developer";
                else if (variantId === config.lemon_squeezy_variant_id_enterprise) planType = "enterprise";

                // Monthly Renewal: Reset insights to full quota for paid plans
                if (planType !== "hobby") {
                    console.log(` => [WEBHOOK] Subscription renewed for user ${userId}. Resetting monthly AI insights.`);
                    await updateUserPlanLimits(userId, planType, "active", attributes.ends_at ? new Date(attributes.ends_at) : null, true);
                }
                break;
            }

            case "subscription_updated":
            case "subscription_cancelled":
            case "subscription_expired": {
                if (!userId) break;

                const status = attributes.status;
                const variantId = (attributes.variant_id || attributes.first_order_item?.variant_id)?.toString();
                const endsAt = attributes.ends_at ? new Date(attributes.ends_at) : null;

                // 1. Sync Lemon Squeezy Order State (Our source of payment truth)
                await LemonSqueezyOrder.findOneAndUpdate(
                    { lsSubscriptionId: lsId },
                    {
                        status: status,
                        variantId: variantId,
                        renewsAt: attributes.renews_at ? new Date(attributes.renews_at) : null,
                        endsAt: endsAt,
                    }
                );

                // 2. Update User Plan (Our source of feature/access truth)
                // If status is 'expired' or 'unpaid', or the event itself is 'expired', reset to Hobby.
                if (status === "expired" || status === "unpaid" || eventName === "subscription_expired") {
                    await updateUserPlanLimits(userId, "hobby", "expired", null);
                }
                // If status is 'active' or 'on_trial', handle upgrades, downgrades, or renewals.
                else if (status === "active" || status === "on_trial") {
                    let planType: keyof typeof PLAN_LIMITS = "hobby";
                    if (variantId === config.lemon_squeezy_variant_id_dev) planType = "developer";
                    else if (variantId === config.lemon_squeezy_variant_id_enterprise) planType = "enterprise";

                    // Update User Plan (Our source of feature/access truth)
                    // Upgrades/Downgrades carry over usage; Renewals handle themselves in payment_success.
                    await updateUserPlanLimits(userId, planType, "active", endsAt, false);
                }
                // If status is 'cancelled' (pending expiry at end of period).
                else if (status === "cancelled") {
                    await UserPlan.findOneAndUpdate(
                        { user: userId },
                        {
                            status: "cancelled",
                            planEndDate: endsAt
                        }
                    );
                }
                break;
            }

            default:
                console.log(` => [WEBHOOK: ${eventName}] Unhandled event type`);
        }

        return res.status(200).send("Webhook received successfully");
    } catch (error) {
        console.error(" => [WEBHOOK ERROR: handleLemonWebhook]", error);
        return res.status(500).json({ status: "error", message: "Internal server error" });
    }
}
