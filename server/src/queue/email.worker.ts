import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { config } from '../config';
import { prisma } from '../config/db';
import { EMAIL_QUEUE_NAME, EmailJobData, emailQueue } from './email.queue';
import { sendMailViaSmtp } from '../services/smtp.service';
import { updateEmailDocumentStatus } from '../services/elasticsearch.service';
import { sendSlackRateLimitAlert } from '../services/slack.service';

export function startEmailWorker() {
  const worker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const { emailId, senderId, recipientEmail, subject, body, userId } = job.data;
      console.log(`[Worker] Starting execution for job ${job.id} (Email: ${emailId}, Recipient: ${recipientEmail})`);

      // 1. Check current status in DB (Idempotency Guard)
      const emailRecord = await prisma.email.findUnique({
        where: { id: emailId },
        include: { sender: true },
      });

      if (!emailRecord) {
        console.warn(`[Worker] Email record ${emailId} not found in database. Skipping.`);
        return { skipped: true, reason: 'record_not_found' };
      }

      if (emailRecord.status === 'SENT') {
        console.log(`[Worker] Email ${emailId} was already sent. Skipping duplicate execution.`);
        return { skipped: true, reason: 'already_sent' };
      }

      // Mark as PROCESSING
      await prisma.email.update({
        where: { id: emailId },
        data: { status: 'PROCESSING' },
      });

      // 2. Rate Limiting Check (Redis-backed Hourly Counter)
      const sender = emailRecord.sender;
      const hourlyLimit = sender?.hourlyLimit || config.worker.maxEmailsPerHour;

      const now = new Date();
      // Format hour window: e.g. "2026-09-06T11"
      const hourWindow = now.toISOString().slice(0, 13);
      const rateLimitKey = `ratelimit:${senderId}:${hourWindow}`;

      const currentHourlyCount = await redisConnection.incr(rateLimitKey);
      if (currentHourlyCount === 1) {
        // Set TTL to 2 hours
        await redisConnection.expire(rateLimitKey, 7200);
      }

      // If hourly limit exceeded:
      if (currentHourlyCount > hourlyLimit) {
        // Rollback counter so we don't artificially inflate
        await redisConnection.decr(rateLimitKey);

        // Compute the start of the next hour window (e.g. at 12:00:05 UTC)
        const nextHour = new Date(
          Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            now.getUTCHours() + 1,
            0,
            5,
            0
          )
        );
        const rescheduleDelayMs = Math.max(5000, nextHour.getTime() - Date.now());

        console.warn(
          `[Worker] ⚠️ Rate limit exceeded for sender ${sender.email} (${currentHourlyCount - 1}/${hourlyLimit} used in window ${hourWindow}). Rescheduling email ${emailId} to ${nextHour.toISOString()} (delay: ${rescheduleDelayMs}ms)`
        );

        // Update DB status to RATE_LIMITED
        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'RATE_LIMITED',
            scheduledAt: nextHour,
          },
        });

        // Add delayed job to next hour window in BullMQ
        await emailQueue.add(
          'sendEmail',
          job.data,
          {
            delay: rescheduleDelayMs,
            jobId: `email-${emailId}-rescheduled-${nextHour.getTime()}`,
          }
        );

        // Dispatch Slack Notification (deduped per hour window)
        const alertDedupKey = `slack_alert_sent:${senderId}:${hourWindow}`;
        const shouldSendSlackAlert = await redisConnection.set(alertDedupKey, '1', 'EX', 7200, 'NX');

        if (shouldSendSlackAlert) {
          console.log(`[Worker] Dispatching live Slack alert for sender ${sender.email}...`);
          sendSlackRateLimitAlert({
            senderId,
            senderEmail: sender.email,
            hourlyLimit,
            hourWindow,
            nextAvailableWindow: nextHour,
            userId,
          }).catch((err) => console.error('[Worker] Slack notification error:', err));
        }

        return {
          rateLimited: true,
          rescheduledTo: nextHour.toISOString(),
          delayMs: rescheduleDelayMs,
        };
      }

      // 3. Throttle Minimum Delay Between Individual Email Sends
      const minDelay = config.worker.minDelayBetweenEmailsMs;
      if (minDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, minDelay));
      }

      // 4. Dispatch Email via Ethereal Fake SMTP
      try {
        const sendResult = await sendMailViaSmtp({
          from: `"${sender.name}" <${sender.email}>`,
          to: recipientEmail,
          subject,
          body,
        });

        const sentAt = new Date();
        const previewUrl = sendResult.previewUrl || null;

        // 5. Update Database Record to SENT
        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'SENT',
            sentAt,
            etherealPreviewUrl: previewUrl,
            errorReason: null,
          },
        });

        // 6. Update Elasticsearch Document
        updateEmailDocumentStatus(emailId, 'SENT', sentAt).catch((err) =>
          console.error('[Worker] ES status update error:', err)
        );

        console.log(`[Worker] ✅ Successfully processed email ${emailId} to ${recipientEmail}`);

        return {
          success: true,
          emailId,
          messageId: sendResult.messageId,
          previewUrl,
        };
      } catch (sendError: any) {
        console.error(`[Worker] ❌ Failed to send email ${emailId}:`, sendError.message);

        // Mark as FAILED in DB
        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'FAILED',
            errorReason: sendError.message,
          },
        });

        updateEmailDocumentStatus(emailId, 'FAILED').catch(() => {});
        throw sendError; // Triggers BullMQ retry backoff
      }
    },
    {
      connection: redisConnection,
      concurrency: config.worker.concurrency, // Configurable worker concurrency
      maxStalledCount: 3,    // Auto-retry stalled jobs up to 3 times if server killed
      stalledInterval: 5000, // Check for stalled/crashed jobs every 5s
      lockDuration: 10000,   // Release lock after 10s if process died abruptly
    }
  );

  worker.on('completed', (job) => {
    console.log(`[BullMQ Worker] Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[BullMQ Worker] Job ${job?.id} failed with error:`, err.message);
  });

  console.log(`[BullMQ Worker] Worker started with concurrency = ${config.worker.concurrency}`);
  return worker;
}
