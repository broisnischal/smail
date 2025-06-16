import { SMTPServer } from "smtp-server";
import { simpleParser } from "mailparser";
import { PrismaClient, SubscriptionStatus } from "../../generated/prisma";
import * as nodemailer from "nodemailer";

const prisma = new PrismaClient();

// Try different ports in order of preference
const PORTS_TO_TRY = [25, 2525, 3025, 8025, 9025];
const HOST = "127.0.0.1"; // Use localhost instead of 0.0.0.0

async function createSMTPServer() {
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

  return server;
}

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

    // if (!alias.user.subscription) {
    //   console.log(`⚠️ No subscription for user: ${alias.user.email}`);
    //   return { allowed: false, reason: "NO_SUBSCRIPTION" };
    // }

    // const subscription = alias.user.subscription;

    // if (
    //   subscription.status !== SubscriptionStatus.ACTIVE &&
    //   subscription.status !== SubscriptionStatus.TRIAL
    // ) {
    //   return { allowed: false, reason: "SUBSCRIPTION_INACTIVE" };
    // }

    // if (subscription.currentPeriodEnd < new Date()) {
    //   return { allowed: false, reason: "SUBSCRIPTION_EXPIRED" };
    // }

    // const plan = subscription.plan;
    // if (plan.maxForwardsPerMonth !== -1) {
    //   const currentMonth = new Date();
    //   const startOfMonth = new Date(
    //     currentMonth.getFullYear(),
    //     currentMonth.getMonth(),
    //     1,
    //   );
    //   const endOfMonth = new Date(
    //     currentMonth.getFullYear(),
    //     currentMonth.getMonth() + 1,
    //     0,
    //   );

    //   const emailsThisMonth = await prisma.emailLog.count({
    //     where: {
    //       alias: { userId: alias.userId },
    //       receivedAt: { gte: startOfMonth, lte: endOfMonth },
    //       status: "forwarded",
    //     },
    //   });

    //   if (emailsThisMonth >= plan.maxForwardsPerMonth) {
    //     return { allowed: false, reason: "MONTHLY_LIMIT_EXCEEDED" };
    //   }
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
  });

  const originalFrom =
    mail.from?.text || mail.from?.address || "Unknown Sender";
  const originalSubject = mail.subject || "No Subject";

  const mailOptions = {
    from: process.env.GMAIL_USER!,
    to: forwardTo,
    subject: `Fwd: ${originalSubject}`,
    text: `Forwarded from ${originalRecipient}\n\nFrom: ${originalFrom}\n\n${
      mail.text || ""
    }`,
    html: mail.html || undefined,
    attachments: mail.attachments || [],
  };

  const result = await transporter.sendMail(mailOptions);
  console.log(`✅ Email forwarded to ${forwardTo}:`, result.messageId);
  return result;
}

// Function to try different ports
async function startServer() {
  const server = await createSMTPServer();

  for (const port of PORTS_TO_TRY) {
    try {
      await new Promise<void>((resolve, reject) => {
        const serverInstance = server.listen(port, HOST, () => {
          console.log(`🚀 SMTP Server successfully started!`);
          console.log(`📍 Listening on ${HOST}:${port}`);
          console.log(`📧 Test with: telnet ${HOST} ${port}`);
          console.log(
            `🔧 Or use nodemailer with host: '${HOST}', port: ${port}`,
          );
          resolve();
        });

        serverInstance.on("error", (err: any) => {
          if (err.code === "EADDRINUSE") {
            console.log(`⚠️ Port ${port} is in use, trying next port...`);
            reject(err);
          } else {
            console.error(`❌ Server error on port ${port}:`, err);
            reject(err);
          }
        });
      });

      // If we get here, the server started successfully
      break;
    } catch (error: any) {
      if (error.code === "EADDRINUSE") {
        console.log(`❌ Port ${port} is already in use`);
        continue;
      } else {
        console.error(
          `❌ Failed to start server on port ${port}:`,
          error.message,
        );
        continue;
      }
    }
  }

  // Graceful shutdown
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
}

// Start the server
startServer().catch((error) => {
  console.error("❌ Failed to start SMTP server:", error);
  process.exit(1);
});
