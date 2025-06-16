// utils/emailSender.ts
import * as nodemailer from "nodemailer";

export interface SendEmailOptions {
    from: string;
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    attachments?: Array<{
        filename: string;
        content: Buffer | string;
        contentType?: string;
    }>;
    replyTo?: string;
    cc?: string | string[];
    bcc?: string | string[];
}

export interface EmailResult {
    success: boolean;
    messageId?: string;
    error?: string;
    deliveryStatus: "sent" | "failed" | "pending";
}

class EmailSender {
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: "localhost",
            port: 2525,
            secure: false, // Changed to false for port 25
            // Remove auth if your SMTP server doesn't require it
            // auth: {
            //     user: "username",
            //     pass: "password",
            // },
            tls: {
                rejectUnauthorized: false,
            },
        });
    }

    async sendEmail(options: SendEmailOptions): Promise<EmailResult> {
        try {
            console.log(`📤 Sending email to: ${options.to}`);

            // Create unique message ID for tracking
            const messageId = `${Date.now()}-${Math.random()
                .toString(36)
                .substr(2, 9)}@localhost`;

            const mailOptions: nodemailer.SendMailOptions = {
                from: options.from,
                to: options.to,
                subject: options.subject,
                text: options.text,
                html: options.html,
                attachments: options.attachments,
                replyTo: options.replyTo,
                cc: options.cc,
                bcc: options.bcc,
                messageId: messageId,
            };

            const result = await this.transporter.sendMail(mailOptions);

            console.log(`✅ Email sent successfully: ${result.messageId}`);
            console.log(`📧 Response:`, result.response);

            return {
                success: true,
                messageId: result.messageId,
                deliveryStatus: "sent",
            };
        } catch (error) {
            console.error("❌ Failed to send email:", error);

            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
                deliveryStatus: "failed",
            };
        }
    }

    // Test connection to your SMTP server
    async testConnection(): Promise<boolean> {
        try {
            await this.transporter.verify();
            console.log("✅ SMTP server connection successful");
            return true;
        } catch (error) {
            console.error("❌ SMTP server connection failed:", error);
            return false;
        }
    }

    // Test email function
    async sendTestEmail(toEmail: string = "nischaldahal01395@gmail.com"): Promise<void> {
        console.log("🧪 Testing email sending...");

        const testResult = await this.sendEmail({
            from: "test@localhost",
            to: toEmail,
            subject: "Test Email from Custom SMTP Server",
            text: "This is a test email sent from our custom SMTP server!",
            html: `
                <h1>🎉 Test Email</h1>
                <p>This is a test email sent from our custom SMTP server!</p>
                <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
                <p><strong>Server:</strong> localhost:25</p>
            `,
        });

        if (testResult.success) {
            console.log("🎉 Test email sent successfully!");
            console.log(`📧 Message ID: ${testResult.messageId}`);
        } else {
            console.log("❌ Test email failed!");
            console.log(`💥 Error: ${testResult.error}`);
        }
    }
}

export const emailSender = new EmailSender();

// Test function you can call directly
export async function testEmailSending(toEmail?: string) {
    console.log("🚀 Starting email test...");

    // Test connection first
    const connectionTest = await emailSender.testConnection();
    if (!connectionTest) {
        console.log("❌ Cannot proceed - SMTP connection failed");
        return;
    }

    // Send test email
    await emailSender.sendTestEmail(toEmail);
}

testEmailSending();