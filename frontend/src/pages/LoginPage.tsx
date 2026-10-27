import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, Lock, Mail, ArrowRight, KeyRound, Sparkles, Building2, School, SearchCheck } from 'lucide-react';
import { SiteFooter } from '../components/ui/DisclaimerBar';

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
    <div className="min-h-screen bg-slate-50 flex flex-col">
    <div className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 p-0.5 shadow-md shadow-blue-500/20 mb-3.5">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">APAAR ReconX</h1>
          <p className="text-xs text-blue-700 font-bold uppercase tracking-widest mb-1">
            Student Data Verification Platform
          </p>
          <p className="text-xs text-slate-500">
            Enrolment data validation & reconciliation for higher-education institutions
          </p>
        </div>

        {/* Quick sign-in */}
        <div className="mb-5 p-3.5 bg-white border border-blue-200/80 rounded-xl shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800 mb-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Quick sign-in:</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuick('admin')}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-xs font-semibold rounded-lg transition text-center"
            >
              <span className="inline-flex items-center justify-center gap-1"><Building2 className="w-3.5 h-3.5" aria-hidden="true" />College Admin</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuick('institution_user')}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-xs font-semibold rounded-lg transition text-center"
            >
              <span className="inline-flex items-center justify-center gap-1"><School className="w-3.5 h-3.5" aria-hidden="true" />College Staff</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuick('reviewer')}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-xs font-semibold rounded-lg transition text-center"
            >
              <span className="inline-flex items-center justify-center gap-1"><SearchCheck className="w-3.5 h-3.5" aria-hidden="true" />Oversight Reviewer</span>
            </button>
          </div>
        </div>

        {/* Login Form Card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xl">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@college.edu.in"
                  className="w-full bg-slate-50/50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-slate-50/50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm shadow-blue-500/20 flex items-center justify-center gap-2 text-sm transition disabled:opacity-50"
            >
              <span>{submitting ? 'Signing in...' : 'Sign in'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-white px-2 text-slate-400 font-semibold tracking-wider">or sign in with</span>
              </div>
            </div>

            {/* Government SSO is a roadmap item: needs official onboarding */}
            <button
              type="button"
              disabled
              title="Coming soon — requires government SSO onboarding"
              className="w-full py-2 px-3 bg-slate-100 border border-slate-200 text-slate-500 rounded-lg text-xs font-medium flex items-center justify-center gap-2 opacity-75 cursor-not-allowed"
            >
              <KeyRound className="w-3.5 h-3.5 text-blue-600/60" />
              <span>Government SSO — coming soon</span>
            </button>
          </form>
        </div>

      </div>
    </div>
    <SiteFooter />
    </div>
  );
};
