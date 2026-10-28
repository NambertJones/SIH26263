import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, AlertTriangle, CheckCircle2, Clock, Flag, RotateCcw, ArrowRight } from 'lucide-react';
import { oversightApi } from '../api/client';
import { StatCard } from '../components/ui/StatCard';
import { EmptyState, ErrorBanner, PageLoading } from '../components/ui/States';
import { formatIST, nowIST } from '../lib/format';
import { useAuth } from '../contexts/AuthContext';
import { personaOf } from '../lib/navigation';

const ISSUE_LABEL: Record<string, string> = {
  duplicate_enrollment: 'Possible duplicate',
  invalid_data: 'Invalid data',
  intake_mismatch: 'Intake discrepancy',
  missing_documents: 'Missing documents',
};

/** Monitoring view: decisions taken by colleges, escalations and recurring data-quality problems. Read-only. */
export const OversightDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const isReviewer = personaOf(user) === 'oversight' || personaOf(user) === 'central_admin';
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedAt, setLoadedAt] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await oversightApi.summary());
      setLoadedAt(nowIST());
    } catch (err: any) {
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <PageLoading label="Loading review monitoring…" />;
  if (error) return <ErrorBanner message={error} onRetry={load} />;

  const sc = data.status_counts;
  const open = sc.open + sc.under_review + sc.pending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Eye className="w-6 h-6 text-blue-600" aria-hidden="true" />
            Review Monitoring
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-3xl">
            How flagged records are being handled{isReviewer ? ' across institutions' : ''}: open work, decisions taken and their reasons,
            escalations and recurring data problems. This view is read-only; reviewers escalate or request a re-review from the case.
          </p>
        </div>
        <p className="text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-2">Data as of <strong>{loadedAt}</strong></p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Open cases" value={open} to="/cases" subtitle="Open, under review or awaiting evidence" icon={<Clock className="w-5 h-5 text-blue-600" aria-hidden="true" />} />
        <StatCard title="Escalated" value={sc.escalated} to="/cases?status=escalated" subtitle="Waiting for the institution admin" icon={<Flag className="w-5 h-5 text-amber-600" aria-hidden="true" />} />
        <StatCard title="Decided this week" value={data.decided_last_7_days} subtitle="Resolved or dismissed in the last 7 days" icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" aria-hidden="true" />} />
        <StatCard title="Awaiting evidence" value={sc.pending} to="/cases?status=pending" subtitle="College asked for documents" icon={<AlertTriangle className="w-5 h-5 text-amber-600" aria-hidden="true" />} />
      </div>

      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden" aria-labelledby="recent-decisions">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 id="recent-decisions" className="text-sm font-bold text-slate-900">Recent decisions</h2>
            <p className="text-xs text-slate-600">Check that each decision has a clear, evidence-based reason. Short reasons are highlighted.</p>
          </div>
          <Link to="/cases?status=resolved" className="text-xs font-semibold text-blue-700 hover:underline">All closed cases</Link>
        </div>
        {data.recent_decisions.length === 0 ? (
          <EmptyState title="No decisions yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <th scope="col" className="py-2.5 px-4 font-semibold">Case</th>
                  {isReviewer && <th scope="col" className="py-2.5 px-4 font-semibold">Institution</th>}
                  <th scope="col" className="py-2.5 px-4 font-semibold">Decision</th>
                  <th scope="col" className="py-2.5 px-4 font-semibold">Reason given</th>
                  <th scope="col" className="py-2.5 px-4 font-semibold">Decided by</th>
                  <th scope="col" className="py-2.5 px-4"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recent_decisions.map((d: any) => (
                  <tr key={d.case_id} className="align-top">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{ISSUE_LABEL[d.issue_type] || d.issue_type}</p>
                      <p className="text-slate-500">{d.title}</p>
                    </td>
                    {isReviewer && <td className="py-3 px-4">{d.institution_name}</td>}
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full border font-semibold ${d.decision === 'Resolved' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-100 border-slate-300 text-slate-700'}`}>
                        {d.decision}
                      </span>
                      {d.rereview_count > 0 && (
                        <p className="mt-1 text-[11px] text-blue-800 flex items-center gap-1">
                          <RotateCcw className="w-3 h-3" aria-hidden="true" /> Re-reviewed {d.rereview_count}×
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-sm">
                      <p className="text-slate-800">{d.reason || '—'}</p>
                      {d.short_reason && (
                        <p className="mt-1 text-[11px] text-amber-900 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" aria-hidden="true" /> Reason may be too brief to show the evidence checked
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-900">{d.decided_by}</p>
                      <p className="text-slate-500">{formatIST(d.decided_at)}</p>
                    </td>
                    <td className="py-3 px-4">
                      <Link to={`/cases?case=${d.case_id}`} className="inline-flex items-center gap-1 text-blue-700 font-semibold hover:underline whitespace-nowrap">
                        Review <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden" aria-labelledby="recurring">
          <div className="p-4 border-b border-slate-200">
            <h2 id="recurring" className="text-sm font-bold text-slate-900">Recurring data problems</h2>
            <p className="text-xs text-slate-600">Open validation issues grouped by type. A high count usually points to a problem in how a file was prepared.</p>
          </div>
          {data.recurring_issues.length === 0 ? (
            <EmptyState title="No open validation issues" />
          ) : (
            <ul className="divide-y divide-slate-100 text-xs">
              {data.recurring_issues.map((r: any, i: number) => (
                <li key={i} className="px-4 py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{r.label}</p>
                    {isReviewer && <p className="text-slate-500">{r.institution_name}</p>}
                  </div>
                  <span className="font-mono font-bold text-slate-900">{r.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden" aria-labelledby="escalations">
          <div className="p-4 border-b border-slate-200">
            <h2 id="escalations" className="text-sm font-bold text-slate-900">Escalated cases</h2>
            <p className="text-xs text-slate-600">Disputed or sensitive cases referred to the institution admin.</p>
          </div>
          {data.escalated.length === 0 ? (
            <EmptyState title="Nothing escalated" />
          ) : (
            <ul className="divide-y divide-slate-100 text-xs">
              {data.escalated.map((e: any) => (
                <li key={e.case_id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{e.title}</p>
                    <p className="text-slate-500">{isReviewer ? `${e.institution_name} · ` : ''}{formatIST(e.updated_at)}</p>
                  </div>
                  <Link to={`/cases?case=${e.case_id}`} className="text-blue-700 font-semibold hover:underline whitespace-nowrap">Open</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {isReviewer && (
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden" aria-labelledby="by-inst">
          <div className="p-4 border-b border-slate-200">
            <h2 id="by-inst" className="text-sm font-bold text-slate-900">Workload by institution</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <th scope="col" className="py-2.5 px-4 font-semibold">Institution</th>
                  <th scope="col" className="py-2.5 px-4 font-semibold text-right">Open</th>
                  <th scope="col" className="py-2.5 px-4 font-semibold text-right">Escalated</th>
                  <th scope="col" className="py-2.5 px-4 font-semibold text-right">Decided (7 days)</th>
                  <th scope="col" className="py-2.5 px-4 font-semibold text-right">Oldest open case</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.by_institution.map((r: any) => (
                  <tr key={r.institution_name}>
                    <td className="py-2.5 px-4 font-medium text-slate-900">{r.institution_name}</td>
                    <td className="py-2.5 px-4 text-right font-mono">{r.open}</td>
                    <td className="py-2.5 px-4 text-right font-mono">{r.escalated}</td>
                    <td className="py-2.5 px-4 text-right font-mono">{r.decided_last_7_days}</td>
                    <td className="py-2.5 px-4 text-right font-mono">{r.oldest_open_days === null ? '—' : `${r.oldest_open_days} days`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
