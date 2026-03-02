import mongoose from "mongoose";

const projectLogsSchema = new mongoose.Schema({
    log: {
        type: String,
        required: true
    },
    secretKeyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SecretKey",
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
}, { timestamps: true });

export const ProjectLogs = mongoose.models.ProjectLogs || mongoose.model("ProjectLogs", projectLogsSchema, "projectLogs");
