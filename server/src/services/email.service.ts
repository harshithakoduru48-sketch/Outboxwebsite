import { prisma } from '../config/db';
import { indexEmailDocument } from './elasticsearch.service';

export interface CreateCampaignInput {
  recipientEmails: string[];
  subject: string;
  body: string;
  senderId: string;
  userId?: string;
  startTime: Date;
  delayBetweenEmailsMs: number; // e.g. 2000 ms
}

export async function createEmailCampaign(input: CreateCampaignInput) {
  const { recipientEmails, subject, body, senderId, userId, startTime, delayBetweenEmailsMs } = input;

  const sender = await prisma.sender.findUnique({
    where: { id: senderId },
  });

  if (!sender) {
    throw new Error(`Sender with ID ${senderId} not found`);
  }

  const baseTimestamp = new Date(startTime).getTime();
  const createdEmails = [];

  // Create email records with incremental delay offsets
  for (let i = 0; i < recipientEmails.length; i++) {
    const recipient = recipientEmails[i];
    const itemScheduledAt = new Date(baseTimestamp + i * delayBetweenEmailsMs);

    const email = await prisma.email.create({
      data: {
        recipientEmail: recipient,
        subject,
        body,
        status: 'PENDING',
        scheduledAt: itemScheduledAt,
        delayMs: i * delayBetweenEmailsMs,
        senderId,
        userId: userId || null,
      },
      include: {
        sender: true,
      },
    });

    createdEmails.push(email);

    // Index into Elasticsearch
    indexEmailDocument({
      id: email.id,
      recipientEmail: email.recipientEmail,
      subject: email.subject,
      body: email.body,
      status: email.status,
      scheduledAt: email.scheduledAt,
      senderId: email.senderId,
      senderEmail: sender.email,
      createdAt: email.createdAt,
    }).catch((err) => console.error('[ES Index Error]:', err));
  }

  return createdEmails;
}

export async function getScheduledEmails(limit = 100, skip = 0) {
  return prisma.email.findMany({
    where: {
      status: {
        in: ['PENDING', 'PROCESSING', 'RATE_LIMITED'],
      },
    },
    include: {
      sender: true,
    },
    orderBy: {
      scheduledAt: 'asc',
    },
    take: limit,
    skip,
  });
}

export async function getSentEmails(limit = 100, skip = 0) {
  return prisma.email.findMany({
    where: {
      status: {
        in: ['SENT', 'FAILED'],
      },
    },
    include: {
      sender: true,
    },
    orderBy: {
      sentAt: 'desc',
    },
    take: limit,
    skip,
  });
}

export async function getEmailStats() {
  const [scheduledCount, sentCount, failedCount, rateLimitedCount] = await Promise.all([
    prisma.email.count({ where: { status: 'PENDING' } }),
    prisma.email.count({ where: { status: 'SENT' } }),
    prisma.email.count({ where: { status: 'FAILED' } }),
    prisma.email.count({ where: { status: 'RATE_LIMITED' } }),
  ]);

  return {
    scheduled: scheduledCount,
    sent: sentCount,
    failed: failedCount,
    rateLimited: rateLimitedCount,
    total: scheduledCount + sentCount + failedCount + rateLimitedCount,
  };
}

export async function searchEmailsDb(query: string, status?: string) {
  const whereClause: any = {};

  if (status && status !== 'ALL') {
    whereClause.status = status;
  }

  if (query && query.trim().length > 0) {
    whereClause.OR = [
      { recipientEmail: { contains: query } },
      { subject: { contains: query } },
      { body: { contains: query } },
    ];
  }

  return prisma.email.findMany({
    where: whereClause,
    include: { sender: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}
