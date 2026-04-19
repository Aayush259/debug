/**
 * @file authMiddleware.ts
 * @description Authentication middleware for the Krvyu SaaS platform.
 * 
 * CORE CONCEPT:
 * The `requireAuth` middleware ensures that only authenticated users 
 * can access the protected routes consumed by the **Krvyu Frontend**.
 * It validates sessions and prevents unauthorized access to sensitive 
 * project data and AI insights.
 * 
 * Workflow:
 * 1. Extraction: Retrieves session information from incoming request headers 
 *    sent by the Krvyu Frontend.
 * 2. Validation: Uses better-auth to check if a valid session exists.
 * 3. Injection: Attaches the `user` and `session` objects to the Express 
 *    Request for use by downstream controllers.
 * 4. Rejection: Terminates unauthorized requests with a 401 response.
 */

import { Request, Response, NextFunction } from "express";
import { auth } from "../lib/auth.js";

/** 
 * SessionType
 * Inferred session types directly from the Better Auth instance.
 */
type SessionType = typeof auth.$Infer.Session;

/**
 * Global Request Expansion
 * Augment the Express Request interface to include user and session safely.
 */
declare global {
    namespace Express {
        interface Request {
            user?: SessionType["user"];
            session?: SessionType["session"];
        }
    }
}

/**
 * requireAuth Middleware
 * Protects routes by enforcing session-based authentication.
 */
export const requireAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Convert Express IncomingHttpHeaders to standard Web Headers without type casting
        const webHeaders = new Headers();
        for (const [key, value] of Object.entries(req.headers)) {
            if (value !== undefined) {
                if (Array.isArray(value)) {
                    value.forEach(v => webHeaders.append(key, v));
                } else {
                    webHeaders.append(key, value);
                }
            }
        }

        // Better Auth API retrieves the session using node headers
        const sessionPayload = await auth.api.getSession({
            headers: webHeaders
        });

        if (!sessionPayload) {
            res.status(401).json({ error: "Unauthorized: Please log in." });
            return;
        }

        // Attach user and session to the request context in a type-safe manner
        req.user = sessionPayload.user;
        req.session = sessionPayload.session;

        next();
    } catch (error) {
        console.error(" => [LIB ERROR: authMiddleware] Auth Middleware Error:", error instanceof Error ? error.message : String(error));
        res.status(500).json({ error: "Internal Server Error" });
    }
};
