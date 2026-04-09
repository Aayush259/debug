/**
 * @file mailService.ts
 * @description Outgoing email communication service for the Zag platform.
 * 
 * CORE CONCEPT:
 * The Mail Service handles all transactional and notification-based emails 
 * sent to developers. It acts as the primary "off-platform" channel for 
 * delivering critical alerts and system updates.
 * 
 * Responsibilities:
 * 1. Proactive Alerts: Delivering "AI Insight" notifications directly to the 
 *    user's inbox when a significant issue is detected in their application.
 * 2. Templating: Constructing rich HTML email content (like the AI Insight 
 *    alert) using modern CSS-in-HTML techniques for maximum compatibility.
 * 
 * Infrastructure:
 * - Uses `nodemailer` to interface with the platform's SMTP server.
 * - Configuration is centralized via the project's `config.js`.
 */

import nodemailer from "nodemailer";
import config from "../config/config.js";

/**
 * MailService
 * A singleton class providing high-level methods for email delivery.
 */
class MailService {
    private transporter = nodemailer.createTransport({
        host: config.mail_host,
        port: config.mail_port,
        secure: true,
        auth: {
            user: config.mail_user,
            pass: config.mail_password,
        }
    })

    async sendMail(to: string, subject: string, html: string) {
        try {
            const info = await this.transporter.sendMail({
                from: `"Zag" <${config.mail_from}>`,
                to,
                subject,
                html,
            });
            console.log(`[MailService] ✅ Email sent: ${info.messageId}`);
            return info;
        } catch (error) {
            console.error(`[MailService] ❌ Error sending email:`, error);
            throw error;
        }
    }

    async sendAIInsightEmail({
        email,
        name,
        projectName,
        errorMessage,
        insightGlimpse,
        appLink
    }: {
        email: string;
        name: string;
        projectName: string;
        errorMessage: string;
        insightGlimpse: string;
        appLink: string;
    }) {
        const subject = `Error Log Detected in ${projectName} - Action Required`;
        const html = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); border: 1px solid #eaeaea;">
                <div style="background-color: #1a1a1a; padding: 24px 32px; border-bottom: 3px solid #e11d48;">
                    <h2 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">Zag</h2>
                </div>
                
                <div style="padding: 32px;">
                    <h3 style="margin-top: 0; margin-bottom: 16px; color: #111827; font-size: 22px; font-weight: 600;">Issue Detected in ${projectName}</h3>
                    
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-top: 0; margin-bottom: 24px;">
                        Hello ${name},<br><br>
                        Zag detected an error log in <strong>${projectName}</strong>.
                    </p>
                    
                    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                        <h4 style="margin-top: 0; margin-bottom: 8px; color: #991b1b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Log Statement</h4>
                        <pre style="margin: 0; color: #7f1d1d; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 13px; white-space: pre-wrap; word-break: break-all;">${errorMessage}</pre>
                    </div>

                    <div style="background-color: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 32px;">
                        <h4 style="margin-top: 0; margin-bottom: 8px; color: #374151; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Insight Preview</h4>
                        <p style="margin: 0; color: #1f2937; font-size: 15px; line-height: 1.6;">${insightGlimpse}</p>
                    </div>

                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 32px;">
                        <tr>
                            <td align="center">
                                <a href="${appLink}" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; padding: 14px 28px; font-size: 16px; font-weight: 500; text-decoration: none; border-radius: 6px; text-align: center;">
                                    View Full Solution
                                </a>
                            </td>
                        </tr>
                    </table>

                    <hr style="border: 0; border-top: 1px solid #eaeaea; margin-bottom: 24px;">
                    
                    <p style="margin: 0; color: #9ca3af; font-size: 14px; line-height: 1.5; text-align: center;">
                        This is an automated notification from Zag.<br>
                        Visit your project console to configure alert settings.
                    </p>
                </div>
            </div>
        `;

        return this.sendMail(email, subject, html);
    }
}

export const mailService = new MailService();
