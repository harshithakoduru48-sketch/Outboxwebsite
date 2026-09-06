import axios from 'axios';
import { prisma } from '../config/db';
import { config } from '../config';

export async function sendSlackRateLimitAlert(details: {
  senderId: string;
  senderEmail: string;
  hourlyLimit: number;
  hourWindow: string;
  nextAvailableWindow: Date;
  userId?: string | null;
}) {
  try {
    // 1. Find Slack integration in database (either by userId or first active one)
    let integration = null;
    if (details.userId) {
      integration = await prisma.slackIntegration.findUnique({
        where: { userId: details.userId },
      });
    }

    if (!integration || !integration.isActive) {
      integration = await prisma.slackIntegration.findFirst({
        where: { isActive: true },
      });
    }

    const webhookUrl = integration?.webhookUrl || config.slack.webhookUrl;
    const token = integration?.accessToken;

    if (!webhookUrl && !token) {
      console.log(`[Slack] Rate limit alert triggered for ${details.senderEmail}, but no Slack integration is connected. Skipping notification gracefully.`);
      return { success: false, reason: 'not_connected' };
    }

    const payload = {
      text: `⚠️ [ReachInbox] Rate limit reached for sender ${details.senderEmail}!`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '⚠️ ReachInbox Rate Limit Reached',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Sender *${details.senderEmail}* has reached the maximum configured rate limit of *${details.hourlyLimit} emails/hour* for window *${details.hourWindow}*.`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Hourly Limit:*\n${details.hourlyLimit} emails/hr`,
            },
            {
              type: 'mrkdwn',
              text: `*Rescheduled To:*\n${details.nextAvailableWindow.toUTCString()}`,
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: '🛡️ *Policy:* Remaining jobs are preserved and postponed to the next hour window to protect sender reputation.',
            },
          ],
        },
      ],
    };

    if (webhookUrl) {
      const response = await axios.post(webhookUrl, payload, { timeout: 5000 });
      console.log(`[Slack] Live alert successfully dispatched to Slack webhook (${response.status})`);
      return { success: true };
    } else if (token) {
      const channel = integration?.channel || '#general';
      const response = await axios.post(
        'https://slack.com/api/chat.postMessage',
        { channel, ...payload },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        }
      );
      console.log(`[Slack] Dispatched alert to Slack channel ${channel} via OAuth token`);
      return { success: true, response: response.data };
    }

    return { success: false, reason: 'no_endpoint' };
  } catch (error: any) {
    console.error('[Slack] Failed to send Slack alert:', error.message);
    return { success: false, error: error.message };
  }
}

export async function testSlackConnection(webhookUrl: string) {
  try {
    const response = await axios.post(
      webhookUrl,
      {
        text: '🚀 *ReachInbox Test Notification*: Your Slack connection is live and active! Rate limit notifications will be sent to this channel.',
      },
      { timeout: 5000 }
    );
    return { success: true, status: response.status };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
