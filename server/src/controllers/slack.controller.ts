import { Request, Response } from 'express';
import axios from 'axios';
import { prisma } from '../config/db';
import { config } from '../config';
import { testSlackConnection } from '../services/slack.service';

export async function getSlackStatus(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req.query.userId as string) || undefined;
    const integration = await prisma.slackIntegration.findFirst({
      where: userId ? { userId } : { isActive: true },
    });

    res.json({
      connected: !!(integration && integration.isActive),
      webhookUrl: integration?.webhookUrl ? `${integration.webhookUrl.slice(0, 30)}...` : null,
      channel: integration?.channel || null,
      isActive: integration?.isActive || false,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function saveSlackWebhook(req: Request, res: Response): Promise<void> {
  try {
    const { webhookUrl, channel, userId } = req.body;

    if (!webhookUrl) {
      res.status(400).json({ error: 'webhookUrl is required' });
      return;
    }

    // Verify webhook with a test ping
    const testResult = await testSlackConnection(webhookUrl);
    if (!testResult.success) {
      res.status(400).json({
        error: `Could not send test message to Slack webhook: ${testResult.error}`,
      });
      return;
    }

    const integration = await prisma.slackIntegration.upsert({
      where: userId ? { userId } : { id: 'global-slack-integration' },
      update: {
        webhookUrl,
        channel: channel || '#alerts',
        isActive: true,
      },
      create: {
        id: userId ? undefined : 'global-slack-integration',
        webhookUrl,
        channel: channel || '#alerts',
        isActive: true,
        userId: userId || null,
      },
    });

    res.json({
      success: true,
      message: 'Slack webhook connected and verified successfully!',
      integration,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function disconnectSlack(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.body;

    await prisma.slackIntegration.deleteMany({
      where: userId ? { userId } : {},
    });

    res.json({ success: true, message: 'Slack integration disconnected' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function testSlack(req: Request, res: Response): Promise<void> {
  try {
    const integration = await prisma.slackIntegration.findFirst({
      where: { isActive: true },
    });

    const targetUrl = req.body.webhookUrl || integration?.webhookUrl || config.slack.webhookUrl;

    if (!targetUrl) {
      res.status(400).json({ error: 'No active Slack webhook URL configured' });
      return;
    }

    const test = await testSlackConnection(targetUrl);
    if (test.success) {
      res.json({ success: true, message: 'Test alert sent to Slack successfully!' });
    } else {
      res.status(500).json({ error: test.error });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function handleSlackOAuth(req: Request, res: Response): Promise<void> {
  try {
    const { code, userId } = req.body;

    if (!code) {
      res.status(400).json({ error: 'OAuth code is required' });
      return;
    }

    // Exchange Slack code
    const tokenResponse = await axios.post(
      'https://slack.com/api/oauth.v2.access',
      new URLSearchParams({
        code,
        client_id: config.slack.clientId,
        client_secret: config.slack.clientSecret,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const data = tokenResponse.data;
    if (!data.ok) {
      res.status(400).json({ error: `Slack OAuth exchange failed: ${data.error}` });
      return;
    }

    const incomingWebhookUrl = data.incoming_webhook?.url;
    const channel = data.incoming_webhook?.channel;
    const accessToken = data.access_token;

    await prisma.slackIntegration.upsert({
      where: userId ? { userId } : { id: 'global-slack-integration' },
      update: {
        webhookUrl: incomingWebhookUrl,
        channel,
        accessToken,
        isActive: true,
      },
      create: {
        id: userId ? undefined : 'global-slack-integration',
        webhookUrl: incomingWebhookUrl,
        channel,
        accessToken,
        isActive: true,
        userId: userId || null,
      },
    });

    res.json({
      success: true,
      message: 'Slack successfully connected via OAuth!',
      channel,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
