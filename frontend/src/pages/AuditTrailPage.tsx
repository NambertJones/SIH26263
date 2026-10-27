import React, { useCallback, useEffect, useState } from 'react';
import { ScrollText, Lock } from 'lucide-react';
import { auditApi } from '../api/client';
import { Pagination } from '../components/ui/Pagination';
import { EmptyState, ErrorBanner, SkeletonRows } from '../components/ui/States';
import { formatIST } from '../lib/format';

const PAGE_SIZE = 25;

const ACTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All actions' },
  { value: 'login', label: 'Sign-in' },
  { value: 'upload', label: 'File upload' },
  { value: 'map_columns', label: 'Column mapping' },
  { value: 'validate', label: 'Validation run' },
  { value: 'correction', label: 'Record correction' },
  { value: 'apaar_revealed', label: 'Full APAAR viewed' },
  { value: 'case_assigned', label: 'Case assigned' },
  { value: 'case_resolved', label: 'Case resolved' },
  { value: 'export', label: 'Export' },
];

const actionLabel = (a: string) => ACTIONS.find((x) => x.value === a)?.label || a.replace(/_/g, ' ');

/** Read-only, chronological audit log. There are no edit or delete controls by design. */
export const AuditTrailPage: React.FC = () => {
  const [action, setAction] = useState('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; items: any[] }>({ total: 0, items: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await auditApi.list({
        action: action === 'all' ? undefined : action,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [action, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-blue-600" aria-hidden="true" />
          Audit Trail
        </h1>
        <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" aria-hidden="true" />
          Read-only record of who did what and when. Entries cannot be edited or deleted. Full identifiers and passwords are never logged.
        </p>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="audit-action" className="block text-xs font-semibold text-slate-700 mb-1">
            Action
          </label>
          <select
            id="audit-action"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-white"
          >
            {ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-slate-500 ml-auto">Times shown in IST</p>
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">Audit events, newest first</caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                <th scope="col" className="py-3 px-4 font-semibold whitespace-nowrap">Time</th>
                <th scope="col" className="py-3 px-4 font-semibold">Actor</th>
                <th scope="col" className="py-3 px-4 font-semibold">Action</th>
                <th scope="col" className="py-3 px-4 font-semibold">Target</th>
                <th scope="col" className="py-3 px-4 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <SkeletonRows cols={5} />
              ) : data.items.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState title="No audit events match this filter" hint="Try 'All actions'." />
                  </td>
                </tr>
              ) : (
                data.items.map((l) => (
                  <tr key={l.id} className="align-top">
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-600">{formatIST(l.created_at)}</td>
                    <td className="py-3 px-4">{l.actor_email || 'System'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-semibold whitespace-nowrap">
                        {actionLabel(l.action)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{l.entity_type ? `${l.entity_type}` : '—'}</td>
                    <td className="py-3 px-4 max-w-md">{l.description || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
      </div>
    </div>
  );
};
