import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, UserCheck, AlertCircle, ArrowRight } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const ok = await login(username, password);
      if (!ok) {
        setError('Invalid username or password. Please try again.');
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setCredentials = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between p-4 sm:p-6 text-slate-100">
      <div className="max-w-md w-full mx-auto my-auto bg-slate-800/90 border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-4 shadow-inner">
            <svg
              className="w-10 h-10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 3h12l4 6-10 12L2 9z" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Diamond Dairy</h1>
          <p className="text-sm font-medium text-amber-400 mt-1">Proprietor: Muhammad Imran</p>
          <p className="text-xs text-slate-400 mt-1">Dairy Processing & Supply Management System</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-rose-950/60 border border-rose-800 text-rose-200 text-sm rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm"
              placeholder="Enter username"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl transition duration-150 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Credentials */}
        <div className="mt-8 pt-6 border-t border-slate-700/60">
          <p className="text-xs text-center font-medium text-slate-400 mb-3">Quick Login Roles:</p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setCredentials('admin', 'admin123')}
              className="p-2.5 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-xl text-left transition flex flex-col items-start cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                <ShieldCheck className="w-3.5 h-3.5" /> Admin
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5">admin / admin123</span>
              <span className="text-[10px] text-slate-500 mt-1">Full control, edit & delete</span>
            </button>

            <button
              type="button"
              onClick={() => setCredentials('accountant', 'accountant123')}
              className="p-2.5 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-xl text-left transition flex flex-col items-start cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-300">
                <UserCheck className="w-3.5 h-3.5" /> Accountant
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5">accountant / accountant123</span>
              <span className="text-[10px] text-slate-500 mt-1">Add only, no edit/delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAS Account Solution Credit Footer */}
      <footer className="text-center py-4 text-xs text-slate-400">
        <p className="font-medium text-slate-300">Diamond Dairy — Proprietor: Muhammad Imran</p>
        <p className="mt-0.5 text-slate-400">Developed by MAS Account Solution</p>
      </footer>
    </div>
  );
};
