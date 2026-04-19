/**
 * @file secretKeyRoutes.ts
 * @description API routes for managing Project Secret Keys.
 * 
 * CORE CONCEPT:
 * These routes provide the backend API consumed by the **Krvyu Frontend** 
 * to handle the creation, retrieval, and management of Secret Keys.
 * 
 * Functionality:
 * 1. Key Generation: Allows the dashboard to create new API tokens for projects.
 * 2. Management: Enables the UI to list, update, or revoke existing keys.
 * 3. Security: All routes are protected by `requireAuth`, ensuring developers 
 *    only manage keys for their own projects via the Krvyu UI.
 */

import express from "express";
import { generateSecretKey, getAllSecretKeys, deleteSecretKey, updateSecretKey, getSecretKeyById } from "../controllers/secretKeyControllers.js";

const router = express.Router();

router.get("/all", getAllSecretKeys);    // Get all secret keys for the authenticated user.
router.get("/:id", getSecretKeyById);    // Get a specific secret key by its ID.

router.post("/generate", generateSecretKey);    // Generate a new secret key.
router.post("/update/:id", updateSecretKey);    // Update a specific secret key.

router.delete("/:id", deleteSecretKey);    // Delete a specific secret key.

export default router;
