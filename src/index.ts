import express from "express";
import config from "./config/config.js";
import { connectDB } from "./lib/database.js";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";

const app = express();
app.use(express.json());
app.use(cors({
    origin: config.frontend_url,
    credentials: true,
}));

app.get("/", (req, res) => {
    res.send("Hello world!");
});

app.use("/api/auth", toNodeHandler(auth));

app.listen(config.port, async () => {
    await connectDB();
    console.log("Server running on port", config.port);
});
