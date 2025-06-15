// test-smtp.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: 'localhost',
    port: 25,
    secure: false,           // No SSL/TLS
    ignoreTLS: true,         // Ignore TLS completely
    requireTLS: false,       // Don't require TLS
    auth: false,             // No authentication
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
});

async function testEmail() {
    try {
        console.log('Sending test email...');

        const info = await transporter.sendMail({
            from: '"Test Sender" <test@example.com>',
            to: 'cool@snehaa.store',
            subject: 'Test Email from Node.js',
            text: 'This is a test email sent to your SMTP server',
            html: '<b>This is a test email</b> sent to your SMTP server'
        });

        console.log('✅ Message sent successfully!');
        console.log('Message ID:', info.messageId);
        console.log('Response:', info.response);
    } catch (error) {
        console.error('❌ Error sending email:', error.message);
        console.error('Code:', error.code);
        console.error('Command:', error.command);
    }
}

testEmail();