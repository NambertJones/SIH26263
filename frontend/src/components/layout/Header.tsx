import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldCheck, UserCheck, LogOut, Sparkles } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout, quickLogin } = useAuth();

  return (
    <header className="h-16 bg-[#0a1424] border-b border-[#1c3358] px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Left: Branding & Demo notice */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <ShieldCheck className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base tracking-wide">APAAR ReconX</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                SIH26263
              </span>
            </div>
            <p className="text-[11px] text-slate-400">AICTE Student Verification Platform</p>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-950/50 border border-sky-800/40 text-sky-300 text-xs">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span>Simulated Government Adapters Active</span>
        </div>
      </div>

      {/* Right: Quick Role Switcher + User Info */}
      <div className="flex items-center gap-4">
        {/* Quick Role Switcher buttons for demo */}
        <div className="hidden md:flex items-center gap-1.5 p-1 bg-[#070e1a] rounded-lg border border-[#1b3152] text-xs">
          <span className="text-slate-400 px-2 text-[11px] font-medium">Switch Role:</span>
          <button
            onClick={() => quickLogin('admin')}
            className={`px-2.5 py-1 rounded font-medium transition ${
              user?.role === 'admin'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => quickLogin('institution_user')}
            className={`px-2.5 py-1 rounded font-medium transition ${
              user?.role === 'institution_user'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            College Staff
          </button>
          <button
            onClick={() => quickLogin('reviewer')}
            className={`px-2.5 py-1 rounded font-medium transition ${
              user?.role === 'reviewer'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Reviewer
          </button>
        </div>

        {/* Current user pill */}
        <div className="flex items-center gap-3 pl-2">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-white leading-tight">{user?.name || 'Demo User'}</p>
            <p className="text-[11px] text-amber-400/90 capitalize leading-tight">
              {user?.role ? user.role.replace('_', ' ') : 'Guest'}
            </p>
          </div>

          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
            <UserCheck className="w-4 h-4 text-amber-400" />
          </div>

          <button
            onClick={logout}
            title="Log Out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
