// packages/worker/src/forwarder.ts
import nodemailer from 'nodemailer';

export class EmailForwarder {
    private transporter;

    constructor() {
        this.transporter = nodemailer.createTransporter({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD
            }
        });
    }

    async forward(options: {
        to: string;
        from: any;
        subject: string;
        text?: string;
        html?: string;
        attachments?: any[];
    }): Promise<boolean> {
        try {
            const mailOptions = {
                from: `"Privacy Mail" <${process.env.GMAIL_USER}>`,
                to: options.to,
                subject: options.subject,
                text: this.buildTextContent(options),
                html: this.buildHtmlContent(options),
                attachments: options.attachments || []
            };

            await this.transporter.sendMail(mailOptions);
            return true;
        } catch (error) {
            console.error('Forward failed:', error);
            return false;
        }
    }

    private buildTextContent(options: any): string {
        return `
--- Forwarded Message ---
From: ${options.from?.text || 'Unknown'}
Subject: ${options.subject}

${options.text || 'No text content'}
    `;
    }

    private buildHtmlContent(options: any): string {
        const htmlContent = options.html || options.text || 'No content';

        return `
      <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #007cba; margin-bottom: 20px;">
        <h4 style="margin: 0 0 10px 0; color: #333;">Forwarded Message</h4>
        <p style="margin: 5px 0; color: #666;">
          <strong>From:</strong> ${options.from?.text || 'Unknown'}<br>
          <strong>Original Subject:</strong> ${options.subject}
        </p>
      </div>
      <div>
        ${htmlContent}
      </div>
    `;
    }
}