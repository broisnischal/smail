import { SMTPServer } from "smtp-server";
import { simpleParser } from "mailparser";
import * as nodemailer from "nodemailer";
import { PrismaClient } from "../../shared/generated/prisma";

const prisma = new PrismaClient();

// Create a reusable transporter with the exact same config as the working test
const createTransporter = () => {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // Use SSL
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    // Use the exact same timeout settings as the working test
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });
};

const server = new SMTPServer({
  secure: false,
  authOptional: true,
  banner: "Broisnees",
  disabledCommands: ["STARTTLS"],

  async onRcptTo(address, session, callback) {
    const recipientEmail = address.address.toLowerCase();
    console.log(`📧 Validating recipient: ${recipientEmail}`);

    try {
      const isAllowed = await canReceiveEmailAtSMTPLevel(recipientEmail);

      if (isAllowed.allowed) {
        console.log(`✅ Email accepted for: ${recipientEmail}`);
        callback();
      } else {
        console.log(
          `❌ Email rejected for: ${recipientEmail} - Reason: ${isAllowed.reason}`,
        );
        callback(new Error(getSMTPErrorMessage(isAllowed.reason)));
      }
    } catch (error) {
      console.error("❌ Error validating recipient:", error);
      callback(new Error("450 Temporary failure, please try again later"));
    }
  },

  onMailFrom(address, session, callback) {
    console.log(`📨 Mail from: ${address.address}`);
    callback();
  },

  onData(stream, session, callback) {
    let mailData = "";

    stream.on("data", (chunk) => {
      mailData += chunk;
    });

    stream.on("end", async () => {
      try {
        console.log("📥 Processing incoming email...");
        const parsed = await simpleParser(mailData);
        await handleIncomingMail(parsed, session);
        callback();
      } catch (error) {
        console.error("❌ Email processing error:", error);
        callback(new Error("Processing failed"));
      }
    });
  },

  onError(err) {
    console.error("❌ SMTP Server error:", err);
  },
});

async function canReceiveEmailAtSMTPLevel(recipientEmail: string): Promise<{
  allowed: boolean;
  reason: string;
  aliasData?: any;
}> {
  try {
    console.log(`🔍 Checking alias: ${recipientEmail}`);

    const alias = await prisma.emailAlias.findFirst({
      where: {
        alias: recipientEmail.split("@")[0],
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        user: {
          include: {
            subscription: {
              include: {
                plan: true,
              },
            },
          },
        },
      },
    });

    if (!alias) {
      console.log(`❌ No alias found for: ${recipientEmail}`);
      return { allowed: false, reason: "ALIAS_NOT_FOUND" };
    }

    console.log(`✅ Alias found for user: ${alias.user.email}`);

    if (alias.expiresAt && alias.expiresAt <= new Date()) {
      return { allowed: false, reason: "ALIAS_EXPIRED" };
    }

    // Subscription checks are commented out as in your original code
    // if (!alias.user.subscription) {
    //   console.log(`⚠️ No subscription for user: ${alias.user.email}`);
    //   return { allowed: false, reason: "NO_SUBSCRIPTION" };
    // }

    return { allowed: true, reason: "VALID", aliasData: alias };
  } catch (error) {
    console.error("❌ Database error in SMTP validation:", error);
    return { allowed: false, reason: "VALIDATION_ERROR" };
  }
}

function getSMTPErrorMessage(reason: string): string {
  const errorMessages = {
    ALIAS_NOT_FOUND: "550 5.1.1 Recipient address rejected: User unknown",
    ALIAS_EXPIRED: "550 5.1.1 Recipient address rejected: Alias expired",
    NO_SUBSCRIPTION:
      "550 5.7.1 Recipient address rejected: No active subscription",
    SUBSCRIPTION_INACTIVE:
      "550 5.7.1 Recipient address rejected: Subscription inactive",
    SUBSCRIPTION_EXPIRED:
      "550 5.7.1 Recipient address rejected: Subscription expired",
    MONTHLY_LIMIT_EXCEEDED:
      "452 4.5.3 Recipient address rejected: Monthly forwarding limit exceeded",
    VALIDATION_ERROR: "450 4.3.0 Temporary failure, please try again later",
  };

  return errorMessages[reason] || "550 5.7.1 Recipient address rejected";
}

async function handleIncomingMail(mail: any, session: any) {
  const recipient = session.envelope.rcptTo[0].address.toLowerCase();

  try {
    console.log(`📧 Processing email for: ${recipient}`);

    console.log(process.env.GMAIL_USER);
    console.log(process.env.GMAIL_APP_PASSWORD);

    const alias = await prisma.emailAlias.findFirst({
      where: { alias: recipient.split("@")[0], isActive: true },
      include: { user: true },
    });

    if (!alias) {
      console.error("❌ Alias not found during processing");
      return;
    }

    const emailLog = await prisma.emailLog.create({
      data: {
        aliasId: alias.id,
        fromEmail: mail.from?.text || mail.from?.address || "unknown",
        toEmail: alias.user.email,
        subject: mail.subject || "No Subject",
        body: mail.text || mail.html || "",
        headers: JSON.stringify(mail.headers || {}),
        status: "received",
        receivedAt: new Date(),
      },
    });

    try {
      console.log(`📤 Forwarding email to: ${alias.user.email}`);
      await forwardEmail(mail, alias.user.email, recipient);

      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: { status: "forwarded", forwardedAt: new Date() },
      });

      await prisma.emailAlias.update({
        where: { id: alias.id },
        data: { emailCount: { increment: 1 } },
      });

      console.log(
        `✅ Email successfully processed: ${recipient} -> ${alias.user.email}`,
      );
    } catch (forwardError) {
      console.error("❌ Failed to forward email:", forwardError);
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: { status: "failed" },
      });
    }
  } catch (error) {
    console.error("❌ Error processing email:", error);
  }
}

