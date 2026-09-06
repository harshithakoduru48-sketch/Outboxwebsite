import React from 'react';
import { User, SlackStatus } from '../types';
import { Mail, Activity, MessageSquare, LogOut, Send } from 'lucide-react';

interface HeaderProps {
  user: User | null;
  slackStatus: SlackStatus;
  onOpenCompose: () => void;
  onOpenSlack: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  slackStatus,
  onOpenCompose,
  onOpenSlack,
  onLogout,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-[#0c101d]/90 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-400/30">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-white">ReachInbox</span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md uppercase tracking-wider">
                Scheduler
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex items-center space-x-3">
          {/* Live BullMQ Dashboard Link */}
          <a
            href="/admin/queues"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-lg transition-all shadow-sm"
            title="Open Live BullMQ Worker Queue Dashboard"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>BullMQ Live</span>
          </a>

          {/* Slack Connection Pill */}
          <button
            onClick={onOpenSlack}
            className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
              slackStatus.connected
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50 hover:bg-emerald-900/50'
                : 'bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <MessageSquare className={`w-3.5 h-3.5 ${slackStatus.connected ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>{slackStatus.connected ? 'Slack Connected' : 'Connect Slack'}</span>
            <span
              className={`w-2 h-2 rounded-full ${
                slackStatus.connected ? 'bg-emerald-400 ring-2 ring-emerald-400/20' : 'bg-slate-500'
              }`}
            />
          </button>

          {/* Primary Compose Button */}
          <button
            onClick={onOpenCompose}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 rounded-lg shadow-md shadow-indigo-600/25 transition-all active:scale-95 ring-1 ring-indigo-400/30"
          >
            <Send className="w-4 h-4" />
            <span>Compose New Email</span>
          </button>

          {/* User Profile & Logout */}
          {user && (
            <div className="flex items-center space-x-3 pl-2 border-l border-slate-800">
              <div className="flex items-center space-x-2.5">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-8 h-8 rounded-full ring-1 ring-indigo-500/40 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white ring-1 ring-white/10">
                    {user.name ? user.name[0].toUpperCase() : 'U'}
                  </div>
                )}
                <div className="hidden md:block text-left">
                  <div className="text-xs font-medium text-slate-200 leading-none truncate max-w-[120px]">
                    {user.name}
                  </div>
                  <div className="text-[11px] text-slate-400 leading-none mt-1 truncate max-w-[140px]">
                    {user.email}
                  </div>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
