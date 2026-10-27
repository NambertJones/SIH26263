import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CopyCheck, Check, X, Minus, ArrowRight, Search } from 'lucide-react';
import { casesApi, studentsApi } from '../api/client';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState, ErrorBanner, PageLoading } from '../components/ui/States';
import { Pagination } from '../components/ui/Pagination';
import { formatIST } from '../lib/format';

const PAGE_SIZE = 15;

type Agreement = 'agree' | 'disagree' | 'missing';

const AGREEMENT: Record<Agreement, { label: string; cls: string; icon: React.ReactNode }> = {
  agree: { label: 'Agree', cls: 'text-emerald-800 bg-emerald-50 border-emerald-200', icon: <Check className="w-3.5 h-3.5" aria-hidden="true" /> },
  disagree: { label: 'Differs', cls: 'text-amber-900 bg-amber-50 border-amber-300', icon: <X className="w-3.5 h-3.5" aria-hidden="true" /> },
  missing: { label: 'Missing', cls: 'text-slate-700 bg-slate-100 border-slate-300', icon: <Minus className="w-3.5 h-3.5" aria-hidden="true" /> },
};

function compare(a?: string | null, b?: string | null, hidden = false): Agreement {
  if (hidden || !a || !b) return 'missing';
  return a.trim().toLowerCase() === b.trim().toLowerCase() ? 'agree' : 'disagree';
}

