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
      <div className="bg-[#111625]/60 border border-slate-800 rounded-xl p-8">
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-slate-800/40 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="bg-[#111625]/60 border border-slate-800 rounded-xl p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <Send className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-200 mb-1">No Sent Emails Yet</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
          Once scheduled emails are processed and dispatched by the BullMQ workers, they will appear here with live Ethereal preview links.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#111625]/60 border border-slate-800 rounded-xl overflow-hidden shadow-lg shadow-black/20">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-[#0c101d] text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3.5 px-4">Recipient Email</th>
              <th className="py-3.5 px-4">Subject</th>
              <th className="py-3.5 px-4">Sender</th>
              <th className="py-3.5 px-4">Sent Timestamp</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Ethereal Preview</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {emails.map((email) => {
              const sentDate = email.sentAt ? new Date(email.sentAt) : null;
              const isSuccess = email.status === 'SENT';

              return (
                <tr key={email.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="py-3 px-4 font-medium text-slate-200">
                    <div className="flex items-center space-x-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                        isSuccess ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                      }`}>
                        {email.recipientEmail[0].toUpperCase()}
                      </div>
                      <span className="truncate max-w-[200px]">{email.recipientEmail}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    <div className="font-medium truncate max-w-[240px]">{email.subject}</div>
                    <div className="text-[11px] text-slate-500 truncate max-w-[240px]">
                      {email.body.slice(0, 60)}...
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    <div className="truncate max-w-[150px]">{email.sender?.name || 'Default'}</div>
                    <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                      {email.sender?.email || ''}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                    {sentDate ? (
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>{sentDate.toLocaleString()}</span>
                      </div>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {isSuccess ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        <span>Sent</span>
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20"
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
                        className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg transition-all"
                      >
                        <span>View Email</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-slate-600 text-xs">Not available</span>
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
