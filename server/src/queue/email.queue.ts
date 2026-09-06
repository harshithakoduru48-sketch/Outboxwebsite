import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export const EMAIL_QUEUE_NAME = 'email-job-queue';

export interface EmailJobData {
  emailId: string;
  senderId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  userId?: string | null;
}

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 1000, // Keep last 1000 completed jobs in BullMQ dashboard
    },
    removeOnFail: {
      count: 1000, // Keep last 1000 failed jobs for inspection
    },
  },
});

export async function scheduleEmailJob(
  emailId: string,
  scheduledTime: Date,
  jobData: EmailJobData
) {
  const now = Date.now();
  const scheduledTimestamp = new Date(scheduledTime).getTime();
  const delay = Math.max(0, scheduledTimestamp - now);

  const jobId = `email-${emailId}`;

  // Add delayed job to BullMQ
  const job = await emailQueue.add('sendEmail', jobData, {
    delay,
    jobId, // Ensures idempotency: duplicate adds with same jobId are ignored
  });

  console.log(`[BullMQ Queue] Scheduled job ${job.id} for email ${emailId} with delay ${delay}ms (${new Date(scheduledTimestamp).toISOString()})`);
  return job;
}

export async function removeEmailJob(emailId: string) {
  const jobId = `email-${emailId}`;
  const job = await emailQueue.getJob(jobId);
  if (job) {
    await job.remove();
    console.log(`[BullMQ Queue] Removed job ${jobId}`);
    return true;
  }
  return false;
}
