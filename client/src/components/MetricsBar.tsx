import React from 'react';
import { EmailStats } from '../types';
import { Clock, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface MetricsBarProps {
  stats: EmailStats;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-[#111625]/80 border border-slate-800/80 rounded-xl p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Scheduled</span>
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-bold tracking-tight text-white">{stats.scheduled}</span>
          <span className="text-xs text-slate-400">in queue</span>
        </div>
      </div>

      <div className="bg-[#111625]/80 border border-slate-800/80 rounded-xl p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Sent Successfully</span>
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-bold tracking-tight text-white">{stats.sent}</span>
          <span className="text-xs text-emerald-400/80">delivered</span>
        </div>
      </div>

      <div className="bg-[#111625]/80 border border-slate-800/80 rounded-xl p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Rate Limited</span>
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-bold tracking-tight text-white">{stats.rateLimited}</span>
          <span className="text-xs text-amber-400/80">rescheduled</span>
        </div>
      </div>

      <div className="bg-[#111625]/80 border border-slate-800/80 rounded-xl p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Failed</span>
          <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
            <XCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-bold tracking-tight text-white">{stats.failed}</span>
          <span className="text-xs text-rose-400/80">errors</span>
        </div>
      </div>
    </div>
  );
};
