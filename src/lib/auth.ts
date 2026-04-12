/**
 * @file auth.ts
 * @description Authentication engine initialization for the Zag platform.
 * 
 * CORE CONCEPT:
 * This file configures and exports the `better-auth` instance, which serves 
 * as the centralized identity and session management system for the application.
 * 
 * Capabilities:
 * 1. Social Login: Enables authentication via GitHub and Google to simplify 
 *    the developer onboarding experience.
 * 2. Session Management: Handles session creation, validation, and persistence, 
 *    ensuring secure access to the Zag dashboard.
 * 3. Database Persistence: Uses the `mongodbAdapter` linked to the raw MongoDB 
 *    driver (from `db.ts`) for efficient session and account storage.
 */

import { db } from "./database/db.js";
import config from "../config/config.js";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { customSession } from "better-auth/plugins";
import { UserPlan } from "../models/userPlan.js";
import { UserSettings } from "../models/userSettings.js";

/**
 * auth
 * The primary better-auth instance for identity management.
 */
export const auth = betterAuth({
    database: mongodbAdapter(db),
    trustedOrigins: [config.frontend_url],
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
    },
    databaseHooks: {
        user: {
            create: {
                after: async (user) => {
                    // Initialize UserPlan upon signup
                    await UserPlan.create({
                        user: user.id,
                        planType: "hobby",
                        planStartDate: new Date(),
                        planEndDate: null,
                        remainingProjects: 3,
                        remainingFreeInsights: 10,
                        remainingPreservedLogs: 500,
                        totalProjects: 3,
                        totalFreeInsights: 10,
                        totalPreservedLogs: 500,
                        price: 0,
                        byok: false,
                        emailAlerts: false,
                        status: "active"
                    });

                    // Initialize UserSettings upon signup
                    await UserSettings.create({
                        user: user.id
                    });
                }
            }
        }
    },
    plugins: [
        customSession(async ({ user, session }) => {
            // Still fetch the plan to include it in the session for the frontend
            const plan = await UserPlan.findOne({ user: user.id });
            return { session, user, plan };
        })
    ]
})
