import React, { useState, useEffect, useCallback } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { User, EmailItem, EmailStats, Sender, SlackStatus } from './types';
import {
  fetchScheduledEmails,
  fetchSentEmails,
  fetchStats,
  fetchSenders,
  fetchSlackStatus,
  searchEmails,
  deleteScheduledEmail,
} from './api';
import { Header } from './components/Header';
import { MetricsBar } from './components/MetricsBar';
import { SearchBar } from './components/SearchBar';
import { ScheduledTable } from './components/ScheduledTable';
import { SentTable } from './components/SentTable';
import { ComposeModal } from './components/ComposeModal';
import { SlackModal } from './components/SlackModal';
import { LoginView } from './components/LoginView';
import { Clock, Send } from 'lucide-react';

const GOOGLE_CLIENT_ID =
  (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
  '98429872965-eefpl46hoc76r4uv0m6ecg47otrhiv5o.apps.googleusercontent.com';

export function AppContent() {
  const [theme, setTheme] = useState<string>(() => {
    const saved = localStorage.getItem('reachinbox_theme');
    return saved || 'midnight';
  });

  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('reachinbox_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [scheduledEmails, setScheduledEmails] = useState<EmailItem[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailItem[]>([]);
  const [stats, setStats] = useState<EmailStats>({
    scheduled: 0,
    sent: 0,
    failed: 0,
    rateLimited: 0,
    total: 0,
  });
  const [senders, setSenders] = useState<Sender[]>([]);
  const [slackStatus, setSlackStatus] = useState<SlackStatus>({
    connected: false,
    isActive: false,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchSource, setSearchSource] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSlackOpen, setIsSlackOpen] = useState(false);

  // Apply theme to HTML attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('reachinbox_theme', theme);
  }, [theme]);

  const handleSelectTheme = (newTheme: string) => {
    setTheme(newTheme);
  };

  const loadData = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setIsLoading(true);

      const [scheduledRes, sentRes, statsRes, sendersRes, slackRes] = await Promise.all([
        fetchScheduledEmails(),
        fetchSentEmails(),
        fetchStats(),
        fetchSenders(),
        fetchSlackStatus(),
      ]);

      setScheduledEmails(scheduledRes);
      setSentEmails(sentRes);
      setStats(statsRes);
      setSenders(sendersRes);
      setSlackStatus(slackRes);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSearch = useCallback(async (query: string, status: string) => {
    if (!query.trim() && status === 'ALL') {
      setSearchSource('');
      loadData();
      return;
    }

    try {
      setIsSearching(true);
      const res = await searchEmails(query, status);
      setSearchSource(res.source);

      const scheduled = res.emails.filter((e) =>
        ['PENDING', 'PROCESSING', 'RATE_LIMITED'].includes(e.status)
      );
      const sent = res.emails.filter((e) => ['SENT', 'FAILED'].includes(e.status));

      setScheduledEmails(scheduled);
      setSentEmails(sent);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  }, [loadData]);

  useEffect(() => {
    if (user) {
      loadData(true);
    }
  }, [user, loadData]);

  useEffect(() => {
    if (!user || searchQuery.trim()) return;
    const interval = setInterval(() => {
      loadData(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [user, searchQuery, loadData]);

  useEffect(() => {
    const handler = setTimeout(() => {
      handleSearch(searchQuery, statusFilter);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery, statusFilter, handleSearch]);

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('reachinbox_user', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('reachinbox_user');
  };

  const handleCancelEmail = async (id: string) => {
    try {
      await deleteScheduledEmail(id);
      loadData(false);
    } catch (err) {
      console.error('Failed to delete email:', err);
    }
  };

  if (!user) {
    return (
      <LoginView
        theme={theme}
        onSelectTheme={handleSelectTheme}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col transition-colors" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}>
      {/* Header with Navigation, Theme Switcher & User Details */}
      <Header
        user={user}
        slackStatus={slackStatus}
        theme={theme}
        onSelectTheme={handleSelectTheme}
        onOpenCompose={() => setIsComposeOpen(true)}
        onOpenSlack={() => setIsSlackOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Real-Time Queue Metrics */}
        <MetricsBar stats={stats} />

        {/* Search Bar with Elasticsearch Integration */}
        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onRefresh={() => loadData(true)}
          isSearching={isSearching}
          searchSource={searchSource}
        />

        {/* Navigation Tabs (Figma Styled) */}
        <div className="flex items-center justify-between border-b mb-6" style={{ borderColor: 'var(--border-card)' }}>
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`flex items-center space-x-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'scheduled'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Scheduled Emails</span>
              <span className="ml-1.5 px-2 py-0.5 text-[10px] rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono font-semibold">
                {scheduledEmails.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('sent')}
              className={`flex items-center space-x-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'sent'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Sent Emails</span>
              <span className="ml-1.5 px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                {sentEmails.length}
              </span>
            </button>
          </div>
        </div>

        {/* Tab Panels */}
        {activeTab === 'scheduled' ? (
          <ScheduledTable
            emails={scheduledEmails}
            isLoading={isLoading}
            onCancel={handleCancelEmail}
          />
        ) : (
          <SentTable emails={sentEmails} isLoading={isLoading} />
        )}
      </main>

      {/* Compose Campaign Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        senders={senders}
        userId={user.id}
        onScheduled={() => {
          loadData(true);
          setActiveTab('scheduled');
        }}
      />

      {/* Slack Integration Modal */}
      <SlackModal
        isOpen={isSlackOpen}
        onClose={() => setIsSlackOpen(false)}
        slackStatus={slackStatus}
        onStatusUpdated={() => loadData(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AppContent />
    </GoogleOAuthProvider>
  );
}
