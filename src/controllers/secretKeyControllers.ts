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
                image
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

        const secretKeys = await SecretKey.find({ user: user.id });

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
