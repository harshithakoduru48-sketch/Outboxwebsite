import React, { useState } from 'react';
import { SlackStatus } from '../types';
import { saveSlackWebhook, disconnectSlack, triggerTestSlackAlert } from '../api';
import { X, MessageSquare, CheckCircle2, AlertTriangle, Send, Unlink, BellRing } from 'lucide-react';

interface SlackModalProps {
  isOpen: boolean;
  onClose: () => void;
  slackStatus: SlackStatus;
  onStatusUpdated: () => void;
}

export const SlackModal: React.FC<SlackModalProps> = ({
  isOpen,
  onClose,
  slackStatus,
  onStatusUpdated,
}) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [channel, setChannel] = useState('#alerts');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.trim()) {
      setFeedback({ type: 'error', message: 'Webhook URL is required' });
      return;
    }

    try {
      setIsSaving(true);
      setFeedback(null);
      await saveSlackWebhook(webhookUrl.trim(), channel.trim());
      setFeedback({
        type: 'success',
        message: 'Slack webhook connected and verified with live test message!',
      });
      onStatusUpdated();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || 'Failed to verify and save Slack webhook',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setFeedback(null);
      await disconnectSlack();
      setFeedback({ type: 'success', message: 'Slack disconnected successfully' });
      onStatusUpdated();
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to disconnect Slack' });
    }
  };

  const handleTriggerTest = async () => {
    try {
      setIsTesting(true);
      setFeedback(null);
      const res = await triggerTestSlackAlert(webhookUrl.trim() || undefined);
      setFeedback({
        type: 'success',
        message: res.message || 'Live test alert dispatched to Slack successfully!',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || 'Failed to send live Slack alert',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0e1322] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl shadow-indigo-950/40 text-slate-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0c101d]">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#4A154B]/30 text-[#ECB22E] flex items-center justify-center border border-[#ECB22E]/30">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Slack Rate-Limit Integration</h2>
              <p className="text-xs text-slate-400">Receive real-time alerts when sender hourly limits are reached</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Status Pill */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
              slackStatus.connected
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
            }`}
          >
            <div className="flex items-center space-x-2">
              {slackStatus.connected ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-slate-400 shrink-0" />
              )}
              <span>
                {slackStatus.connected
                  ? `Active Connection (${slackStatus.channel || '#alerts'})`
                  : 'Slack is not connected. Rate-limit hits will be silenced without failing jobs.'}
              </span>
            </div>

            {slackStatus.connected && (
              <button
                onClick={handleDisconnect}
                className="flex items-center space-x-1 text-rose-400 hover:text-rose-300 transition-colors text-[11px] font-medium"
              >
                <Unlink className="w-3 h-3" />
                <span>Disconnect</span>
              </button>
            )}
          </div>

          {feedback && (
            <div
              className={`p-3 text-xs rounded-xl flex items-center space-x-2 border ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Connect Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Slack Incoming Webhook URL
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/T.../B.../..."
                className="w-full px-3 py-2 text-xs bg-[#0c101d] border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Paste your Slack App Incoming Webhook URL or test webhook from webhook.site
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Alert Channel Name</label>
              <input
                type="text"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                placeholder="#email-alerts"
                className="w-full px-3 py-2 text-xs bg-[#0c101d] border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 flex items-center justify-center space-x-2 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Verifying...' : 'Save & Verify Webhook'}</span>
              </button>

              <button
                type="button"
                onClick={handleTriggerTest}
                disabled={isTesting || (!slackStatus.connected && !webhookUrl)}
                className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-all disabled:opacity-40"
                title="Send a live test alert to Slack for assignment video demo"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>{isTesting ? 'Sending...' : 'Test Live Alert'}</span>
              </button>
            </div>
          </form>

          {/* Explanatory Context */}
          <div className="p-3 bg-[#0c101d] border border-slate-800/80 rounded-xl text-[11px] text-slate-400 space-y-1">
            <p className="font-medium text-slate-300">🛡️ Real-World Resilience:</p>
            <p>
              When a sender reaches their hourly quota (e.g. 200 emails/hr), jobs are automatically deferred to the next hour window in BullMQ, and a live alert is sent to your Slack channel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
