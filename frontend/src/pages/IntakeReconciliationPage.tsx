import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Scale, CheckCircle2, AlertTriangle, HelpCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { reportsApi } from '../api/client';
import { EmptyState, ErrorBanner, PageLoading } from '../components/ui/States';
import { formatIST, nowIST } from '../lib/format';

const OUTCOME: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  WITHIN_REFERENCE: {
    label: 'Within reference',
    cls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />,
  },
  POTENTIAL_DISCREPANCY: {
    label: 'Potential discrepancy — review required',
    cls: 'bg-amber-50 text-amber-900 border-amber-300',
    icon: <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />,
  },
  CANNOT_DETERMINE_MISSING_REFERENCE: {
    label: 'Cannot determine — reference missing',
    cls: 'bg-slate-100 text-slate-700 border-slate-300',
    icon: <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />,
  },
};

export const IntakeReconciliationPage: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportsApi.getIntakeReconciliation();
      setRows(res.items);
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

  const discrepancies = rows.filter((r) => r.outcome === 'POTENTIAL_DISCREPANCY').length;
  const showInstitution = new Set(rows.map((r) => r.institution_id)).size > 1;

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Scale className="w-5 h-5 text-blue-600" aria-hidden="true" />
            Intake Reconciliation
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-3xl">
            Enrolled students compared with each programme&apos;s <strong>demo intake reference</strong> (approved + supernumerary + NRI
            seats). A difference is a prompt for human review, not a violation: the reference here is synthetic and is not sourced
            from AICTE approval data.
          </p>
        </div>
        <div className="text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-2">
          Data as of <strong>{loadedAt || '—'}</strong>
          <br />
          {discrepancies} of {rows.length} programmes need review
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}
      {loading ? (
        <PageLoading />
      ) : rows.length === 0 && !error ? (
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState title="No programmes found" hint="Add programmes and intake references under Institution & Programmes." />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <caption className="sr-only">Intake reference compared with enrolled count per programme</caption>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                  <th scope="col" className="py-3 px-3 w-8"><span className="sr-only">Expand</span></th>
                  <th scope="col" className="py-3 px-3 font-semibold">Programme</th>
                  {showInstitution && <th scope="col" className="py-3 px-3 font-semibold">Institution</th>}
                  <th scope="col" className="py-3 px-3 font-semibold">Year</th>
                  <th scope="col" className="py-3 px-3 font-semibold text-right">Reference total</th>
                  <th scope="col" className="py-3 px-3 font-semibold text-right">Enrolled</th>
                  <th scope="col" className="py-3 px-3 font-semibold text-right">Difference</th>
                  <th scope="col" className="py-3 px-3 font-semibold">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rows.map((r) => {
                  const o = OUTCOME[r.outcome] || OUTCOME.CANNOT_DETERMINE_MISSING_REFERENCE;
                  const expanded = open === r.programme_id;
                  return (
                    <React.Fragment key={r.programme_id}>
                      <tr className={expanded ? 'bg-slate-50' : ''}>
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={() => setOpen(expanded ? null : r.programme_id)}
                            aria-expanded={expanded}
                            aria-label={`${expanded ? 'Hide' : 'Show'} calculation for ${r.programme_name}`}
                            className="p-1 rounded hover:bg-slate-200"
                          >
                            {expanded ? <ChevronDown className="w-4 h-4" aria-hidden="true" /> : <ChevronRight className="w-4 h-4" aria-hidden="true" />}
                          </button>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-blue-800">{r.programme_code}</span>{' '}
                          <span className="text-slate-800">{r.programme_name}</span>
                        </td>
                        {showInstitution && <td className="py-3 px-3">{r.institution_name}</td>}
                        <td className="py-3 px-3 font-mono">{r.academic_year}</td>
                        <td className="py-3 px-3 text-right font-mono">{r.reference_total}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold">{r.enrolled_count}</td>
                        <td className={`py-3 px-3 text-right font-mono ${r.difference > 0 ? 'text-amber-800 font-bold' : ''}`}>
                          {r.difference > 0 ? `+${r.difference}` : r.difference}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-semibold ${o.cls}`}>
                            {o.icon}
                            {o.label}
                          </span>
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="bg-slate-50">
                          <td />
                          <td colSpan={showInstitution ? 7 : 6} className="pb-4 px-3">
                            <div className="grid md:grid-cols-2 gap-4">
                              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                                <p className="font-semibold text-slate-800 mb-2">Calculation</p>
                                <table className="w-full text-xs">
                                  <tbody>
                                    <tr><td className="py-0.5">Approved intake (reference)</td><td className="text-right font-mono">{r.approved_intake}</td></tr>
                                    <tr><td className="py-0.5">+ Supernumerary seats</td><td className="text-right font-mono">{r.supernumerary_seats}</td></tr>
                                    <tr><td className="py-0.5">+ NRI seats</td><td className="text-right font-mono">{r.nri_seats}</td></tr>
                                    <tr className="border-t border-slate-200 font-semibold"><td className="py-0.5">= Reference total</td><td className="text-right font-mono">{r.reference_total}</td></tr>
                                    <tr><td className="py-0.5">Enrolled (status: {r.counted_statuses.join(', ')})</td><td className="text-right font-mono">{r.enrolled_count}</td></tr>
                                    <tr><td className="py-0.5">Not counted (other statuses)</td><td className="text-right font-mono">{r.excluded_count}</td></tr>
                                    <tr className="border-t border-slate-200 font-semibold"><td className="py-0.5">Difference (enrolled − reference)</td><td className="text-right font-mono">{r.difference}</td></tr>
                                  </tbody>
                                </table>
                                <p className="text-[11px] text-slate-500 mt-2">
                                  OCI and Foreign National seats are not yet separated in this prototype, so they are not counted separately.
                                </p>
                              </div>
                              <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5">
                                <p className="font-semibold text-slate-800">Source</p>
                                <p>{r.source}</p>
                                <p className="text-slate-600">
                                  Status: <span className="px-1.5 py-0.5 rounded bg-violet-50 border border-violet-200 text-violet-800 font-semibold">Synthetic (demo)</span>
                                </p>
                                <p className="text-slate-600">Recorded: {formatIST(r.reference_recorded_at)}</p>
                                <p className="text-slate-600">
                                  Open intake cases for this institution: <strong>{r.open_intake_cases}</strong>{' '}
                                  {r.open_intake_cases > 0 && (
                                    <Link to="/cases?type=intake_mismatch" className="text-blue-700 font-semibold hover:underline">
                                      View cases
                                    </Link>
                                  )}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
