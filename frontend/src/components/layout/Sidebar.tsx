import React from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { isCentralUser } from '../../lib/privacy';
import { visibleNav } from '../../lib/navigation';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

/** Role-aware navigation: a role never sees an item it cannot use. Collapses to icons on desktop, drawer on mobile. */
export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }) => {
  const { user } = useAuth();
  const central = isCentralUser(user);
  const items = visibleNav(user);
  const sections = Array.from(new Set(items.map((i) => i.section)));

  const nav = (compact: boolean) => (
    <nav aria-label="Main navigation" className="px-3 space-y-4">
      {sections.map((section) => (
        <div key={section}>
          {!compact && (
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{section}</p>
          )}
          <ul className="space-y-0.5">
            {items
              .filter((i) => i.section === section)
              .map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={onCloseMobile}
                    title={compact ? item.label : undefined}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg text-[13px] font-medium transition ${
                        compact ? 'justify-center p-2.5' : 'px-3 py-2'
                      } ${
                        isActive
                          ? 'bg-blue-50 text-blue-800 font-semibold ring-1 ring-inset ring-blue-200'
                          : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600`
                    }
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {compact ? <span className="sr-only">{item.label}</span> : <span>{item.label}</span>}
                  </NavLink>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  const scopeCard = (
    <div className="mx-4 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
      <p className="text-[11px] font-bold tracking-wider text-blue-800 uppercase">
        {central ? 'Oversight scope (demo)' : 'Institution scope'}
      </p>
      <p className="text-xs font-semibold text-slate-800 truncate mt-0.5" title={user?.institution_name}>
        {central ? 'All demo institutions' : user?.institution_name || 'Institution'}
      </p>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex ${
          collapsed ? 'w-16' : 'w-64'
        } bg-white border-r border-slate-200 flex-col justify-between shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto transition-[width] duration-200`}
      >
        <div className="py-4">
          {!collapsed && scopeCard}
          {nav(collapsed)}
        </div>
        <div className="p-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            {collapsed ? <ChevronsRight className="w-4 h-4" aria-hidden="true" /> : <ChevronsLeft className="w-4 h-4" aria-hidden="true" />}
            {!collapsed && 'Collapse'}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-slate-900/40" onClick={onCloseMobile} aria-hidden="true" />
          <aside className="relative w-72 max-w-[85%] bg-white h-full overflow-y-auto shadow-xl py-4">
            <div className="flex items-center justify-between px-4 mb-3">
              <span className="font-bold text-slate-900">APAAR ReconX</span>
              <button type="button" onClick={onCloseMobile} aria-label="Close navigation" className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            {scopeCard}
            {nav(false)}
          </aside>
        </div>
      )}
    </>
  );
};
