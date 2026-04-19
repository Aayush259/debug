import dotenv from "dotenv";

dotenv.config();

const config = {
    port: Number(process.env.PORT) || 3000,

    better_auth_secret: process.env.BETTER_AUTH_SECRET || "",
    better_auth_url: process.env.BETTER_AUTH_URL || "",

    frontend_url: process.env.FRONTEND_URL || "",

    mongo_db_name: process.env.MONGO_DB_NAME || "",
    mongo_uri: process.env.MONGO_URI || "",
    mongo_user: process.env.MONGO_USER || "",
    mongo_password: process.env.MONGO_PASSWORD || "",

    redis_host: process.env.REDIS_HOST || "127.0.0.1",
    redis_port: process.env.REDIS_PORT || "6379",

    google_client_id: process.env.GOOGLE_CLIENT_ID || "",
    google_client_secret: process.env.GOOGLE_CLIENT_SECRET || "",

    github_client_id: process.env.GITHUB_CLIENT_ID || "",
    github_client_secret: process.env.GITHUB_CLIENT_SECRET || "",

    lemon_squeezy_api_key: process.env.LEMON_SQUEEZY_API_KEY || "",
    lemon_squeezy_webhook_secret: process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || "",
    lemon_squeezy_store_id: process.env.LEMON_SQUEEZY_STORE_ID || "",
    lemon_squeezy_store_subdomain: process.env.LEMON_SQUEEZY_STORE_SUBDOMAIN || "",
    lemon_squeezy_variant_id_dev: process.env.LEMON_SQUEEZY_VARIANT_ID_DEV_PLAN || "",
    lemon_squeezy_variant_id_enterprise: process.env.LEMON_SQUEEZY_VARIANT_ID_ENTERPRISE_PLAN || "",

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
