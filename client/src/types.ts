export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
}

export interface Sender {
  id: string;
  email: string;
  name: string;
  hourlyLimit: number;
  active: boolean;
}

export interface EmailItem {
  id: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'RATE_LIMITED';
  scheduledAt: string;
  sentAt?: string | null;
  delayMs: number;
  etherealPreviewUrl?: string | null;
  errorReason?: string | null;
  senderId: string;
  sender?: Sender;
  createdAt: string;
}

export interface EmailStats {
  scheduled: number;
  sent: number;
  failed: number;
  rateLimited: number;
  total: number;
}

export interface SlackStatus {
  connected: boolean;
  webhookUrl?: string | null;
  channel?: string | null;
  isActive: boolean;
}
