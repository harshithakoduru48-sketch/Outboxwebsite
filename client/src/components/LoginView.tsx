import React, { useState } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { loginWithGoogleCredential, loginWithDemo } from '../api';
import { User } from '../types';
import { Mail, ShieldCheck, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError('No credential received from Google OAuth');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const user = await loginWithGoogleCredential(credentialResponse.credential);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to authenticate with Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const user = await loginWithDemo();
      onLoginSuccess(user);
    } catch (err: any) {
      setError('Failed to login with demo user');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090D16] flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Background Gradient Blurs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#0e1322]/80 border border-slate-800/80 rounded-2xl p-8 shadow-2xl backdrop-blur-xl relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-500 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-600/30 ring-1 ring-indigo-400/40">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <div className="flex items-center justify-center space-x-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-white m-0">ReachInbox</h1>
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded uppercase tracking-wider">
              Scheduler
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            High-throughput, persistent cold outreach job scheduler
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Options */}
        <div className="space-y-4">
          {/* Real Google OAuth Button */}
          <div className="flex justify-center w-full py-1">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google OAuth login failed')}
              theme="filled_black"
              size="large"
              shape="rectangular"
              text="continue_with"
              width="100%"
            />
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-3 text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
              or quick evaluator access
            </span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* One-Click Demo Evaluator Login */}
          <button
            onClick={handleDemoLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 text-xs font-semibold text-slate-200 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl shadow-sm transition-all active:scale-98 disabled:opacity-50"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>{isLoading ? 'Authenticating...' : 'Sign in as Demo Evaluator (Alex Rivera)'}</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 ml-auto" />
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="mt-8 pt-6 border-t border-slate-800/60 space-y-2 text-[11px] text-slate-400">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>BullMQ persistent queue with Redis backend (No Cron)</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Survives server restarts with zero dropped jobs</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Per-sender rate limiting & live Slack notifications</span>
          </div>
        </div>
      </div>
    </div>
  );
};
