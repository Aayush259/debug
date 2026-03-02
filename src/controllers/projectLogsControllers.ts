import { Request, Response } from "express";
import { ProjectLogs } from "../models/projectLogsModel";
import { SecretKey } from "../models/secretKeyModel";
import { EVENTS } from "../lib/utils.js";

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

        // Query filtering by both secretKeyId and user to ensure ownership and avoid 403 errors on empty results
        const filter = { secretKeyId: projectId, user: user.id };

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
        console.error("Error fetching project logs:", error);
        return res.status(500).json({ status: "error", message: "Internal server error" });
    }
}

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
        console.error("Error fetching log details:", error);
        return res.status(500).json({ status: "error", message: "Internal server error" });
    }
}

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

        const savedLogs = await ProjectLogs.insertMany(logs.map((log: any) => ({
            log,
            secretKeyId: keyId,
            user: secretKey.user
        })));

        // Send logs via Socket.IO
        const io = req.app.get("io");
        if (io) {
            io.to(secretKey.user.toString()).emit(EVENTS.GET_LOGS, savedLogs);
        }

        return res.status(201).json({
            status: "success",
            message: "Logs saved successfully"
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: "error", message: "Internal server error" });
    }
}
