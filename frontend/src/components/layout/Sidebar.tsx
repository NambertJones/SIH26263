import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isCentralUser } from '../../lib/privacy';
import {
  LayoutDashboard,
  UploadCloud,
  Split,
  CheckCircle2,
  Users,
  AlertOctagon,
  BarChart3,
  Network,
  UserCog,
  Building2,
  Award,
} from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  collegeOnly?: boolean;
  icon: React.ReactNode;
  badge?: string;
  screenNo: number;
}

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const central = isCentralUser(user);

  const allNavItems: NavItem[] = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" />, screenNo: 2 },
    { name: 'Upload Data', collegeOnly: true, path: '/upload', icon: <UploadCloud className="w-4 h-4" />, screenNo: 3 },
    { name: 'Column Mapping', collegeOnly: true, path: '/mapping', icon: <Split className="w-4 h-4" />, screenNo: 4 },
    { name: 'Validation Results', path: '/validation', icon: <CheckCircle2 className="w-4 h-4" />, screenNo: 5 },
    { name: 'Student Records', path: '/students', icon: <Users className="w-4 h-4" />, screenNo: 6 },
    { name: 'Verification Cases', path: '/cases', icon: <AlertOctagon className="w-4 h-4" />, screenNo: 7 },
    { name: 'Reports & Analytics', path: '/reports', icon: <BarChart3 className="w-4 h-4" />, screenNo: 8 },
    { name: 'Integrations', path: '/integrations', icon: <Network className="w-4 h-4" />, badge: 'Simulated', screenNo: 9 },
    { name: 'User Management', path: '/users', icon: <UserCog className="w-4 h-4" />, screenNo: 10 },
    { name: 'Institution Settings', collegeOnly: true, path: '/settings', icon: <Building2 className="w-4 h-4" />, screenNo: 11 },
    { name: 'Certificate Preview', path: '/certificate', icon: <Award className="w-4 h-4" />, screenNo: 12 },
  ];
  const navItems = central ? allNavItems.filter((i) => !i.collegeOnly) : allNavItems;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 h-[calc(100vh-4rem)] sticky top-16 select-none overflow-y-auto shadow-xs">
      <div className="py-4">
        {/* Current Institution Info */}
        <div className="mx-4 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold tracking-wider text-blue-700 uppercase">
            {central ? 'AICTE Central Review' : 'Active Institution'}
          </p>
          <p className="text-xs font-semibold text-slate-800 truncate mt-0.5">
            {central ? 'All approved institutions' : user?.institution_name || 'Institution'}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
            {central ? 'Verification Officer workspace' : 'Institution workspace'}
          </p>
        </div>

        {/* Navigation Section */}
        <div className="px-3">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Platform Workflow
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-600 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 group-hover:text-blue-600 transition">
                    {item.icon}
                  </span>
                  <span>{item.name}</span>
                </div>
                {item.badge ? (
                  <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                    {item.badge}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 group-hover:text-slate-600 font-mono">
                    S{item.screenNo}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Bottom Footer Info */}
      <div className="p-4 border-t border-slate-200 text-center bg-slate-50/80">
        <div className="text-[11px] text-slate-700 font-semibold">Smart India Hackathon 2026</div>
        <div className="text-[10px] text-slate-500 font-medium">Problem Statement: SIH26263</div>
      </div>
    </aside>
  );
};
