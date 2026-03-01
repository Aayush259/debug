import express from "express";
import { generateSecretKey, getAllSecretKeys, deleteSecretKey } from "../controllers/secretKeyControllers.js";

const router = express.Router();

router.post("/generate", generateSecretKey);
router.get("/all", getAllSecretKeys);
router.delete("/:id", deleteSecretKey);

export default router;
