import express from 'express';
import cors from 'cors';
import { config } from './config';
import { connectDb, prisma } from './config/db';
import { redisConnection } from './config/redis';
import { initSmtpTransporter } from './services/smtp.service';
import { initElasticsearch } from './services/elasticsearch.service';
import { setupBullBoard } from './queue/bullBoard';
import { startEmailWorker } from './queue/email.worker';
import { scheduleEmailJob, emailQueue } from './queue/email.queue';

import emailRoutes from './routes/email.routes';
import authRoutes from './routes/auth.routes';
import slackRoutes from './routes/slack.routes';
import senderRoutes from './routes/sender.routes';

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'reachinbox-email-scheduler',
  });
});

// BullMQ Real-Time Monitoring Dashboard
const bullBoardRouter = setupBullBoard();
app.use('/admin/queues', bullBoardRouter);

// API Routes
app.use('/api/emails', emailRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/slack', slackRoutes);
app.use('/api/senders', senderRoutes);

// Server Restart Persistence & Reconciliation Routine
async function reconcilePendingJobsOnStartup() {
  try {
    console.log('[Startup] Checking database for pending jobs requiring queue reconciliation...');
    const pendingEmails = await prisma.email.findMany({
      where: {
        status: {
          in: ['PENDING', 'PROCESSING', 'RATE_LIMITED'],
        },
      },
      include: {
        sender: true,
      },
    });

    let reAddedCount = 0;
    for (const email of pendingEmails) {
      if (email.status === 'PROCESSING') {
        await prisma.email.update({
          where: { id: email.id },
          data: { status: 'PENDING' },
        });
      }

      const jobId = `email-${email.id}`;
      const existingJob = await emailQueue.getJob(jobId);

      if (!existingJob) {
        // Job was not in Redis (or Redis was restarted) -> re-schedule with remaining delay
        const now = Date.now();
        const scheduledTime = new Date(email.scheduledAt).getTime();

        await scheduleEmailJob(email.id, new Date(scheduledTime), {
          emailId: email.id,
          senderId: email.senderId,
          recipientEmail: email.recipientEmail,
          subject: email.subject,
          body: email.body,
          userId: email.userId,
        });
        reAddedCount++;
      } else {
        const state = await existingJob.getState();
        if (state === 'failed') {
          await existingJob.retry();
          reAddedCount++;
        }
      }
    }

    console.log(
      `[Startup] Reconciliation complete. Found ${pendingEmails.length} pending email(s) in DB, re-queued ${reAddedCount} missing job(s) in BullMQ.`
    );
  } catch (error: any) {
    console.error('[Startup] Reconciliation warning:', error.message);
  }
}

async function startServer() {
  try {
    console.log('--- Starting ReachInbox Email Scheduler Service ---');

    // 1. Connect to Relational Database
    await connectDb();

    // 2. Initialize Ethereal Fake SMTP Transporter
    await initSmtpTransporter();

    // 3. Initialize Elasticsearch Indexing
    await initElasticsearch();

    // 4. Start BullMQ Background Worker
    const worker = startEmailWorker();

    // 5. Run Server Restart Reconciliation Routine
    await reconcilePendingJobsOnStartup();

    // 6. Start HTTP Server
    const server = app.listen(config.port, () => {
      console.log(`🚀 Server listening on http://localhost:${config.port}`);
      console.log(`📊 BullMQ Real-Time Dashboard: http://localhost:${config.port}/admin/queues`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\n[Shutdown] Gracefully shutting down service...');
      await worker.close();
      await emailQueue.close();
      await redisConnection.quit();
      await prisma.$disconnect();
      server.close(() => {
        console.log('[Shutdown] Server stopped. All resources safely released.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('[Fatal Error] Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
