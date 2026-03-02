import express from "express";
import { getLogDetails } from "../controllers/projectLogsControllers.js";

const router = express.Router();

router.get("/:id", getLogDetails);

export default router;
