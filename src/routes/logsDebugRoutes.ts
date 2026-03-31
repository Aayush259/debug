import express from "express";
import { getPendingInsights, getInsightsByProjectLogId } from "../controllers/logsDebugControllers.js";

const router = express.Router();

router.get("/pending", getPendingInsights);
router.get("/project-log/:projectLogId", getInsightsByProjectLogId);

export default router;