async function forwardEmail(
  mail: any,
  forwardTo: string,
  originalRecipient: string,
) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    // Extract original sender info with proper null checks
    const originalFrom =
      mail.from?.text || mail.from?.address || "Unknown Sender";
    const originalSubject = mail.subject || "No Subject";
    const originalDate = mail.date || new Date().toISOString();

    // Create forwarding header
    const forwardingHeader = `
---------- Forwarded message ---------
From: ${originalFrom}
Date: ${new Date(originalDate).toLocaleString()}
Subject: ${originalSubject}
To: ${originalRecipient}

`;

    // Prepare text content
    let textContent = forwardingHeader;
    if (mail.text) {
      textContent += mail.text;
    } else if (mail.html) {
      textContent += "[HTML content - see HTML version of this email]";
    }

    // Prepare HTML content
    let htmlContent = "";
    if (mail.html) {
      htmlContent = `
        <div style="border-left: 3px solid #ccc; padding-left: 10px; margin: 10px 0;">
          <p style="color: #666; font-size: 12px; margin-bottom: 10px;">
            <strong>---------- Forwarded message ---------</strong><br>
            <strong>From:</strong> ${originalFrom}<br>
            <strong>Date:</strong> ${new Date(
        originalDate,
      ).toLocaleString()}<br>
            <strong>Subject:</strong> ${originalSubject}<br>
            <strong>To:</strong> ${originalRecipient}
          </p>
        </div>
        <div>
          ${mail.html}
        </div>
      `;
    } else if (mail.text) {
      htmlContent = `
        <div style="border-left: 3px solid #ccc; padding-left: 10px; margin: 10px 0;">
          <p style="color: #666; font-size: 12px; margin-bottom: 10px;">
            <strong>---------- Forwarded message ---------</strong><br>
            <strong>From:</strong> ${originalFrom}<br>
            <strong>Date:</strong> ${new Date(
        originalDate,
      ).toLocaleString()}<br>
            <strong>Subject:</strong> ${originalSubject}<br>
            <strong>To:</strong> ${originalRecipient}
          </p>
        </div>
        <div style="white-space: pre-wrap; font-family: monospace;">
          ${mail.text}
        </div>
      `;
    }

    // Process attachments
    let attachments = [];
    if (mail.attachments && mail.attachments.length > 0) {
      attachments = mail.attachments.map((attachment: any) => ({
        filename: attachment.filename || "attachment",
        content: attachment.content,
        contentType: attachment.contentType,
        encoding: attachment.encoding || "base64",
        cid: attachment.cid,
      }));
    }

    // Create headers with proper string types
    const customHeaders: { [key: string]: string } = {};

    if (originalFrom) {
      customHeaders["X-Forwarded-From"] = originalFrom;
    }
    customHeaders["X-Original-Recipient"] = originalRecipient;

    if (process.env.GMAIL_USER) {
      customHeaders["X-Forwarded-By"] = process.env.GMAIL_USER;
    }

    if (mail.messageId) {
      customHeaders["References"] = mail.messageId;
      customHeaders["In-Reply-To"] = mail.messageId;
    }

    const mailOptions = {
      from: process.env.GMAIL_USER!,
      to: forwardTo,
      subject: `Fwd: ${originalSubject}`,
      text: textContent,
      ...(htmlContent && { html: htmlContent }),
      attachments: attachments,
      headers: customHeaders,
    };

    console.log(`📤 Sending email to: ${forwardTo}`);
    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Email forwarded to ${forwardTo}:`, result.messageId);

    // Log forwarding details
    console.log({
      originalFrom: originalFrom,
      originalSubject: originalSubject,
      originalRecipient: originalRecipient,
      forwardedTo: forwardTo,
      attachmentCount: attachments.length,
      messageId: result.messageId,
      timestamp: new Date().toISOString(),
    });

    return result;
  } catch (error) {
    console.error("❌ Error forwarding email:", error);

    // Provide more specific error information
    if (error.code === 'EAUTH') {
      console.error("🔐 Authentication failed. Check Gmail credentials and App Password.");
    } else if (error.code === 'ETIMEDOUT') {
      console.error("⏰ Connection timeout. Check network connectivity and firewall settings.");
    } else if (error.code === 'ECONNECTION') {
      console.error("🌐 Connection failed. Check internet connectivity.");
    } else if (error.code === 'ESOCKET') {
      console.error("🔌 Socket error. Check network configuration.");
    }

    throw error;
  }
}

const PORT = process.env.NODE_ENV === "production" ? 25 : 2525;

server.listen(PORT, () => {
  console.log("🚀 SMTP Server listening on port " + PORT);
});

process.on("SIGTERM", async () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully...");
  await prisma.$disconnect();
  server.close(() => {
    console.log("✅ SMTP Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  console.log("🛑 Received SIGINT, shutting down gracefully...");
  await prisma.$disconnect();
  server.close(() => {
    console.log("✅ SMTP Server closed");
    process.exit(0);
  });
});
