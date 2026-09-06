import { Request, Response } from 'express';
import {
  createEmailCampaign,
  getScheduledEmails,
  getSentEmails,
  getEmailStats,
  searchEmailsDb,
} from '../services/email.service';
import { scheduleEmailJob, removeEmailJob } from '../queue/email.queue';
import { searchEmailsInEs } from '../services/elasticsearch.service';
import { parseCsvFile } from '../utils/csvParser';
import { prisma } from '../config/db';

export async function scheduleEmails(req: Request, res: Response): Promise<void> {
  try {
    const {
      recipientEmails,
      subject,
      body,
      senderId,
      userId,
      startTime,
      delayBetweenEmailsSeconds,
    } = req.body;

    if (!recipientEmails || !Array.isArray(recipientEmails) || recipientEmails.length === 0) {
      res.status(400).json({ error: 'recipientEmails must be a non-empty array of email addresses' });
      return;
    }

    if (!subject || !body) {
      res.status(400).json({ error: 'subject and body are required' });
      return;
    }

    // Default sender fallback if not provided
    let finalSenderId = senderId;
    if (!finalSenderId) {
      const defaultSender = await prisma.sender.findFirst();
      if (defaultSender) {
        finalSenderId = defaultSender.id;
      } else {
        const created = await prisma.sender.create({
          data: {
            email: 'sales@reachinbox.ai',
            name: 'ReachInbox Sales Team',
            hourlyLimit: 200,
          },
        });
        finalSenderId = created.id;
      }
    }

    const delayMs = delayBetweenEmailsSeconds ? Number(delayBetweenEmailsSeconds) * 1000 : 2000;
    const startDateTime = startTime ? new Date(startTime) : new Date();

    const createdEmails = await createEmailCampaign({
      recipientEmails,
      subject,
      body,
      senderId: finalSenderId,
      userId,
      startTime: startDateTime,
      delayBetweenEmailsMs: delayMs,
    });

    // Schedule delayed jobs in BullMQ (Persistent & Idempotent)
    for (const email of createdEmails) {
      await scheduleEmailJob(email.id, email.scheduledAt, {
        emailId: email.id,
        senderId: email.senderId,
        recipientEmail: email.recipientEmail,
        subject: email.subject,
        body: email.body,
        userId: email.userId,
      });
    }

    res.status(201).json({
      success: true,
      message: `Successfully scheduled ${createdEmails.length} email(s)`,
      totalScheduled: createdEmails.length,
      emails: createdEmails,
    });
  } catch (error: any) {
    console.error('[Email Controller] scheduleEmails error:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function listScheduled(req: Request, res: Response): Promise<void> {
  try {
    const limit = Number(req.query.limit) || 100;
    const skip = Number(req.query.skip) || 0;
    const emails = await getScheduledEmails(limit, skip);
    res.json({ success: true, count: emails.length, emails });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function listSent(req: Request, res: Response): Promise<void> {
  try {
    const limit = Number(req.query.limit) || 100;
    const skip = Number(req.query.skip) || 0;
    const emails = await getSentEmails(limit, skip);
    res.json({ success: true, count: emails.length, emails });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getStats(req: Request, res: Response): Promise<void> {
  try {
    const stats = await getEmailStats();
    res.json({ success: true, stats });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function searchEmails(req: Request, res: Response): Promise<void> {
  try {
    const q = (req.query.q as string) || '';
    const status = (req.query.status as string) || undefined;

    // 1. Try Elasticsearch first
    const esResults = await searchEmailsInEs(q, status);
    if (esResults !== null) {
      res.json({
        success: true,
        source: 'elasticsearch',
        count: esResults.length,
        emails: esResults,
      });
      return;
    }

    // 2. Graceful fallback to database
    const dbResults = await searchEmailsDb(q, status);
    res.json({
      success: true,
      source: 'database_fallback',
      count: dbResults.length,
      emails: dbResults,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function uploadLeadFile(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No CSV/text file uploaded' });
      return;
    }

    const emails = await parseCsvFile(req.file.buffer);
    res.json({
      success: true,
      count: emails.length,
      emails,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function cancelEmail(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    await removeEmailJob(id);

    await prisma.email.delete({
      where: { id },
    });

    res.json({ success: true, message: `Email ${id} cancelled and deleted` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
