import { Request, Response } from 'express';
import { prisma } from '../config/db';

export async function listSenders(req: Request, res: Response): Promise<void> {
  try {
    let senders = await prisma.sender.findMany({
      orderBy: { createdAt: 'asc' },
    });

    // Seed default demo senders if empty
    if (senders.length === 0) {
      await prisma.sender.createMany({
        data: [
          {
            email: 'alex.growth@reachinbox.ai',
            name: 'Alex Rivera (Growth)',
            hourlyLimit: 200,
          },
          {
            email: 'sarah.outreach@outboxlabs.com',
            name: 'Sarah Connor (Outbox Labs)',
            hourlyLimit: 100,
          },
          {
            email: 'partnerships@reachinbox.ai',
            name: 'ReachInbox Partnerships',
            hourlyLimit: 50,
          },
        ],
      });
      senders = await prisma.sender.findMany({ orderBy: { createdAt: 'asc' } });
    }

    res.json({ success: true, count: senders.length, senders });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function createSender(req: Request, res: Response): Promise<void> {
  try {
    const { email, name, hourlyLimit } = req.body;

    if (!email || !name) {
      res.status(400).json({ error: 'email and name are required' });
      return;
    }

    const sender = await prisma.sender.create({
      data: {
        email,
        name,
        hourlyLimit: hourlyLimit ? Number(hourlyLimit) : 200,
      },
    });

    res.status(201).json({ success: true, sender });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateSenderLimit(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { hourlyLimit } = req.body;

    const updated = await prisma.sender.update({
      where: { id },
      data: { hourlyLimit: Number(hourlyLimit) },
    });

    res.json({ success: true, sender: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