const AgreementTag: React.FC<{ value: Agreement }> = ({ value }) => (
  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-semibold ${AGREEMENT[value].cls}`}>
    {AGREEMENT[value].icon}
    {AGREEMENT[value].label}
  </span>
);

/**
 * Queue of possible duplicates with a side-by-side comparison. Similarity is a reason to review,
 * never proof; decisions are recorded on the case, with a reason.
 */
export const DuplicateReviewPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || 'open_all';
  const page = Number(params.get('page') || '1');
  const selectedId = params.get('case');

  const [queue, setQueue] = useState<{ total: number; items: any[] }>({ total: 0, items: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(params.get('q') || '');

  const [detail, setDetail] = useState<any>(null);
  const [record, setRecord] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const update = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    setParams(p, { replace: true });
  };

  // Debounce search into the URL
  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get('q') || '') !== searchInput) update({ q: searchInput || null, page: null });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await casesApi.list({
        issue_type: 'duplicate_enrollment',
        status: status === 'open_all' ? undefined : status,
        search: params.get('q') || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      setQueue(res);
    } catch (err: any) {
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [status, page, params]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setRecord(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      try {
        const d = await casesApi.get(selectedId);
        const r = d.student_id ? await studentsApi.get(d.student_id) : null;
        if (!cancelled) {
          setDetail(d);
          setRecord(r);
        }
      } catch {
        if (!cancelled) {
          setDetail(null);
          setRecord(null);
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const match = detail?.matched_records?.[0];
  const hidden = match && match.name === 'Hidden';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <CopyCheck className="w-5 h-5 text-blue-600" aria-hidden="true" />
          Duplicate Review
        </h1>
        <p className="text-xs text-slate-600 mt-1 max-w-3xl">
          Records flagged because the same APAAR ID appears more than once. A match is a reason to review, not proof of a duplicate
          or of wrongdoing. Legitimate reasons include transfers, completed earlier programmes and data-entry errors.
        </p>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="dup-status" className="block text-xs font-semibold text-slate-700 mb-1">
            Status
          </label>
          <select
            id="dup-status"
            value={status}
            onChange={(e) => update({ status: e.target.value, page: null })}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-white"
          >
            <option value="open_all">All statuses</option>
            <option value="open">Open</option>
            <option value="under_review">Under review</option>
            <option value="pending">Awaiting evidence</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Dismissed</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="dup-search" className="block text-xs font-semibold text-slate-700 mb-1">
            Search name or last 4 digits
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" aria-hidden="true" />
            <input
              id="dup-search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs"
            />
          </div>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadQueue} />}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* Queue */}
        <section aria-label="Review queue" className="xl:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden self-start">
          {loading ? (
            <PageLoading />
          ) : queue.items.length === 0 ? (
            <EmptyState title="No possible duplicates in this view" hint="Change the status filter or upload a file with repeated APAAR IDs." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {queue.items.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => update({ case: c.id })}
                    aria-current={selectedId === c.id ? 'true' : undefined}
                    className={`w-full text-left px-4 py-3 text-xs hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 ${
                      selectedId === c.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">{c.student_name || 'Unknown student'}</span>
                      <StatusBadge status={c.status} size="sm" />
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 text-slate-600">
                      <span className="font-mono">{c.student_apaar_id}</span>
                      <span>Priority: {c.priority}</span>
                      <span>{formatIST(c.created_at)}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Pagination page={page} pageSize={PAGE_SIZE} total={queue.total} onPageChange={(p) => update({ page: String(p) })} />
        </section>

        {/* Comparison */}
        <section aria-label="Comparison" className="xl:col-span-3 bg-white rounded-xl border border-slate-200 p-5 self-start">
          {!selectedId ? (
            <EmptyState title="Select a record from the queue" hint="The two records will be shown side by side with each field compared." />
          ) : detailLoading ? (
            <PageLoading label="Loading comparison…" />
          ) : !detail ? (
            <ErrorBanner message="This case could not be loaded or is outside your access." />
          ) : (
            <div className="space-y-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-slate-900">{detail.title || 'Possible duplicate'}</h2>
                <StatusBadge status={detail.status} />
              </div>
              <p className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                <strong>Why this pair was selected:</strong> exact match on APAAR ID (rule: same 12-digit value on two current records).
                Names and dates are compared below to help the reviewer decide.
              </p>

              {!match ? (
                <EmptyState
                  title="No other current record shares this APAAR ID"
                  hint="The other record may have been corrected already. Review the case history for details."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <caption className="sr-only">Field-by-field comparison of the two records</caption>
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-700">
                        <th scope="col" className="py-2 pr-3 font-semibold">Field</th>
                        <th scope="col" className="py-2 pr-3 font-semibold">This record</th>
                        <th scope="col" className="py-2 pr-3 font-semibold">Other record</th>
                        <th scope="col" className="py-2 font-semibold">Comparison</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <th scope="row" className="py-2 pr-3 font-medium text-slate-600">APAAR ID (masked)</th>
                        <td className="py-2 pr-3 font-mono">{detail.student_apaar_id}</td>
                        <td className="py-2 pr-3 font-mono">{match.apaar_masked}</td>
                        <td className="py-2"><AgreementTag value="agree" /></td>
                      </tr>
                      <tr>
                        <th scope="row" className="py-2 pr-3 font-medium text-slate-600">Name</th>
                        <td className="py-2 pr-3">{detail.student_name}</td>
                        <td className="py-2 pr-3">{match.name}</td>
                        <td className="py-2"><AgreementTag value={hidden ? 'missing' : match.name_matches ? 'agree' : 'disagree'} /></td>
                      </tr>
                      <tr>
                        <th scope="row" className="py-2 pr-3 font-medium text-slate-600">Date of birth</th>
                        <td className="py-2 pr-3 text-slate-500">Not shown</td>
                        <td className="py-2 pr-3 text-slate-500">Not shown</td>
                        <td className="py-2">
                          <AgreementTag value={match.date_of_birth_matches === null ? 'missing' : match.date_of_birth_matches ? 'agree' : 'disagree'} />
                        </td>
                      </tr>
                      <tr>
                        <th scope="row" className="py-2 pr-3 font-medium text-slate-600">Institution</th>
                        <td className="py-2 pr-3">{detail.institution_name}</td>
                        <td className="py-2 pr-3">{match.institution_name}</td>
                        <td className="py-2">
                          <AgreementTag value={match.same_institution ? 'agree' : 'disagree'} />
                        </td>
                      </tr>
                      <tr>
                        <th scope="row" className="py-2 pr-3 font-medium text-slate-600">Programme</th>
                        <td className="py-2 pr-3">{record?.programme_name || '—'}</td>
                        <td className="py-2 pr-3">{match.programme || (hidden ? 'Hidden' : '—')}</td>
                        <td className="py-2"><AgreementTag value={compare(record?.programme_name, match.programme, hidden)} /></td>
                      </tr>
                      <tr>
                        <th scope="row" className="py-2 pr-3 font-medium text-slate-600">Enrolment status</th>
                        <td className="py-2 pr-3 capitalize">{record?.enrollment_status || '—'}</td>
                        <td className="py-2 pr-3 capitalize">{match.enrollment_status || (hidden ? 'Hidden' : '—')}</td>
                        <td className="py-2"><AgreementTag value={compare(record?.enrollment_status, match.enrollment_status, hidden)} /></td>
                      </tr>
                    </tbody>
                  </table>
                  {hidden && (
                    <p className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900">
                      The other record belongs to another institution. Its details are visible only to oversight reviewers. You can add
                      evidence (for example a withdrawal date) as a comment on the case.
                    </p>
                  )}
                  {detail.matched_records.length > 1 && (
                    <p className="mt-2 text-slate-600">{detail.matched_records.length - 1} more record(s) share this APAAR ID.</p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
                <Link
                  to={`/cases?case=${detail.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
                >
                  Open case to record a decision <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
                {record && (
                  <Link to={`/students/${record.id}`} className="font-semibold text-blue-700 hover:underline">
                    View this student record
                  </Link>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
