import express from "express";
import { getLogDetails, getProjectLogs } from "../controllers/projectLogsControllers.js";

const router = express.Router();

router.get("/get-all/:projectId", getProjectLogs);
router.get("/:id", getLogDetails);

export default router;
