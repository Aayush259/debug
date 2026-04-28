/**
 * @file socketAuthMiddleware.ts
 * @description Authentication middleware for Socket.IO connections.
 * 
 * CORE CONCEPT:
 * This middleware secures the WebSocket layer. It ensures that real-time 
 * log streaming is only available to authenticated users by validating 
 * their session headers before allowing the connection to upgrade.
 */

import { auth } from "../lib/auth.js";

/**
 * socketAuthMiddleware
 * Intercepts Socket.IO connection attempts and validates user sessions.
 */
export const socketAuthMiddleware = async (socket: any, next: (err?: Error) => void) => {
    try {
        const webHeaders = new Headers();
        // Convert Socket.IO request headers to standard Web Headers
        for (const [key, value] of Object.entries(socket.request.headers)) {
            if (value !== undefined) {
                if (Array.isArray(value)) {
                    value.forEach((v) => webHeaders.append(key, v));
                } else {
                    webHeaders.append(key, value as string);
                }
            }
        }

        // Validate session via Better-Auth
        const sessionPayload = await auth.api.getSession({
            headers: webHeaders,
        });

        if (!sessionPayload) {
            return next(new Error("Unauthorized"));
        }

        // Attach user data to the socket for use in event handlers (e.g., joining rooms)
        socket.data.user = sessionPayload.user;
        socket.data.session = sessionPayload.session;

        next();
    } catch (error) {
        console.error(" => [MIDDLEWARE ERROR: socketAuthMiddleware] Socket Auth Error:", error);
        next(new Error("Internal Server Error"));
    }
};
