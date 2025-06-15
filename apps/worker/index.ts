// packages/worker/src/index.ts
import amqp from 'amqplib';
import { PrismaClient } from '@prisma/client';
import { EmailForwarder } from './forwarder';

const prisma = new PrismaClient();
const forwarder = new EmailForwarder();

async function startWorker() {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    const channel = await connection.createChannel();

    await channel.assertQueue('email_forward', { durable: true });
    await channel.assertQueue('email_cleanup', { durable: true });

    // Set prefetch to process one message at a time
    channel.prefetch(1);

    // Email forwarding worker
    channel.consume('email_forward', async (msg) => {
        if (!msg) return;

        try {
            const data = JSON.parse(msg.content.toString());
            await processEmailForward(data);
            channel.ack(msg);
        } catch (error) {
            console.error('Forward error:', error);
            channel.nack(msg, false, true); // Requeue
        }
    });

    // Cleanup worker
    channel.consume('email_cleanup', async (msg) => {
        if (!msg) return;

        try {
            await cleanupExpiredAliases();
            channel.ack(msg);
        } catch (error) {
            console.error('Cleanup error:', error);
            channel.nack(msg, false, true);
        }
    });

    console.log('Workers started');
}

async function processEmailForward(data: any) {
    const { mailLogId, aliasId } = data;

    // Get alias info
    const alias = await prisma.alias.findUnique({
        where: { id: aliasId }
    });

    if (!alias || !alias.isActive) {
        console.log(`Alias ${aliasId} not active`);
        return;
    }

    // Check forward limit
    if (alias.forwardCount >= alias.maxForwards) {
        console.log(`Forward limit reached for ${alias.email}`);
        return;
    }

    // Forward email
    const success = await forwarder.forward({
        to: alias.targetGmail,
        from: data.from,
        subject: `[${alias.email}] ${data.subject}`,
        text: data.text,
        html: data.html,
        attachments: data.attachments
    });

    if (success) {
        // Update counts and logs
        await prisma.$transaction([
            prisma.alias.update({
                where: { id: aliasId },
                data: { forwardCount: { increment: 1 } }
            }),
            prisma.mailLog.update({
                where: { id: mailLogId },
                data: {
                    forwarded: true,
                    forwardedAt: new Date()
                }
            })
        ]);

        console.log(`Email forwarded: ${alias.email} -> ${alias.targetGmail}`);
    }
}

async function cleanupExpiredAliases() {
    const result = await prisma.alias.updateMany({
        where: {
            expiresAt: { lt: new Date() },
            isActive: true
        },
        data: { isActive: false }
    });

    console.log(`Deactivated ${result.count} expired aliases`);
}

startWorker().catch(console.error);