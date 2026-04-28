/**
 * @file socketAuth.test.ts
 * @description Unit tests for the Socket.IO authentication middleware.
 * 
 * CORE CONCEPT:
 * This suite ensures that your real-time log stream is only accessible 
 * to authenticated developers. We verify that the middleware correctly 
 * parses WebSocket headers and interacts with Better-Auth before 
 * granting access to the event loop.
 */

import { socketAuthMiddleware } from "../../middleware/socketAuthMiddleware.js";
import { auth } from "../../lib/auth.js";

describe("Socket.IO Auth Middleware", () => {
    let mockSocket: any;
    let nextFunction: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // 1. Setup Mock Socket
        mockSocket = {
            request: {
                headers: {
                    cookie: "session_token=valid_socket_token"
                }
            },
            data: {}
        };

        nextFunction = vi.fn();
    });

    /**
     * TEST: Successful WebSocket Authentication
     * Verifies that valid headers allow the connection and populate socket.data.
     */
    it("should allow connection and populate socket.data if session is valid", async () => {
        const mockUser = { id: "user_socket", name: "Socket User" };
        const mockSession = { id: "sess_socket" };

        vi.mocked(auth.api.getSession).mockResolvedValue({
            user: mockUser,
            session: mockSession
        } as any);

        await socketAuthMiddleware(mockSocket, nextFunction);

        // Verify next() called with NO error and data attached
        expect(nextFunction).toHaveBeenCalledWith();
        expect(mockSocket.data.user).toEqual(mockUser);
        expect(mockSocket.data.session).toEqual(mockSession);
    });

    /**
     * TEST: Rejected WebSocket Connection
     * Verifies that unauthorized connections are blocked with an Error.
     */
    it("should reject connection with 'Unauthorized' if no session is found", async () => {
        vi.mocked(auth.api.getSession).mockResolvedValue(null);

        await socketAuthMiddleware(mockSocket, nextFunction);

        // Socket.IO expects next(Error) for rejections
        expect(nextFunction).toHaveBeenCalledWith(expect.any(Error));
        const error = nextFunction.mock.calls[0][0];
        expect(error.message).toBe("Unauthorized");
    });

    /**
     * TEST: Internal Error Handling
     * Verifies that crashes in the auth provider are caught safely.
     */
    it("should return 'Internal Server Error' if auth check fails", async () => {
        vi.mocked(auth.api.getSession).mockRejectedValue(new Error("Database Timeout"));

        await socketAuthMiddleware(mockSocket, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith(expect.any(Error));
        const error = nextFunction.mock.calls[0][0];
        expect(error.message).toBe("Internal Server Error");
    });
});
