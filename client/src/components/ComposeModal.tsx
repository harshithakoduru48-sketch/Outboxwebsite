import React, { useState, useRef } from 'react';
import { Sender } from '../types';
import { uploadLeadsFile, scheduleEmailCampaign } from '../api';
import { X, Upload, CheckCircle2, Clock, Send, Users, AlertCircle, FileText } from 'lucide-react';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  senders: Sender[];
  userId?: string;
  onScheduled: () => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  senders,
  userId,
  onScheduled,
}) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState(
    'Hi {{name}},\n\nI came across your work and wanted to reach out regarding our AI email infrastructure at ReachInbox.\n\nBest regards,\nGrowth Team'
  );
  const [selectedSenderId, setSelectedSenderId] = useState(senders[0]?.id || '');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [manualRecipients, setManualRecipients] = useState('');
  const [useManualInput, setUseManualInput] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (file: File) => {
    try {
      setIsUploading(true);
      setError(null);
      setUploadedFileName(file.name);
      const parsedEmails = await uploadLeadsFile(file);
      if (parsedEmails.length === 0) {
        setError('No valid email addresses detected in the uploaded file.');
      } else {
        setRecipients(parsedEmails);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to parse leads file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleManualEmailBlur = () => {
    if (!manualRecipients.trim()) return;
    const emails = manualRecipients
      .split(/[\n,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    setRecipients(Array.from(new Set(emails)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let finalRecipients = recipients;
    if (useManualInput && manualRecipients.trim()) {
      finalRecipients = manualRecipients
        .split(/[\n,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    }

    if (finalRecipients.length === 0) {
      setError('Please upload a leads file or enter at least one recipient email address.');
      return;
    }

    if (!subject.trim()) {
      setError('Subject is required');
      return;
    }

    if (!body.trim()) {
      setError('Email body is required');
      return;
    }

    try {
      setIsSubmitting(true);
      await scheduleEmailCampaign({
        recipientEmails: finalRecipients,
        subject,
        body,
        senderId: selectedSenderId || (senders[0]?.id ?? ''),
        startTime: startTime ? new Date(startTime).toISOString() : undefined,
        delayBetweenEmailsSeconds: delaySeconds,
        userId,
      });

      onScheduled();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to schedule campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedSender = senders.find((s) => s.id === selectedSenderId) || senders[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0e1322] border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-indigo-950/40 text-slate-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0c101d]">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Compose New Email Campaign</h2>
              <p className="text-xs text-slate-400">Schedule personalized cold email outreach with BullMQ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Sender Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">From (Sender Account)</label>
              {selectedSender && (
                <span className="text-[11px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                  Limit: {selectedSender.hourlyLimit} emails/hr
                </span>
              )}
            </div>
            <select
              value={selectedSenderId}
              onChange={(e) => setSelectedSenderId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#0c101d] border border-slate-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.email}) — {s.hourlyLimit} emails/hr
                </option>
              ))}
            </select>
          </div>

          {/* Recipient Lead Upload */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span>Recipient Leads</span>
              </label>
              <button
                type="button"
                onClick={() => setUseManualInput(!useManualInput)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {useManualInput ? 'Switch to File Upload' : 'Switch to Manual Paste'}
              </button>
            </div>

            {!useManualInput ? (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv,.txt"
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    recipients.length > 0
                      ? 'border-emerald-500/50 bg-emerald-950/20'
                      : 'border-slate-700/80 hover:border-indigo-500/60 bg-[#0c101d]/60 hover:bg-[#0c101d]'
                  }`}
                >
                  <Upload className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-300">
                    {isUploading
                      ? 'Parsing lead file...'
                      : uploadedFileName
                      ? `File: ${uploadedFileName}`
                      : 'Click to upload CSV or text file containing lead emails'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Supports standard CSVs with email headers or plain text email lists
                  </p>
                </div>

                {recipients.length > 0 && (
                  <div className="mt-2 flex items-center justify-between px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-300">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="font-medium">{recipients.length} email addresses detected</span>
                    </div>
                    <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
                      {recipients.slice(0, 3).join(', ')}
                      {recipients.length > 3 ? '...' : ''}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <textarea
                  value={manualRecipients}
                  onChange={(e) => setManualRecipients(e.target.value)}
                  onBlur={handleManualEmailBlur}
                  rows={3}
                  placeholder="Enter comma or newline separated email addresses (e.g. lead1@company.com, lead2@startup.io)"
                  className="w-full p-2.5 text-xs bg-[#0c101d] border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono"
                />
                {recipients.length > 0 && (
                  <div className="mt-1 text-[11px] text-emerald-400">
                    ✓ {recipients.length} valid email(s) recognized
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Subject Line</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Quick question regarding your growth strategy"
              className="w-full px-3 py-2 text-xs bg-[#0c101d] border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Email Message Body</span>
              </label>
              <span className="text-[10px] text-slate-500">Supports HTML & plain text</span>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="w-full p-3 text-xs bg-[#0c101d] border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono leading-relaxed"
            />
          </div>

          {/* Scheduling Configuration Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-[#0c101d]/70 rounded-xl border border-slate-800">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center space-x-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>Start Time</span>
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-[#111625] border border-slate-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Leave blank to start immediately</span>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Delay Between Emails (sec)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs bg-[#111625] border border-slate-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Provider throttling (default 2s)</span>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Hourly Rate Limit
              </label>
              <input
                type="number"
                readOnly
                value={selectedSender?.hourlyLimit || 200}
                className="w-full px-2.5 py-1.5 text-xs bg-[#111625]/60 border border-slate-800 rounded-lg text-slate-400 cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Managed per sender profile</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800 border border-slate-700/60 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 rounded-lg shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Scheduling...' : 'Schedule Campaign in BullMQ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
