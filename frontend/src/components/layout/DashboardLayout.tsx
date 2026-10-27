import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { SiteFooter } from '../ui/DisclaimerBar';
import { Forbidden } from '../ui/States';
import { useAuth } from '../../contexts/AuthContext';
import { canAccess, routeMeta } from '../../lib/navigation';

const COLLAPSE_KEY = 'reconx.sidebarCollapsed';

export const DashboardLayout: React.FC = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const meta = routeMeta(pathname);
  const allowed = canAccess(user, pathname);

  useEffect(() => {
    document.title = `${meta.title} · APAAR ReconX`;
  }, [meta.title]);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1');
      return !c;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] focus:px-3 focus:py-2 focus:bg-white focus:rounded-lg focus:shadow"
      >
        Skip to main content
      </a>
      <Header onOpenMenu={() => setMobileOpen(true)} />
      <div className="flex flex-1 min-w-0">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 p-4 sm:p-6 md:p-8 max-w-[1600px] w-full focus:outline-none">
          {meta.crumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className="mb-4">
              <ol className="flex flex-wrap items-center gap-1 text-xs text-slate-600">
                <li>
                  <Link to="/dashboard" className="hover:underline">
                    Home
                  </Link>
                </li>
                {meta.crumbs.map((c, i) => (
                  <li key={i} className="flex items-center gap-1">
                    <ChevronRight className="w-3 h-3 text-slate-400" aria-hidden="true" />
                    {c.path && i < meta.crumbs.length - 1 ? (
                      <Link to={c.path} className="hover:underline">
                        {c.label}
                      </Link>
                    ) : (
                      <span aria-current={i === meta.crumbs.length - 1 ? 'page' : undefined} className={i === meta.crumbs.length - 1 ? 'font-semibold text-slate-800' : ''}>
                        {c.label}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}
          {allowed ? <Outlet /> : <Forbidden />}
        </main>
      </div>
      <SiteFooter />
    </div>
  );
};
