/**
 * @file userSettingsRoutes.ts
 * @description API routes for managing developer-specific settings.
 * 
 * CORE CONCEPT:
 * These routes provide the backend API consumed by the **Zag Frontend** 
 * to manage user configurations, such as AI model preferences and API keys.
 * 
 * Functionality:
 * 1. Preference Management: Allows the dashboard to fetch and update 
 *    the current user's AI analysis settings.
 * 2. Security: Protected by `requireAuth` to ensure configuration changes 
 *    are performed by the authenticated owner via the Zag dashboard.
 */

import express from "express";
import { getUserSettings, updateUserSettings } from "../controllers/userSettingsControllers.js";

const router = express.Router();

router.get("/", getUserSettings);    // Get the current user's settings.

router.post("/", updateUserSettings);    // Update the current user's settings.

export default router;
