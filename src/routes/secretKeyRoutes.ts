import express from "express";
import { generateSecretKey, getAllSecretKeys } from "../controllers/secretKeyControllers.js";

const router = express.Router();

router.post("/generate", generateSecretKey);
router.get("/all", getAllSecretKeys);

export default router;
