import express from "express";
import { getPendingInsights, getInsightsBySecretKeyId, markInsightAsResolved } from "../controllers/logsDebugControllers.js";

const router = express.Router();

router.get("/pending", getPendingInsights);
router.get("/project-log/:secretKey", getInsightsBySecretKeyId);

router.post("/mark-resolved/:id", markInsightAsResolved);

export default router;
