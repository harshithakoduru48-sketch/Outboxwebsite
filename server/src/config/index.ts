import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 5000,
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
  worker: {
    concurrency: Number(process.env.WORKER_CONCURRENCY) || 5,
    minDelayBetweenEmailsMs: Number(process.env.MIN_DELAY_BETWEEN_EMAILS_MS) || 2000,
    maxEmailsPerHour: Number(process.env.MAX_EMAILS_PER_HOUR) || 200,
  },
  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
    index: 'reachinbox_emails',
  },
  slack: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
    clientId: process.env.SLACK_CLIENT_ID || '',
    clientSecret: process.env.SLACK_CLIENT_SECRET || '',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
  },
  ethereal: {
    user: process.env.ETHEREAL_USER || '',
    pass: process.env.ETHEREAL_PASS || '',
  },
};
