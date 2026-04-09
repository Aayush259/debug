/**
 * @file projectLogsRoutes.ts
 * @description API routes for managing raw application logs.
 * 
 * CORE CONCEPT:
 * These routes provide the backend API consumed by the **Zag Frontend** 
 * (console) to display and manage raw log data transmitted by external applications.
 * 
 * Usage:
 * 1. Retrieval: The Zag Frontend uses these endpoints to fetch all logs 
 *    for a specific project or view the detailed content of a single log entry.
 * 2. Security: All routes are mounted under `/api/project-logs` and are 
 *    protected by `requireAuth`, ensuring that the Zag dashboard only 
 *    displays data belonging to the authenticated developer.
 */

import express from "express";
import { getLogDetails, getProjectLogs } from "../controllers/projectLogsControllers.js";

const router = express.Router();

router.get("/get-all/:projectId", getProjectLogs);    // Get all raw logs for a specific project.
router.get("/:id", getLogDetails);    // Get detailed metadata or full content for a specific log entry.

export default router;
