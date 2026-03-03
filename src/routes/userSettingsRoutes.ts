import express from "express";
import { getUserSettings, updateUserSettings } from "../controllers/userSettingsControllers.js";

const router = express.Router();

router.get("/", getUserSettings);

router.post("/", updateUserSettings);

export default router;
