import { Request, Response, NextFunction } from "express";
import { auth } from "../lib/auth.js";

// Infer session types directly from the Better Auth instance
type SessionType = typeof auth.$Infer.Session;

// Augment the Express Request interface to include user and session safely
declare global {
    namespace Express {
        interface Request {
            user?: SessionType["user"];
            session?: SessionType["session"];
        }
    }
}

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
        console.error("Auth Middleware Error:", error instanceof Error ? error.message : String(error));
        res.status(500).json({ error: "Internal Server Error" });
    }
};
