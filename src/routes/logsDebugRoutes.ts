/**
 * @file logsDebugRoutes.ts
 * @description API routes for managing AI-generated debugging insights.
 * 
 * CORE CONCEPT:
 * These routes provide the backend API consumed by the **Zag Frontend** 
 * to allow developers to interact with the "AI Insights" generated 
 * from their application logs. 
 * 
 * Features:
 * 1. Retrieval: The Zag Frontend fetches pending insights, historical 
 *    insights, or project-specific insights to display on the dashboard.
 * 2. Resolution: Developers mark insights as "resolved" via the UI, 
 *    which triggers an update through these endpoints.
 * 3. Security: Routes are mounted under `/api/ai-insights` and protected 
 *    by `requireAuth`, ensuring the dashboard only displays insights 
 *    owned by the authenticated user.
 */

import express from "express";
import {
    getPendingInsights,
    getInsightsBySecretKeyId,
    markInsightAsResolved,
    getHistoryInsights
} from "../controllers/logsDebugControllers.js";

const router = express.Router();

router.get("/pending", getPendingInsights);    // Get all insights currently marked as "pending".
router.get("/project-log/:secretKey", getInsightsBySecretKeyId);    // Get insights for a specific project identified by its SecretKey ID.
router.get("/history", getHistoryInsights);    // Get a historical list of all insights.

router.post("/mark-resolved/:id", markInsightAsResolved);    // Mark a specific insight as "resolved".

export default router;
