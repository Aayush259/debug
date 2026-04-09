/**
 * @file secretKeyControllers.ts
 * @description Management engine for project API tokens and identifiers.
 * 
 * CORE CONCEPT:
 * This controller manages the "Secure Bridges" (Secret Keys) that link 
 * external applications to the Zag platform. It handles the CRUD 
 * operations for projects and their associated security credentials.
 * 
 * Responsibilities:
 * 1. Key Generation: Securely creates unique API tokens (hashed via 
 *    bcrypt in the model layer) for project identification.
 * 2. Project Management: Allows developers to update human-readable 
 *    metadata like project names and icons.
 * 3. Access Control: Ensures developers can only manage and view 
 *    keys belonging to their own account.
 * 4. Token Visibility: Manages the secure display and deletion of 
 *    sensitive API keys.
 * 
 * Consumer:
 * - These functions are exclusively called by the dashboard internal 
 *   routes to populate the Zag Dashboard UI.
 * 
 * Note: Decryption and verification of these keys during log ingestion 
 * is handled separately in the `projectLogsControllers.ts` ingestion flow.
 */

import { Request, Response } from "express";
import { SecretKey } from "../models/secretKeyModel.js";

/**
 * Generates a new secret key for the authenticated user.
 * @param req - Express request object
 * @param res - Express response object
 * @returns JSON response with the generated secret key
 */
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

/**
 * Updates an existing secret key.
 * @param req - Express request object
 * @param res - Express response object
 * @returns JSON response with the updated secret key
 */
export const updateSecretKey = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { projectName, image } = req.body;
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

        if (projectName) {
            secretKey.projectName = projectName;
        }

        if (image) {
            secretKey.image = image;
        }

        await secretKey.save();

        return res.status(200).json({
            status: "success",
            message: "Secret key updated successfully",
            data: {
                projectName: secretKey.projectName,
                image: secretKey.image,
                user: secretKey.user,
                createdAt: secretKey.createdAt,
                updatedAt: secretKey.updatedAt,
                _id: secretKey._id
            }
        });
    } catch (error) {
        console.error("Error updating secret key:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * Retrieves all secret keys for the authenticated user.
 * @param req - Express request object
 * @param res - Express response object
 * @returns JSON response with all secret keys
 */
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

/**
 * Retrieves a secret key by ID.
 * @param req - Express request object
 * @param res - Express response object
 * @returns JSON response with the secret key
 */
export const getSecretKeyById = async (req: Request, res: Response) => {
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

        return res.status(200).json({
            status: "success",
            message: "Secret key retrieved successfully",
            data: secretKey
        });
    } catch (error) {
        console.error("Error retrieving secret key:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * Deletes a secret key.
 * @param req - Express request object
 * @param res - Express response object
 * @returns JSON response with the deleted secret key
 */
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
