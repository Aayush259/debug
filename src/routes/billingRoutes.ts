/**
 * @file billingRoutes.ts
 * @description API routes for subscription checkouts and customer portal access.
 * 
 * CORE CONCEPT:
 * These routes provide the authenticated interface for Krvyu developers to 
 * manage their financial relationship with the platform.
 * 
 * Functionality:
 * 1. Checkout Generation: Securely initiates Lemon Squeezy upgrade flows.
 * 2. Portal Access: Provides single-sign-on links to the billing management dashboard.
 * 3. Security: All routes require active session authentication via `requireAuth`.
 */

import express from "express";
import {
    createCheckoutSession,
    getCustomerPortalUrl,
    getBillingHistory,
} from "../controllers/billingController.js";

const router = express.Router();

router.post("/create-checkout-session", createCheckoutSession);    // Initiates a secure checkout flow for plan upgrades.
router.get("/get-customer-portal-url", getCustomerPortalUrl);    // Fetches the authenticated Lemon Squeezy billing portal link.
router.get("/history", getBillingHistory);    // Retrieves the payment and subscription history for the user.

export default router;
