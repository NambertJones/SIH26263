import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldCheck, UserCheck, LogOut, Sparkles } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout, quickLogin } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-40 shadow-xs">
      {/* Left: Branding & Demo notice */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-5 h-5 text-white font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-base tracking-tight">APAAR ReconX</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                SIH26263
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">AICTE Student Verification Platform</p>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Simulated Government Adapters Active</span>
        </div>
      </div>

      {/* Right: Quick Role Switcher + User Info */}
      <div className="flex items-center gap-4">
        {/* Quick Role Switcher buttons for demo */}
        <div className="hidden md:flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs">
          <span className="text-slate-500 px-2 text-[11px] font-medium">Switch Role:</span>
          <button
            onClick={() => quickLogin('admin')}
            className={`px-2.5 py-1 rounded font-medium transition ${
              user?.role === 'admin'
                ? 'bg-white text-blue-700 font-semibold shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => quickLogin('institution_user')}
            className={`px-2.5 py-1 rounded font-medium transition ${
              user?.role === 'institution_user'
                ? 'bg-white text-blue-700 font-semibold shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            College Staff
          </button>
          <button
            onClick={() => quickLogin('reviewer')}
            className={`px-2.5 py-1 rounded font-medium transition ${
              user?.role === 'reviewer'
                ? 'bg-white text-blue-700 font-semibold shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            Reviewer
          </button>
        </div>

        {/* Current user pill */}
        <div className="flex items-center gap-3 pl-2">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-800 leading-tight">{user?.name || 'Demo User'}</p>
            <p className="text-[11px] text-blue-600 capitalize leading-tight font-medium">
              {user?.role ? user.role.replace('_', ' ') : 'Guest'}
            </p>
          </div>

          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
            <UserCheck className="w-4 h-4 text-blue-600" />
          </div>

          <button
            onClick={logout}
            title="Log Out"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
