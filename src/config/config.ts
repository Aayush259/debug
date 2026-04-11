import dotenv from "dotenv";

dotenv.config();

const config = {
    port: Number(process.env.PORT) || 3000,

    mongo_db_name: process.env.MONGO_DB_NAME || "",
    mongo_uri: process.env.MONGO_URI || "",
    mongo_user: process.env.MONGO_USER || "",
    mongo_password: process.env.MONGO_PASSWORD || "",

    redis_host: process.env.REDIS_HOST || "127.0.0.1",
    redis_port: process.env.REDIS_PORT || "6379",

    better_auth_secret: process.env.BETTER_AUTH_SECRET || "",
    better_auth_url: process.env.BETTER_AUTH_URL || "",

    frontend_url: process.env.FRONTEND_URL || "",

    google_client_id: process.env.GOOGLE_CLIENT_ID || "",
    google_client_secret: process.env.GOOGLE_CLIENT_SECRET || "",

    github_client_id: process.env.GITHUB_CLIENT_ID || "",
    github_client_secret: process.env.GITHUB_CLIENT_SECRET || "",

    encryption_key: process.env.ENCRYPTION_KEY || "",

    llm_provider: process.env.LLM_PROVIDER || "",
    llm_model: process.env.LLM_MODEL || "",
    llm_api_key: process.env.LLM_API_KEY || "",

    mail_host: process.env.SMTP_HOST || "",
    mail_port: Number(process.env.SMTP_PORT) || 465,
    mail_user: process.env.SMTP_USER || "",
    mail_password: process.env.SMTP_PASS || "",
    mail_from: process.env.SMTP_FROM || "",
}

export default config;
