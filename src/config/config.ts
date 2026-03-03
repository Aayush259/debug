import dotenv from "dotenv";

dotenv.config();

const config = {
    port: Number(process.env.PORT) || 3000,
    mongo_db_name: process.env.MONGO_DB_NAME || "",
    mongo_uri: process.env.MONGO_URI || "",
    better_auth_secret: process.env.BETTER_AUTH_SECRET || "",
    better_auth_url: process.env.BETTER_AUTH_URL || "",
    frontend_url: process.env.FRONTEND_URL || "",
    google_client_id: process.env.GOOGLE_CLIENT_ID || "",
    google_client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
    github_client_id: process.env.GITHUB_CLIENT_ID || "",
    github_client_secret: process.env.GITHUB_CLIENT_SECRET || "",
    encryption_key: process.env.ENCRYPTION_KEY || "",
}

export default config;
