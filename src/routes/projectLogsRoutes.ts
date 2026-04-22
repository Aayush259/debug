/**
 * @file projectLogsRoutes.ts
 * @description API routes for managing raw application logs.
 * 
 * CORE CONCEPT:
 * These routes provide the backend API consumed by the **Krvyu Frontend** 
 * (console) to display and manage raw log data transmitted by external applications.
 * 
 * Usage:
 * 1. Retrieval: The Krvyu Frontend uses these endpoints to fetch all logs 
 *    for a specific project or view the detailed content of a single log entry.
 * 2. Management: Provides APIs for individual log deletion and bulk clearing 
 *    of project logs, with automatic quota recovery.
 * 3. Security: All routes are mounted under `/api/project-logs` and are 
 *    protected by `requireAuth`, ensuring that the Krvyu dashboard only 
 *    displays and modifies data belonging to the authenticated developer.
 */

import express from "express";
import { getLogDetails, getProjectLogs, clearProjectLogs, deleteLogById } from "../controllers/projectLogsControllers.js";

const router = express.Router();

router.get("/get-all/:projectId", getProjectLogs);    // Get all raw logs for a specific project.
router.get("/:id", getLogDetails);    // Get detailed metadata or full content for a specific log entry.

router.delete("/clear/:projectId", clearProjectLogs); // Clear all logs for a project.
router.delete("/:id", deleteLogById);                 // Delete a specific log entry.

export default router;
