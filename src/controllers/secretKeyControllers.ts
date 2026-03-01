import { Request, Response } from "express";
import { SecretKey } from "../models/secretKeyModel.js";

export const generateSecretKey = async (req: Request, res: Response) => {
    try {
        const { projectName, image } = req.body;

        if (!projectName) {
            return res.status(400).json({ error: "Project name is required" });
        }

        const user = req.user;

        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const key = crypto.randomUUID();

        const secretKey = await SecretKey.create({
            projectName,
            user: user.id,
            key,
            image
        });

        return res.status(201).json({
            status: "success",
            message: "Secret key generated successfully",
            data: {
                key,
                projectName,
                image,
                user: user.id,
                createdAt: secretKey.createdAt,
                updatedAt: secretKey.updatedAt,
                _id: secretKey._id
            }
        });
    } catch (error) {
        console.error("Error generating secret key:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export const getAllSecretKeys = async (req: Request, res: Response) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const secretKeys = await SecretKey.find({ user: user.id }).select("-key");

        return res.status(200).json({
            status: "success",
            message: "Secret keys retrieved successfully",
            data: secretKeys
        });
    } catch (error) {
        console.error("Error retrieving secret keys:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export const deleteSecretKey = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user;

        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        if (!id) {
            return res.status(400).json({ error: "Secret key ID is required" });
        }

        const secretKey = await SecretKey.findOne({ _id: id, user: user.id });

        if (!secretKey) {
            return res.status(404).json({ error: "Secret key not found" });
        }

        await secretKey.deleteOne();

        return res.status(200).json({
            status: "success",
            message: "Secret key deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting secret key:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
