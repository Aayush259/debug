import { Request, Response } from "express";
import { LogsDebug } from "../models/logsDebugModel";

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

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const skip = (page - 1) * limit;

        const filter = { status: "pending", user: user.id };

        const totalLogs = await LogsDebug.countDocuments(filter);
        const insights = await LogsDebug.find(filter)
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limit)
            .populate("secretKey", "-key");

        const hasMore = totalLogs > skip + insights.length;

        return res.status(200).json({
            status: "success",
            message: "Pending AI insights fetched successfully",
            data: insights,
            totalLogs,
            hasMore
        });
    } catch (error) {
        console.error("Error fetching pending AI insights:", error);
        return res.status(500).json({ status: "error", message: "Internal server error" });
    }
}

/**
 * Retrieves AI insights for a specific project log ID with pagination.
 * @param req - Express request object
 * @param res - Express response object
 * @returns JSON response with original log related insights
 */
export const getInsightsByProjectLogId = async (req: Request, res: Response) => {
    try {
        const { projectLogId } = req.params;
        const user = req.user;

        if (!projectLogId) {
            return res.status(400).json({ status: "error", message: "Project Log ID is required" });
        }

        if (!user) {
            return res.status(401).json({ status: "error", message: "Unauthorized" });
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const skip = (page - 1) * limit;

        const filter = { projectLogId, user: user.id };

        const totalLogs = await LogsDebug.countDocuments(filter);
        const insights = await LogsDebug.find(filter)
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limit)
            .populate("secretKey", "-key");

        const hasMore = totalLogs > skip + insights.length;

        return res.status(200).json({
            status: "success",
            message: "AI insights for project log fetched successfully",
            data: insights,
            totalLogs,
            hasMore
        });
    } catch (error) {
        console.error("Error fetching AI insights by project log ID:", error);
        return res.status(500).json({ status: "error", message: "Internal server error" });
    }
}
