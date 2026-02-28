import express from "express";
import config from "./config/config.js";
import { connectDB } from "./lib/database.js";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import { requireAuth } from "./middleware/authMiddleware.js";
import secretKeyRoutes from "./routes/secretKeyRoutes.js";

const app = express();
app.use(cors({
    origin: config.frontend_url,
    credentials: true,
}));


app.get("/", (req, res) => {
    res.send("Hello world!");
});

app.use("/api/auth", toNodeHandler(auth));

app.use(express.json());
app.use("/api/secret-key", requireAuth, secretKeyRoutes);

app.listen(config.port, async () => {
    await connectDB();
    console.log("Server running on port", config.port);
});
