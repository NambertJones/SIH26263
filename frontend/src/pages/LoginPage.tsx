import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, Lock, Mail, ArrowRight, KeyRound, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@college.edu.in');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { login, quickLogin } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuick = async (role: 'admin' | 'institution_user' | 'reviewer') => {
    setError(null);
    setSubmitting(true);
    try {
      await quickLogin(role);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Quick login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060b14] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-300 p-0.5 shadow-xl shadow-amber-500/20 mb-4">
            <div className="w-full h-full bg-[#081220] rounded-[14px] flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-amber-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">APAAR ReconX</h1>
          <p className="text-xs text-amber-400/90 font-medium uppercase tracking-widest mb-1">
            ALL INDIA COUNCIL FOR TECHNICAL EDUCATION
          </p>
          <p className="text-xs text-slate-400">
            Automated Student Enrollment & APAAR ID Reconciliation Portal
          </p>
        </div>

        {/* Demo Credentials Quick-Select Pill Box */}
        <div className="mb-6 p-3.5 bg-[#0a1628]/80 border border-amber-500/30 rounded-xl backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 mb-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Prototype One-Click Access (Select Role):</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuick('admin')}
              className="px-2.5 py-1.5 bg-[#12233f] hover:bg-[#183056] border border-amber-500/40 text-amber-200 text-xs font-medium rounded-lg transition text-center"
            >
              👑 College Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuick('institution_user')}
              className="px-2.5 py-1.5 bg-[#12233f] hover:bg-[#183056] border border-amber-500/40 text-amber-200 text-xs font-medium rounded-lg transition text-center"
            >
              🏫 College Staff
            </button>
            <button
              type="button"
              onClick={() => handleQuick('reviewer')}
              className="px-2.5 py-1.5 bg-[#12233f] hover:bg-[#183056] border border-amber-500/40 text-amber-200 text-xs font-medium rounded-lg transition text-center"
            >
              🔍 AICTE Reviewer
            </button>
          </div>
        </div>

        {/* Login Form Card */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-[#1e3a66] shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Official Email ID</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@college.edu.in"
                  className="w-full bg-[#081220] border border-[#1b3459] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-[#081220] border border-[#1b3459] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-lg shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 text-sm transition disabled:opacity-50"
            >
              <span>{submitting ? 'Verifying...' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-[#0e1a2f] px-2 text-slate-500 tracking-wider">or sign in with</span>
              </div>
            </div>

            {/* Parichay / MeriPehchaan SSO button (disabled simulation) */}
            <button
              type="button"
              disabled
              className="w-full py-2 px-3 bg-[#081322] border border-slate-800 text-slate-400 rounded-lg text-xs font-medium flex items-center justify-center gap-2 opacity-70 cursor-not-allowed"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-500/60" />
              <span>MeriPehchaan (National Govt SSO - Coming Soon)</span>
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-500 mt-6">
          Smart India Hackathon 2026 · AICTE Prototype Portal
        </p>
      </div>
    </div>
  );
};
