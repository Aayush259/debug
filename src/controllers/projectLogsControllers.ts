/**
 * @file projectLogsControllers.ts
 * @description Ingestion and retrieval engine for application log data.
 * 
 * CORE CONCEPT:
 * This controller acts as the primary gateway for all log data on the 
 * Krvyu platform. It manages the lifecycle of logs from external 
 * application ingestion to dashboard retrieval.
 * 
 * Responsibilities:
 * 1. Log Ingestion (Public API): Receives and processes log arrays from 
 *    external apps, verifying secret keys and classifying log levels.
 * 2. Real-Time Propagation: Triggers immediate emission of ingested logs 
 *    to the Krvyu Frontend via Socket.IO.
 * 3. AI Triggering: Identifies "error" or "warn" logs and enqueues them 
 *    for background AI analysis.
 * 4. Data Retrieval (Internal Dashboard): Provides paginated, filtered 
 *    access to raw logs for the developer dashboard.
 * 
 * Consumer:
 * - Public Ingestion Endpoints (for external apps).
 * - Internal Dashboard Endpoints (for the Krvyu Frontend).
 */

import { Request, Response } from "express";
import { ProjectLogs } from "../models/projectLogsModel";
import { SecretKey } from "../models/secretKeyModel";
import { EVENTS } from "../lib/utils.js";
import { classifyLog } from "../lib/logClassifier.js";
import { enqueueLogForAnalysis } from "../lib/queue/logQueue.js";
import { UserPlan } from "../models/userPlan.js";

/**
 * Retrieves all logs for a specific project.
 * @param req - Express request object
 * @param res - Express response object
 * @returns JSON response with all logs for the project
 */
export const getProjectLogs = async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const user = req.user;

        if (!projectId) {
            return res.status(400).json({ status: "error", message: "Project ID is required" });
        }

        if (!user) {
            return res.status(401).json({ status: "error", message: "Unauthorized" });
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const skip = (page - 1) * limit;

        const { level, startDate, endDate } = req.query;

        // Query filtering by both secretKeyId and user to ensure ownership and avoid 403 errors on empty results
        const filter: any = { secretKeyId: projectId, user: user.id };

        if (level && typeof level === "string") {
            const levelLower = level.toLowerCase();
            if (["info", "warn", "error"].includes(levelLower)) {
                if (levelLower === "info") {
                    // For 'info', we also want to match logs that might be missing the level field (old logs)
                    filter.level = { $in: ["info", null, undefined] };
                } else {
                    filter.level = levelLower;
                }
            }
        }

        const dateFilter: any = {};
        if (startDate && typeof startDate === "string" && startDate.trim() !== "") {
            const date = new Date(startDate);
            if (!isNaN(date.getTime())) {
                dateFilter.$gte = date;
            }
        }
        if (endDate && typeof endDate === "string" && endDate.trim() !== "") {
            const date = new Date(endDate);
            if (!isNaN(date.getTime())) {
                // If the user provided a date without time, make it inclusive of the entire day
                if (!endDate.includes("T") && !endDate.includes(":")) {
                    date.setUTCHours(23, 59, 59, 999);
                }
                dateFilter.$lte = date;
            }
        }

        if (Object.keys(dateFilter).length > 0) {
            filter.createdAt = dateFilter;
        }

        const totalLogs = await ProjectLogs.countDocuments(filter);
        const logs = await ProjectLogs.find(filter)
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limit);

        const hasMore = totalLogs > skip + logs.length;

        return res.status(200).json({
            status: "success",
            message: "Project logs fetched successfully",
            data: logs,
            totalLogs,
            hasMore
        });
    } catch (error) {
        console.error(" => [API ERROR: getProjectLogs]", error);
        return res.status(500).json({ status: "error", message: "Internal server error" });
    }
}

/**
 * Retrieves a specific log by ID.
 * @param req - Express request object
 * @param res - Express response object
 * @returns JSON response with the log details
 */
export const getLogDetails = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user;

        if (!id) {
            return res.status(400).json({ status: "error", message: "Log ID is required" });
        }

        if (!user) {
            return res.status(401).json({ status: "error", message: "Unauthorized" });
        }

        const log = await ProjectLogs.findById(id).populate("secretKeyId").select("-key");

        if (user.id.toString() !== log?.user.toString()) {
            return res.status(403).json({ status: "error", message: "Forbidden" });
        }

        return res.status(200).json({
            status: "success",
            message: "Log details fetched successfully",
            data: log
        });
    } catch (error) {
        console.error(" => [API ERROR: getLogDetails]", error);
        return res.status(500).json({ status: "error", message: "Internal server error" });
    }
}

/**
 * Saves multiple logs for a specific project (By the external application).
 * @param req - Express request object
 * @param res - Express response object
 * @returns JSON response with the saved logs
 */
