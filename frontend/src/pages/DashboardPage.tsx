import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi, reportsApi, casesApi } from '../api/client';
import { ErrorBanner, PageLoading, EmptyState } from '../components/ui/States';
import { formatIST, nowIST } from '../lib/format';
import { useAuth } from '../contexts/AuthContext';
import { isCentralUser } from '../lib/privacy';
import { StatCard } from '../components/ui/StatCard';
import {
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  Upload,
  ArrowUpRight,
  TrendingUp,
  FileCheck2,
  Calendar,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [programs, setPrograms] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState('');
  const [intakeReview, setIntakeReview] = useState<number | null>(null);
  const [dupOpen, setDupOpen] = useState<number | null>(null);
  const navigate = useNavigate();
  const central = isCentralUser(user);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, progRes, statusRes, actRes, intakeRes, dupRes] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getEnrollmentByProgram(),
        dashboardApi.getSubmissionStatus(),
        dashboardApi.getRecentActivity(),
        reportsApi.getIntakeReconciliation(),
        casesApi.list({ issue_type: 'duplicate_enrollment', limit: 1 }),
      ]);
      setStats(statsRes);
      setPrograms(progRes);
      setStatusData(statusRes);
      setActivity(actRes);
      setIntakeReview(intakeRes.items.filter((r: any) => r.outcome === 'POTENTIAL_DISCREPANCY').length);
      setDupOpen(dupRes.total);
      setLoadedAt(nowIST());
    } catch (err: any) {
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return <PageLoading label="Loading overview…" />;
  }

  if (error) {
    return <ErrorBanner message={error} onRetry={fetchDashboard} />;
  }

  const validPct = stats?.valid_percentage || 0;
  const issuesPct = stats?.issues_percentage || 0;
  const pendingPct = stats?.pending_percentage || 0;

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>Student Enrollment & Reconciliation Overview</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Data-quality checks, intake comparison and discrepancy tracking on synthetic demo data. APAAR checks are format-only.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-2xs leading-relaxed">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
              Data as of <strong>{loadedAt}</strong>
            </span>
            <span className="block text-slate-600">
              Scope: {central ? 'all demo institutions' : user?.institution_name} · Academic year 2025-26 · Demo data
            </span>
          </div>

          {!central && (
          <button
            onClick={() => navigate('/upload')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-sm shadow-blue-500/20 transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Student Data</span>
          </button>
          )}
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          to="/students"
          value={stats?.total_students || 0}
          subtitle="Registered across all programmes"
          icon={<Users className="w-5 h-5 text-blue-600" />}
          colorBorder="border-blue-100"
        />
        <StatCard
          title="Records Passing Checks"
          to="/students?status=valid"
          value={stats?.valid_records || 0}
          subtitle={`${validPct}% passing all prototype checks`}
          icon={<CheckCircle className="w-5 h-5 text-emerald-600" />}
          trend={`${validPct}% passing`}
          trendType="positive"
          colorBorder="border-emerald-100"
        />
        <StatCard
          title="Pending Review"
          to="/students?status=pending,warning"
          value={stats?.pending_verification || 0}
          subtitle="Pending or with warnings"
          icon={<Clock className="w-5 h-5 text-amber-600" />}
          trend={`${pendingPct}% Pending`}
          trendType="neutral"
          colorBorder="border-amber-100"
        />
        <StatCard
          title="Issues Found"
          to="/students?status=invalid,duplicate"
          value={stats?.issues_found || 0}
          subtitle="Possible duplicates & intake differences — review required"
          icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
          trend={`${issuesPct}% Flagged`}
          trendType="negative"
          colorBorder="border-rose-100"
        />
      </div>

      {/* Review workload */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Open Cases"
          to="/cases"
          value={stats?.open_cases ?? 0}
          subtitle="Open, under review or awaiting evidence"
          icon={<FileCheck2 className="w-5 h-5 text-blue-600" aria-hidden="true" />}
        />
        <StatCard
          title="Possible Duplicates"
          to="/duplicates"
          value={dupOpen ?? 0}
          subtitle="Same APAAR ID on more than one record — review required"
          icon={<AlertTriangle className="w-5 h-5 text-amber-600" aria-hidden="true" />}
        />
        <StatCard
          title="Intake Needing Review"
          to="/intake"
          value={intakeReview ?? 0}
          subtitle="Programmes with enrolled count above the demo reference"
          icon={<TrendingUp className="w-5 h-5 text-amber-600" aria-hidden="true" />}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Program-wise Enrollment Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Enrolment by Programme vs Demo Intake Reference
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Enrolled count compared with the synthetic intake reference for each programme
              </p>
            </div>
            <button
              onClick={() => navigate('/reports')}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold"
            >
              <span>View Report</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4 pt-2">
            {programs.length === 0 && <EmptyState title="No programmes yet" hint="Add programmes under Institution & Programmes." />}
            {programs.map((p) => {
              const pct = p.approved_intake > 0 ? (p.enrolled_count / p.approved_intake) * 100 : 0;
              const isExceeded = p.enrolled_count > p.approved_intake;

              return (
                <div key={p.programme_code} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">
                      {p.programme_name} ({p.programme_code})
                    </span>
                    <span className="text-slate-500">
                      <strong className={isExceeded ? 'text-rose-600 font-bold' : 'text-slate-900'}>
                        {p.enrolled_count}
                      </strong>{' '}
                      / {p.approved_intake} seats ({Math.round(pct)}%)
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isExceeded
                          ? 'bg-rose-500'
                          : pct >= 90
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Submission Status Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Status Breakdown</h2>
            <p className="text-xs text-slate-500 mt-0.5">Check status distribution (format and data checks, not identity verification)</p>

            {/* Circular Donut Visual */}
            <div className="my-6 flex items-center justify-center">
              <div className="relative w-40 h-40 rounded-full border-8 border-slate-100 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-3xl font-extrabold text-slate-900">{validPct}%</span>
                  <p className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">
                    Passing checks
                  </p>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-700 font-medium">Passing checks</span>
                </div>
                <span className="font-bold text-slate-900">{statusData?.valid || 0}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-slate-700 font-medium">Issues Flagged</span>
                </div>
                <span className="font-bold text-slate-900">{statusData?.issues || 0}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-slate-700 font-medium">Pending Review</span>
                </div>
                <span className="font-bold text-slate-900">{statusData?.pending || 0}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200">
            <button
              onClick={() => navigate('/cases')}
              className="w-full py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Open Cases</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Activity Audit Trail */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Recent Activity</h2>
          </div>
          {user?.role !== 'institution_user' && (
            <button
              onClick={() => navigate('/audit')}
              className="text-xs text-blue-700 hover:text-blue-800 font-semibold cursor-pointer"
            >
              View full audit trail →
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {activity.length === 0 && <EmptyState title="No activity yet" />}
          {activity.map((item) => (
            <div key={item.id} className="py-3 flex items-start justify-between gap-4 text-xs">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 mt-0.5">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-slate-800 font-medium">{item.description}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">By {item.actor_email}</p>
                </div>
              </div>
              <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                {formatIST(item.created_at)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
