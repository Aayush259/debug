/**
 * @file logsDebugControllers.ts
 * @description Business logic for managing AI-generated log insights.
 * 
 * CORE CONCEPT:
 * This controller serves as the primary data interface for AI insights 
 * on the Krvyu platform. It bridges the gap between the `LogsDebug` 
 * domain model and the Krvyu Frontend dashboard.
 * 
 * Responsibilities:
 * 1. Data Retrieval: Fetches paginated lists of AI insights, allowing 
 *    developers to browse error explanations and solutions.
 * 2. State Management: Provides endpoints to transition insights from 
 *    "pending" to "resolved" states.
 * 3. Targeted Filtering: Ensures developers only access insights 
 *    associated with their own projects and account.
 * 4. Distinct Scoping: Handles specific queries for pending insights vs. 
 *    full historical analysis.
 * 
 * Consumer:
 * - These functions are exclusively called by the dashboard internal 
 *   routes to populate the Krvyu Dashboard UI.
 */

import { Request, Response } from "express";
import { LogsDebug } from "../models/logsDebugModel.js";

/**
 * Retrieves pending AI insights for the authenticated user with pagination.
 * @param req - Express request object
 * @param res - Express response object
 * @returns JSON response with pending insights
 */
export const getPendingInsights = async (req: Request, res: Response) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ status: "error", message: "Unauthorized" });
        }

        const filter = { status: "pending", user: user.id };

        // Use distinct to get a unique array of ProjectLogs IDs that have pending insights
        const secretKeyIds = await LogsDebug.distinct("secretKey", filter);

        return res.status(200).json({
            status: "success",
            message: "Pending AI insight IDs fetched successfully",
            data: secretKeyIds
        });
    } catch (error) {
        console.error(" => [API ERROR: getPendingInsights]", error);
        return res.status(500).json({ status: "error", message: "Internal server error" });
    }
}

/**
 * Retrieves AI insights for a specific project log ID with pagination.
 * @param req - Express request object
 * @param res - Express response object
 * @returns JSON response with original log related insights
 */
export const getInsightsBySecretKeyId = async (req: Request, res: Response) => {
    try {
        const { secretKey } = req.params;
        const user = req.user;

        if (!secretKey) {
            return res.status(400).json({ status: "error", message: "Secret Key is required" });
        }

        if (!user) {
            return res.status(401).json({ status: "error", message: "Unauthorized" });
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const skip = (page - 1) * limit;

        const filter: any = { secretKey, user: user.id };
        if (req.query.status) {
            filter.status = req.query.status;
        }

        const totalInsights = await LogsDebug.countDocuments(filter);
        const insights = await LogsDebug.find(filter)
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limit)
            .populate("secretKey", "-key");

        const hasMore = totalInsights > skip + insights.length;

        return res.status(200).json({
            status: "success",
            message: "AI insights for project log fetched successfully",
            data: insights,
            totalInsights,
            hasMore
        });
    } catch (error) {
        console.error(" => [API ERROR: getInsightsBySecretKeyId]", error);
        return res.status(500).json({ status: "error", message: "Internal server error" });
    }
}

/**
 * Marks an AI insight as resolved.
 * @param req - Express request object
 * @param res - Express response object
 * @returns JSON response with success message
 */
export const markInsightAsResolved = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user;

        if (!id) {
            return res.status(400).json({ status: "error", message: "Insight ID is required" });
        }

        if (!user) {
            return res.status(401).json({ status: "error", message: "Unauthorized" });
        }

        const insight = await LogsDebug.findOneAndUpdate(
            { _id: id, user: user.id },
            { status: "resolved" },
            { returnDocument: 'after' }
        );

        if (!insight) {
            return res.status(404).json({ status: "error", message: "Insight not found" });
        }

        return res.status(200).json({
            status: "success",
            message: "AI insight marked as resolved successfully",
            data: insight
        });
    } catch (error) {
        console.error(" => [API ERROR: markInsightAsResolved]", error);
        return res.status(500).json({ status: "error", message: "Internal server error" });
    }
}

/**
 * Retrieves AI insights history for the authenticated user with pagination.
 * @param req - Express request object
 * @param res - Express response object
 * @returns JSON response with AI insights history
 */
export const getHistoryInsights = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        const { id } = req.query; // secretKey id

        if (!user) {
            return res.status(401).json({ status: "error", message: "Unauthorized" });
        }

        if (!id) {
            return res.status(400).json({ status: "error", message: "Secret Key ID is required" });
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        const filter: any = { user: user.id, secretKey: id };
        if (req.query.status) {
            filter.status = req.query.status;
        }

        const totalInsights = await LogsDebug.countDocuments(filter);
        const insights = await LogsDebug.find(filter)
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limit)
            .populate("secretKey", "-key");

        const hasMore = totalInsights > skip + insights.length;

        return res.status(200).json({
            status: "success",
            message: "AI insights history fetched successfully",
            data: insights,
            totalInsights,
            hasMore
        });
    } catch (error) {
        console.error(" => [API ERROR: getHistoryInsights]", error);
        return res.status(500).json({ status: "error", message: "Internal server error" });
    }
}
