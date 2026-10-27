import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldCheck, UserCheck, LogOut, Sparkles, Menu } from 'lucide-react';
import { PERSONA_LABEL, personaOf } from '../../lib/navigation';

const ROLE_SWITCH: { role: 'admin' | 'institution_user' | 'reviewer'; label: string }[] = [
  { role: 'admin', label: 'Admin' },
  { role: 'institution_user', label: 'College Staff' },
  { role: 'reviewer', label: 'Oversight Reviewer' },
];

export const Header: React.FC<{ onOpenMenu: () => void }> = ({ onOpenMenu }) => {
  const { user, logout, quickLogin } = useAuth();
  const persona = personaOf(user);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-40 shadow-xs">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open navigation"
          className="lg:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100"
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 shrink-0 rounded-lg bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-base tracking-tight">APAAR ReconX</span>
              <span className="hidden sm:inline text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                SIH26263
              </span>
            </div>
            <p className="hidden sm:block text-[11px] text-slate-600 font-medium truncate">Independent prototype · not an official portal</p>
          </div>
        </div>

        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-violet-50 border border-violet-200 text-violet-800 text-xs font-bold tracking-wide shrink-0"
          title="Demo mode: synthetic data; APAAR, DigiLocker, AICTE and AISHE connectors are simulated"
        >
          <Sparkles className="w-3.5 h-3.5 text-violet-600" aria-hidden="true" />
          <span>DEMO MODE</span>
          <span className="hidden xl:inline font-medium">· synthetic data, simulated connectors</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Demo-only role switcher (dev convenience; uses seeded demo accounts) */}
        <div className="hidden md:flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs" role="group" aria-label="Switch demo role">
          <span className="text-slate-600 px-2 text-[11px] font-medium">Demo role:</span>
          {ROLE_SWITCH.map((r) => (
            <button
              key={r.role}
              type="button"
              onClick={() => quickLogin(r.role)}
              aria-pressed={user?.role === r.role}
              className={`px-2.5 py-1 rounded font-medium transition ${
                user?.role === r.role
                  ? 'bg-white text-blue-800 font-semibold shadow-xs border border-slate-200'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-800 leading-tight">{user?.name || 'Demo User'}</p>
            <p className="text-[11px] text-blue-700 leading-tight font-medium">{persona ? PERSONA_LABEL[persona] : 'Guest'}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center" aria-hidden="true">
            <UserCheck className="w-4 h-4 text-blue-600" />
          </div>
          <button
            type="button"
            onClick={logout}
            aria-label="Sign out"
            title="Sign out"
            className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
};
