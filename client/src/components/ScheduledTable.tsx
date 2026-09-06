import React from 'react';
import { EmailItem } from '../types';
import { Clock, Trash2, Mail, Calendar, AlertCircle } from 'lucide-react';

interface ScheduledTableProps {
  emails: EmailItem[];
  isLoading: boolean;
  onCancel: (id: string) => void;
}

export const ScheduledTable: React.FC<ScheduledTableProps> = ({
  emails,
  isLoading,
  onCancel,
}) => {
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
          <Mail className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-main)' }}>No Scheduled Emails</h3>
        <p className="text-xs max-w-sm mx-auto mb-4" style={{ color: 'var(--text-muted)' }}>
          Your queue is currently empty. Click "Compose New Email" to upload leads and schedule a campaign.
        </p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
            <Clock className="w-3 h-3 mr-1" />
            <span>Pending</span>
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping mr-1" />
            <span>Sending...</span>
          </span>
        );
      case 'RATE_LIMITED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <AlertCircle className="w-3 h-3 mr-1" />
            <span>Rate Limited</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium border" style={{ backgroundColor: 'var(--bg-pill)', color: 'var(--text-muted)', borderColor: 'var(--border-card)' }}>
            {status}
          </span>
        );
    }
  };

  return (
    <div className="border rounded-xl overflow-hidden shadow-sm transition-all" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="font-semibold border-b uppercase tracking-wider text-[10px]" style={{ backgroundColor: 'var(--bg-table-head)', borderColor: 'var(--border-card)', color: 'var(--text-muted)' }}>
            <tr>
              <th className="py-3.5 px-4">Recipient Email</th>
              <th className="py-3.5 px-4">Subject</th>
              <th className="py-3.5 px-4">Sender</th>
              <th className="py-3.5 px-4">Scheduled Time</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--border-card)' }}>
            {emails.map((email) => {
              const scheduledDate = new Date(email.scheduledAt);
              const isPast = scheduledDate.getTime() <= Date.now();

              return (
                <tr key={email.id} className="hover:bg-slate-500/5 transition-colors group">
                  <td className="py-3 px-4 font-medium" style={{ color: 'var(--text-main)' }}>
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-[10px]">
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
                    <div className="flex items-center space-x-1.5" style={{ color: 'var(--text-main)' }}>
                      <Calendar className="w-3 h-3 text-indigo-500" />
                      <span>{scheduledDate.toLocaleString()}</span>
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {isPast ? 'Executing now' : `in ${Math.round((scheduledDate.getTime() - Date.now()) / 1000)}s`}
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {getStatusBadge(email.status)}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => onCancel(email.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Cancel & Delete Job"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
