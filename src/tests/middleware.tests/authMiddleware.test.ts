/**
 * @file authMiddleware.test.ts
 * @description Unit tests for the requireAuth dashboard protection middleware.
 * 
 * CORE CONCEPT:
 * This suite validates the "Identity Gate" of the Krvyu platform. We verify 
 * that the middleware correctly interacts with Better-Auth to allow 
 * developers in while strictly blocking anonymous or invalid requests.
 */

import { requireAuth } from "../../middleware/authMiddleware.js";
import { auth } from "../../lib/auth.js";

describe("requireAuth Middleware", () => {
    let mockReq: any;
    let mockRes: any;
    let nextFunction: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // 1. Setup Mock Request/Response/Next
        mockReq = {
            headers: {
                cookie: "session_token=valid"
            }
        };

        mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        };

        nextFunction = vi.fn();
    });

    /**
     * TEST: Authorized Access
     * Verifies that valid session headers result in user injection and continuation.
     */
    it("should allow access and populate req.user if a valid session is found", async () => {
        const mockUser = { id: "user_123", name: "Test User", email: "test@krvyu.com" };
        const mockSession = { id: "sess_123", expiresAt: new Date() };

        // Simulate a successful better-auth session retrieval
        vi.mocked(auth.api.getSession).mockResolvedValue({
            user: mockUser,
            session: mockSession
        } as any);

        await requireAuth(mockReq, mockRes, nextFunction);

        // Verify next() was called and user was attached
        expect(nextFunction).toHaveBeenCalled();
        expect(mockReq.user).toEqual(mockUser);
        expect(mockReq.session).toEqual(mockSession);
    });

    /**
     * TEST: Unauthorized Access
     * Verifies that requests with no active session are rejected with 401.
     */
    it("should return 401 if no session is found", async () => {
        // Simulate no session found
        vi.mocked(auth.api.getSession).mockResolvedValue(null);

        await requireAuth(mockReq, mockRes, nextFunction);

        // Verify 401 response and no next()
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized: Please log in." });
        expect(nextFunction).not.toHaveBeenCalled();
    });

    /**
     * TEST: Provider Error Handling
     * Verifies that the middleware doesn't crash the server if Better-Auth fails.
     */
    it("should return 500 if an internal error occurs during auth check", async () => {
        // Simulate a provider crash with a unique message to prove mocking is active
        vi.mocked(auth.api.getSession).mockRejectedValue(new Error("MOCKED_ERROR_FOR_STABILITY_TEST"));

        await requireAuth(mockReq, mockRes, nextFunction);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ error: "Internal Server Error" });
        expect(nextFunction).not.toHaveBeenCalled();
    });
});
