/**
 * @file mail.test.ts
 * @description Unit tests for the platform's Mailing Service.
 * 
 * CORE CONCEPT:
 * This test suite validates that the system correctly formats and dispatches 
 * transactional emails. We use a global nodemailer mock to avoid sending real 
 * emails while verifying the internal templating logic and service orchestration.
 */

import { mailService } from "../../../lib/services/mailService.js";
import { mockSendMail } from "../../setup.js";
import config from "../../../config/config.js";

describe("Mail Service", () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    /**
     * TEST: Basic Email Dispatch
     * Verifies that the low-level sendMail method correctly passes 
     * parameters to nodemailer.
     */
    it("should send a basic email with correct parameters", async () => {
        const to = "test@example.com";
        const subject = "Test Subject";
        const html = "<p>Hello World</p>";

        await mailService.sendMail(to, subject, html);

        expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
            to,
            subject,
            html,
            from: expect.stringContaining(config.mail_from)
        }));
    });

    /**
     * TEST: AI Insight Templating
     * Verifies that the service constructs a rich HTML email and handles 
     * optional "Insight Preview" blocks.
     */
    it("should correctly handle AI insight preview in the email template", async () => {
        const params = {
            email: "dev@company.com",
            name: "John Doe",
            projectName: "Payment Service",
            errorMessage: "ReferenceError: x is not defined",
            appLink: "https://krvyu.com/logs/123",
            insightGlimpse: "This likely happens because the variable 'x' wasn't initialized."
        };

        await mailService.sendAIInsightEmail(params);

        // Verify it was called
        expect(mockSendMail).toHaveBeenCalledOnce();

        // Check the HTML content for the insight preview
        const callArgs = vi.mocked(mockSendMail).mock.calls[0][0];
        expect(callArgs.html).toContain(params.insightGlimpse);
        expect(callArgs.html).toContain(params.projectName);
        expect(callArgs.html).toContain(params.name);
    });

    /**
     * TEST: Missing Insight Logic
     * Ensures the email template is still valid and doesn't crash when 
     * no AI insight is provided.
     */
    it("should send a valid email when insight preview is missing", async () => {
        const params = {
            email: "dev@company.com",
            name: "John Doe",
            projectName: "Payment Service",
            errorMessage: "ReferenceError: x is not defined",
            appLink: "https://krvyu.com/logs/123"
        };

        await mailService.sendAIInsightEmail(params);

        expect(mockSendMail).toHaveBeenCalledOnce();

        const callArgs = vi.mocked(mockSendMail).mock.calls[0][0];
        expect(callArgs.html).not.toContain("Insight Preview"); // Block should be absent
        expect(callArgs.html).toContain("See in console"); // Fallback CTA should be present
    });

    /**
     * TEST: Error Propagation
     * Verifies that SMTP-level errors are correctly bubbled up.
     */
    it("should propagate errors from the mail transporter", async () => {
        mockSendMail.mockRejectedValueOnce(new Error("SMTP Server Timeout"));

        await expect(mailService.sendMail("to@test.com", "sub", "html"))
            .rejects.toThrow("SMTP Server Timeout");
    });
});