export const saveProjectLogs = async (req: Request, res: Response) => {
    try {
        const { keyId } = req.params;
        const { logs, key } = req.body;

        if (!keyId) {
            return res.status(400).json({ status: "error", message: "Secret Key ID is required" });
        }

        if (!key) {
            return res.status(400).json({ status: "error", message: "Secret key is required" });
        }

        if (!logs || !Array.isArray(logs) || logs.length === 0) {
            return res.status(400).json({ status: "error", message: "Logs are required" });
        }

        const secretKey = await SecretKey.findById(keyId);

        if (!secretKey) {
            return res.status(404).json({ status: "error", message: "Secret key not found" });
        }

        const isMatch = await secretKey.compareKey(key);

        if (!isMatch) {
            return res.status(401).json({ status: "error", message: "Invalid secret key" });
        }

        console.log(` => [API: saveProjectLogs] Received ${logs.length} logs from project: ${keyId}`);

        // Process incoming logs
        const processedLogs = logs.map((logItem: any) => {
            let processedLog = {
                log: "",
                level: "info",
                secretKeyId: keyId,
                user: secretKey.user,
                // Automatically take the client's timestamp if provided, else rely on Mongoose timestamps
                timestamp: undefined
            };

            // If the incoming log is a string, classify it
            if (typeof logItem === "string") {
                processedLog.log = logItem;
                processedLog.level = classifyLog(logItem);
            }
            // If the incoming log is an object (structured data)
            else if (typeof logItem === "object" && logItem !== null) {
                // Ensure there is at least a log string
                processedLog.log = logItem.log ? String(logItem.log) : JSON.stringify(logItem);

                // Allow overriding level, but validate it
                if (logItem.level && ["info", "warn", "error"].includes(logItem.level.toLowerCase())) {
                    processedLog.level = logItem.level.toLowerCase();
                } else {
                    // Fall back to auto-classification if object contains unstructured string but no explicit level
                    processedLog.level = classifyLog(processedLog.log);
                }

                if (logItem.timestamp) {
                    const parsedDate = new Date(logItem.timestamp);
                    if (!isNaN(parsedDate.getTime())) {
                        processedLog.timestamp = parsedDate as any;
                    }
                }
            } else {
                // Fallback for unexpected primitives
                processedLog.log = String(logItem);
                processedLog.level = "info";
            }

            return processedLog;
        });

        // --- PLAN-BASED PROJECT GATING ---
        // We ensure that logs are only accepted for "active" projects based on the user's plan limits.
        // If a user has exceeded their project limit (e.g. downgraded to Hobby), 
        // we only allow logs for the oldest X projects.

        // Fetch user plan to check for log rotation and project limits
        const userPlan = await UserPlan.findOne({ user: secretKey.user });

        if (!userPlan) {
            return res.status(404).json({ status: "error", message: "User plan not found" });
        }

        // Identify active projects (Oldest X projects)
        const activeProjects = await SecretKey.find({ user: secretKey.user })
            .sort({ createdAt: 1 })
            .limit(userPlan.totalProjects)
            .select("_id");

        const isActiveProject = activeProjects.some(proj => proj._id.toString() === keyId);

        if (!isActiveProject) {
            console.warn(` => [API: saveProjectLogs] Rejected logs from inactive project: ${keyId}. User ${secretKey.user} has exceeded their ${userPlan.totalProjects} project limit.`);
            return res.status(403).json({
                status: "error",
                message: `Project inactive - Your current plan (${userPlan.planType}) only supports ${userPlan.totalProjects} active project(s). Logs are only accepted for your oldest projects.`,
                limitReached: true
            });
        }

        // --- GLOBAL LOG ROTATION & QUOTA MANAGEMENT ---
        // We ensure that users doesn't exceed their account-wide preserved logs quota.
        // If the incoming logs push them over the limit, we rotate (delete) the oldest logs 
        // across ALL of their projects (Global Rotation) to make room.

        const newLogsCount = processedLogs.length;
        const remaining = userPlan.remainingPreservedLogs;

        // Check if we need to rotate logs (FIFO - Global)
        if (remaining < newLogsCount) {
            const excessCount = newLogsCount - remaining;

            // Find oldest logs across ALL projects for this user to enforce strict global limits
            const oldestLogs = await ProjectLogs.find({
                user: secretKey.user
            })
                .sort({ createdAt: 1 })
                .limit(excessCount)
                .select("_id");

            if (oldestLogs.length > 0) {
                console.log(` => [API: saveProjectLogs] Global Rotation: Deleting ${oldestLogs.length} oldest logs across user ${secretKey.user}'s projects.`);
                await ProjectLogs.deleteMany({ _id: { $in: oldestLogs.map(log => log._id) } });
            }

            // Reset remainingPreservedLogs to 0 as the quota is now fully utilized
            await UserPlan.findOneAndUpdate(
                { user: secretKey.user },
                { remainingPreservedLogs: 0 }
            );
        } else {
            // Atomically decrement the remaining preserved logs count for the new ingestion
            await UserPlan.findOneAndUpdate(
                { user: secretKey.user },
                { $inc: { remainingPreservedLogs: -newLogsCount } }
            );
        }

        // Insert into database
        const savedLogs = await ProjectLogs.insertMany(processedLogs);

        // Update last activity timestamp on the project (SecretKey)
        await SecretKey.findByIdAndUpdate(keyId, { lastLogAt: new Date() });

        // Send logs via Socket.IO
        const io = req.app.get("io");
        if (io) {
            io.to(secretKey.user.toString()).emit(EVENTS.GET_LOGS, savedLogs);
        }

        // Push errors and warnings to the AI background queue (API Gatekeeping)
        const aiTargets = savedLogs.filter((log) => log.level === "error" || log.level === "warn");

        if (aiTargets.length > 0 && userPlan.remainingFreeInsights > 0) {
            aiTargets.forEach((logItem) => {
                console.log(` => [API: saveProjectLogs] Enqueueing ${logItem.level} log for AI processing. Log ID: ${logItem._id.toString()}`);
                enqueueLogForAnalysis(
                    logItem._id.toString(),
                    logItem.secretKeyId.toString(),
                    logItem.user.toString(),
                    logItem.log
                ).catch((err) => console.error(" => [API: saveProjectLogs] Failed to enqueue log:", err));
            });
        }

        return res.status(201).json({
            status: "success",
            message: "Logs saved successfully"
        });
    } catch (error) {
        console.error(" => [API ERROR: saveProjectLogs]", error);
        return res.status(500).json({ status: "error", message: "Internal server error" });
    }
}
