// test-smtp.js
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "localhost",
  port: 2525,
  secure: false,
});

async function testEmail() {
  try {
    console.log("Sending test email...");

    const info = await transporter.sendMail({
      from: '"Test Sender" <test@example.com>',
      to: "cybnischal@snehaa.store",
      subject: "Test Email from Node.js",
      text: "This is a test email sent to your SMTP server",
      html: "<b>This is a test email</b> sent to your SMTP server",
    });

    console.log("✅ Message sent successfully!");
    console.log("Message ID:", info.messageId);
    console.log("Response:", info.response);
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    console.error("Code:", error.code);
    console.error("Command:", error.command);
  }
}

testEmail();
