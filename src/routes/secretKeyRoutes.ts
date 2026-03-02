import express from "express";
import { generateSecretKey, getAllSecretKeys, deleteSecretKey, updateSecretKey, getSecretKeyById } from "../controllers/secretKeyControllers.js";

const router = express.Router();

router.get("/all", getAllSecretKeys);
router.get("/:id", getSecretKeyById);

router.post("/generate", generateSecretKey);
router.post("/update/:id", updateSecretKey);

router.delete("/:id", deleteSecretKey);

export default router;
