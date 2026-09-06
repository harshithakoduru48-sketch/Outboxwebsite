import React from 'react';
import { EmailItem } from '../types';
import { CheckCircle2, XCircle, ExternalLink, Calendar, Send } from 'lucide-react';

interface SentTableProps {
  emails: EmailItem[];
  isLoading: boolean;
}

export const SentTable: React.FC<SentTableProps> = ({ emails, isLoading }) => {
  if (isLoading) {
    return (
      <div className="border rounded-xl p-8" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 rounded-lg opacity-40" style={{ backgroundColor: 'var(--border-card)' }} />
          ))}
        </div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="border rounded-xl p-12 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'var(--bg-pill)', color: 'var(--text-muted)' }}>
          <Send className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-main)' }}>No Sent Emails Yet</h3>
        <p className="text-xs max-w-sm mx-auto mb-4" style={{ color: 'var(--text-muted)' }}>
          Once scheduled emails are processed and dispatched by the BullMQ workers, they will appear here with live Ethereal preview links.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-xl overflow-hidden shadow-sm transition-all" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="font-semibold border-b uppercase tracking-wider text-[10px]" style={{ backgroundColor: 'var(--bg-table-head)', borderColor: 'var(--border-card)', color: 'var(--text-muted)' }}>
            <tr>
              <th className="py-3.5 px-4">Recipient Email</th>
              <th className="py-3.5 px-4">Subject</th>
              <th className="py-3.5 px-4">Sender</th>
              <th className="py-3.5 px-4">Sent Timestamp</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Ethereal Preview</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--border-card)' }}>
            {emails.map((email) => {
              const sentDate = email.sentAt ? new Date(email.sentAt) : null;
              const isSuccess = email.status === 'SENT';

              return (
                <tr key={email.id} className="hover:bg-slate-500/5 transition-colors group">
                  <td className="py-3 px-4 font-medium" style={{ color: 'var(--text-main)' }}>
                    <div className="flex items-center space-x-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                        isSuccess ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      }`}>
                        {email.recipientEmail[0].toUpperCase()}
                      </div>
                      <span className="truncate max-w-[200px]">{email.recipientEmail}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium truncate max-w-[240px]" style={{ color: 'var(--text-main)' }}>{email.subject}</div>
                    <div className="text-[11px] truncate max-w-[240px]" style={{ color: 'var(--text-muted)' }}>
                      {email.body.slice(0, 60)}...
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="truncate max-w-[150px]" style={{ color: 'var(--text-main)' }}>{email.sender?.name || 'Default'}</div>
                    <div className="text-[10px] truncate max-w-[150px]" style={{ color: 'var(--text-muted)' }}>
                      {email.sender?.email || ''}
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {sentDate ? (
                      <div className="flex items-center space-x-1.5" style={{ color: 'var(--text-main)' }}>
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{sentDate.toLocaleString()}</span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {isSuccess ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        <span>Sent</span>
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                        title={email.errorReason || 'Failed to dispatch'}
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        <span>Failed</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    {email.etherealPreviewUrl ? (
                      <a
                        href={email.etherealPreviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg transition-all"
                      >
                        <span>View Email</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Not available</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
