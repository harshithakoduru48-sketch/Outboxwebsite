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
          <Mail className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-200 mb-1">No Scheduled Emails</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
          Your queue is currently empty. Click "Compose New Email" to upload leads and schedule a campaign.
        </p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Clock className="w-3 h-3 mr-1" />
            <span>Pending</span>
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping mr-1" />
            <span>Sending...</span>
          </span>
        );
      case 'RATE_LIMITED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertCircle className="w-3 h-3 mr-1" />
            <span>Rate Limited</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-[#111625]/60 border border-slate-800 rounded-xl overflow-hidden shadow-lg shadow-black/20">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-[#0c101d] text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3.5 px-4">Recipient Email</th>
              <th className="py-3.5 px-4">Subject</th>
              <th className="py-3.5 px-4">Sender</th>
              <th className="py-3.5 px-4">Scheduled Time</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {emails.map((email) => {
              const scheduledDate = new Date(email.scheduledAt);
              const isPast = scheduledDate.getTime() <= Date.now();

              return (
                <tr key={email.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="py-3 px-4 font-medium text-slate-200">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-950 text-indigo-400 flex items-center justify-center font-bold text-[10px]">
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
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>{scheduledDate.toLocaleString()}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {isPast ? 'Executing now' : `in ${Math.round((scheduledDate.getTime() - Date.now()) / 1000)}s`}
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {getStatusBadge(email.status)}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => onCancel(email.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
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
