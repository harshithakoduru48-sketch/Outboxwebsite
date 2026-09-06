import React from 'react';
import { EmailStats } from '../types';
import { Clock, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface MetricsBarProps {
  stats: EmailStats;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="border rounded-xl p-4 shadow-sm transition-all" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)', boxShadow: 'var(--card-shadow)' }}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Scheduled</span>
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>{stats.scheduled}</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>in queue</span>
        </div>
      </div>

      <div className="border rounded-xl p-4 shadow-sm transition-all" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)', boxShadow: 'var(--card-shadow)' }}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Sent Successfully</span>
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>{stats.sent}</span>
          <span className="text-xs text-emerald-500 font-medium">delivered</span>
        </div>
      </div>

      <div className="border rounded-xl p-4 shadow-sm transition-all" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)', boxShadow: 'var(--card-shadow)' }}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Rate Limited</span>
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>{stats.rateLimited}</span>
          <span className="text-xs text-amber-500 font-medium">rescheduled</span>
        </div>
      </div>

      <div className="border rounded-xl p-4 shadow-sm transition-all" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)', boxShadow: 'var(--card-shadow)' }}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Failed</span>
          <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
            <XCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>{stats.failed}</span>
          <span className="text-xs text-rose-500 font-medium">errors</span>
        </div>
      </div>
    </div>
  );
};
