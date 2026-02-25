import { db } from "./db";
import config from "../config/config";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";

export const auth = betterAuth({
    database: mongodbAdapter(db),
    emailAndPassword: { enabled: false },
    socialProviders: {
        github: {
            clientId: config.github_client_id,
            clientSecret: config.github_client_secret,
        },
        google: {
            clientId: config.google_client_id,
            clientSecret: config.google_client_secret,
        }
    }
})
