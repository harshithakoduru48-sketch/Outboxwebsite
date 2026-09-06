import axios from 'axios';
import { EmailItem, EmailStats, Sender, SlackStatus, User } from './types';

const api = axios.create({
  baseURL: '/api',
});

export async function fetchScheduledEmails(): Promise<EmailItem[]> {
  const res = await api.get('/emails/scheduled');
  return res.data.emails || [];
}

export async function fetchSentEmails(): Promise<EmailItem[]> {
  const res = await api.get('/emails/sent');
  return res.data.emails || [];
}

export async function fetchStats(): Promise<EmailStats> {
  const res = await api.get('/emails/stats');
  return res.data.stats || { scheduled: 0, sent: 0, failed: 0, rateLimited: 0, total: 0 };
}

export async function searchEmails(query: string, status?: string): Promise<{ emails: EmailItem[]; source: string }> {
  const res = await api.get('/emails/search', {
    params: { q: query, status },
  });
  return { emails: res.data.emails || [], source: res.data.source || 'database' };
}

export async function scheduleEmailCampaign(payload: {
  recipientEmails: string[];
  subject: string;
  body: string;
  senderId: string;
  startTime?: string;
  delayBetweenEmailsSeconds?: number;
  userId?: string;
}): Promise<any> {
  const res = await api.post('/emails/schedule', payload);
  return res.data;
}

export async function uploadLeadsFile(file: File): Promise<string[]> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/emails/upload-leads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.emails || [];
}

export async function deleteScheduledEmail(id: string): Promise<void> {
  await api.delete(`/emails/${id}`);
}

export async function fetchSenders(): Promise<Sender[]> {
  const res = await api.get('/senders');
  return res.data.senders || [];
}

export async function createNewSender(data: { email: string; name: string; hourlyLimit: number }): Promise<Sender> {
  const res = await api.post('/senders', data);
  return res.data.sender;
}

export async function fetchSlackStatus(): Promise<SlackStatus> {
  const res = await api.get('/slack/status');
  return res.data;
}

export async function saveSlackWebhook(webhookUrl: string, channel?: string): Promise<any> {
  const res = await api.post('/slack/webhook', { webhookUrl, channel });
  return res.data;
}

export async function disconnectSlack(): Promise<any> {
  const res = await api.post('/slack/disconnect');
  return res.data;
}

export async function triggerTestSlackAlert(webhookUrl?: string): Promise<any> {
  const res = await api.post('/slack/test', { webhookUrl });
  return res.data;
}

export async function loginWithGoogleCredential(credential: string): Promise<User> {
  const res = await api.post('/auth/google', { credential });
  return res.data.user;
}

export async function loginWithDemo(name?: string, email?: string): Promise<User> {
  const res = await api.post('/auth/demo', { name, email });
  return res.data.user;
}
