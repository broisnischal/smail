import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';
// import { PrismaClient } from '@prisma/client';
// import { publishToQueue } from './queue';

// const prisma = new PrismaClient();

const server = new SMTPServer({
    secure: false,
    authOptional: true,
    banner: 'Snehaa Privacy Mail Server',

    onData(stream, session, callback) {
        let mailData = '';

        stream.on('data', (chunk) => {
            mailData += chunk;
        });

        stream.on('end', async () => {
            try {
                const parsed = await simpleParser(mailData);
                await handleIncomingMail(parsed, session);
                callback();
            } catch (error) {
                console.error('Email processing error:', error);
                callback(new Error('Processing failed'));
            }
        });
    },

    onMailFrom(address, session, callback) {
        console.log(`Mail from: ${address.address}`);
        callback();
    },

    onRcptTo(address, session, callback) {
        console.log(`Mail to: ${address.address}`);
        callback();
    }
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});


// Forward email function
// async function forwardEmail(mail: any, forwardTo: string) {

//     console.log(process.env.GMAIL_USER);
//     console.log(process.env.GMAIL_APP_PASSWORD);

//     try {
//         const mailOptions = {
//             from: process.env.GMAIL_USER,
//             to: forwardTo,
//             subject: `[Forwarded] ${mail.subject || 'No Subject'}`,
//             text: mail.text,
//             html: mail.html,
//             attachments: mail.attachments || [],
//         };

//         const result = await transporter.sendMail(mailOptions);
//         console.log(`Email forwarded successfully to ${forwardTo}:`, result.messageId);
//         return result;
//     } catch (error) {
//         console.error('Error forwarding email:', error);
//         throw error;
//     }
// }
async function forwardEmail(mail: any, forwardTo: string, originalRecipient: string) {
    console.log(process.env.GMAIL_USER);
    console.log(process.env.GMAIL_APP_PASSWORD);

    try {
        // Extract original sender info with proper null checks
        const originalFrom = mail.from?.text || mail.from?.address || 'Unknown Sender';
        const originalSubject = mail.subject || 'No Subject';
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
            textContent += '[HTML content - see HTML version of this email]';
        }

        // Prepare HTML content
        let htmlContent = '';
        if (mail.html) {
            htmlContent = `
                <div style="border-left: 3px solid #ccc; padding-left: 10px; margin: 10px 0;">
                    <p style="color: #666; font-size: 12px; margin-bottom: 10px;">
                        <strong>---------- Forwarded message ---------</strong><br>
                        <strong>From:</strong> ${originalFrom}<br>
                        <strong>Date:</strong> ${new Date(originalDate).toLocaleString()}<br>
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
                        <strong>Date:</strong> ${new Date(originalDate).toLocaleString()}<br>
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
                filename: attachment.filename || 'attachment',
                content: attachment.content,
                contentType: attachment.contentType,
                encoding: attachment.encoding || 'base64',
                cid: attachment.cid
            }));
        }

        // Create headers with proper string types
        const customHeaders: { [key: string]: string } = {};

        if (originalFrom) {
            customHeaders['X-Forwarded-From'] = originalFrom;
        }
        customHeaders['X-Original-Recipient'] = originalRecipient;

        if (process.env.GMAIL_USER) {
            customHeaders['X-Forwarded-By'] = process.env.GMAIL_USER;
        }

        if (mail.messageId) {
            customHeaders['References'] = mail.messageId;
            customHeaders['In-Reply-To'] = mail.messageId;
        }

        const mailOptions = {
            from: process.env.GMAIL_USER!,
            to: forwardTo,
            subject: `Fwd: ${originalSubject}`,
            text: textContent,
            ...(htmlContent && { html: htmlContent }),
            attachments: attachments,
            headers: customHeaders
        };

        const result = await transporter.sendMail(mailOptions);
        console.log(`Email forwarded successfully to ${forwardTo}:`, result.messageId);

        // Log forwarding details
        console.log({
            originalFrom: originalFrom,
            originalSubject: originalSubject,
            originalRecipient: originalRecipient,
            forwardedTo: forwardTo,
            attachmentCount: attachments.length,
            messageId: result.messageId,
            timestamp: new Date().toISOString()
        });

        return result;
    } catch (error) {
        console.error('Error forwarding email:', error);
        throw error;
    }
}



async function handleIncomingMail(mail: any, session: any) {

    const recipient = session.envelope.rcptTo[0].address;

    // Find active alias
    // const alias = await prisma.alias.findFirst({
    //     where: {
    //         email: recipient,
    //         isActive: true,
    //         OR: [
    //             { expiresAt: null },
    //             { expiresAt: { gt: new Date() } }
    //         ],
    //         forwardCount: {
    //             lt: prisma.alias.fields.maxForwards
    //         }
    //     }
    // });

    // if (!alias) {
    //     console.log(`No active alias found for ${recipient}`);
    //     return;
    // }

    // // Log the email
    // const mailLog = await prisma.mailLog.create({
    //     data: {
    //         aliasId: alias.id,
    //         fromEmail: mail.from?.text || 'unknown',
    //         subject: mail.subject || 'No Subject',
    //         body: mail.text || mail.html || '',
    //         headers: mail.headers,
    //         receivedAt: new Date()
    //     }
    // });

    // console.log(mail)


    // // Queue for forwarding
    // await publishToQueue('email_forward', {
    //     mailLogId: mailLog.id,
    //     aliasId: alias.id,
    //     from: mail.from,
    //     subject: mail.subject,
    //     text: mail.text,
    //     html: mail.html,
    //     attachments: mail.attachments
    // });


    // For testing, forward to your test email
    const forwardingAddresses = [
        "nischaldahal01395@gmail.com",
        "info@nischal-dahal.com.np"
    ];

    try {
        // Forward the email directly
        const forwardPromises = forwardingAddresses.map(email =>
            forwardEmail(mail, email, recipient) // Pass recipient as originalRecipient
        );

        await Promise.all(forwardPromises);
        console.log(`Email forwarded to ${forwardingAddresses.length} recipients`);


        // Optional: Log basic info
        // console.log({
        //     from: mail.from?.text,
        //     subject: mail.subject,
        //     recipient: recipient,
        //     forwardedTo: testForwardEmail,
        //     timestamp: new Date().toISOString()
        // });

    } catch (error) {
        console.error('Failed to forward email:', error);
    }

    console.log(`Email queued for forwarding: ${recipient} `);
}

server.listen(25, () => {
    console.log('SMTP Server listening on port 25');
});

// Graceful shutdown
// process.on('SIGTERM', () => {
//     server.close(() => {
//         console.log('SMTP Server closed');
//         process.exit(0);
//     });
// });