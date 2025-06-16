import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

async function testGmailConnection() {
    console.log('🧪 Testing Gmail SMTP connection...');
    console.log('Gmail User:', process.env.GMAIL_USER);
    console.log('Gmail App Password:', process.env.GMAIL_APP_PASSWORD ? '***SET***' : 'NOT SET');

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
        // Add timeout settings
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 10000,
        socketTimeout: 10000,
    });

    try {
        // Test connection
        console.log('🔗 Testing connection...');
        await transporter.verify();
        console.log('✅ Gmail SMTP connection successful!');

        // Test sending a simple email
        console.log('📧 Testing email sending...');
        const result = await transporter.sendMail({
            from: process.env.GMAIL_USER,
            to: "nischaldahal01395@gmail.com", // Send to yourself for testing
            subject: 'Test Email from SMTP Server',
            text: 'This is a test email to verify Gmail SMTP connection.',
            html: '<h1>Test Email</h1><p>This is a test email to verify Gmail SMTP connection.</p>',
        });

        console.log('✅ Test email sent successfully!');
        console.log('Message ID:', result.messageId);
        console.log('Response:', result.response);

    } catch (error) {
        console.error('❌ Gmail SMTP test failed:');
        console.error('Error:', error.message);
        console.error('Code:', error.code);
        console.error('Command:', error.command);

        if (error.code === 'EAUTH') {
            console.error('🔐 Authentication failed. Check your Gmail credentials and App Password.');
        } else if (error.code === 'ETIMEDOUT') {
            console.error('⏰ Connection timeout. Check your internet connection and firewall settings.');
        } else if (error.code === 'ECONNECTION') {
            console.error('🌐 Connection failed. Check your network connectivity.');
        }
    }
}

testGmailConnection(); 