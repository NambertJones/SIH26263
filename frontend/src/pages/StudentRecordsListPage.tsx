import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { studentsApi } from '../api/client';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ApaarStatusBadge } from '../components/ui/MaskedApaar';
import { Pagination } from '../components/ui/Pagination';
import { EmptyState, ErrorBanner, SkeletonRows } from '../components/ui/States';
import { useAuth } from '../contexts/AuthContext';
import { Users, Search, FileSpreadsheet, UserPlus } from 'lucide-react';
import { AddStudentModal } from '../components/AddStudentModal';

const PAGE_SIZE = 25;

const TABS = [
  { id: 'all', label: 'All records' },
  { id: 'valid', label: 'Passing checks' },
  { id: 'pending,warning', label: 'Pending / warnings' },
  { id: 'invalid,duplicate', label: 'Issues' },
  { id: 'duplicate', label: 'Possible duplicates' },
  { id: 'invalid', label: 'Invalid data' },
];

export const StudentRecordsListPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || 'all';
  const page = Number(params.get('page') || '1');
  const q = params.get('q') || '';

  const [searchInput, setSearchInput] = useState(q);
  const [data, setData] = useState<{ total: number; items: any[] }>({ total: 0, items: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const update = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    setParams(p, { replace: true });
  };

  // Debounced search: wait until typing pauses before querying
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== q) update({ q: searchInput.trim() || null, page: null });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await studentsApi.list({
        validation_status: status === 'all' ? undefined : status,
        search: q || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [status, q, page]);

  useEffect(() => {
    load();
  }, [load]);

  const knownTab = TABS.some((t) => t.id === status);

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" aria-hidden="true" />
            <span>Student Records</span>
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Student records with data-check status. APAAR IDs are masked; status shows the format check only, not identity
            verification.
          </p>
        </div>

        {user?.role !== 'reviewer' && user?.institution_id && (
          <div className="flex items-center gap-2">
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold rounded-lg text-xs shadow-sm transition"
          >
            <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Add Student</span>
          </button>
          <button
            onClick={() => navigate('/upload')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-sm transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Upload New Batch</span>
          </button>
          </div>
        )}
        {user?.institution_id && (
          <AddStudentModal
            isOpen={addOpen}
            institutionId={user.institution_id}
            onClose={() => setAddOpen(false)}
            onCreated={(id) => {
              setAddOpen(false);
              navigate(`/students/${id}`);
            }}
          />
        )}
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 text-xs" role="group" aria-label="Filter by status">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={status === tab.id}
              onClick={() => update({ status: tab.id === 'all' ? null : tab.id, page: null })}
              className={`px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
                status === tab.id ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
          {!knownTab && (
            <span className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold whitespace-nowrap">Filter: {status}</span>
          )}
        </div>

        <div className="relative w-full lg:w-72">
          <label htmlFor="student-search" className="sr-only">
            Search students
          </label>
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" aria-hidden="true" />
          <input
            id="student-search"
            type="search"
            placeholder="Name, roll no or last 4 APAAR digits"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-500 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <caption className="sr-only">Student records</caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                <th scope="col" className="py-3 px-4 font-bold">Roll No</th>
                <th scope="col" className="py-3 px-4 font-bold">Student Name</th>
                <th scope="col" className="py-3 px-4 font-bold">APAAR ID</th>
                <th scope="col" className="py-3 px-4 font-bold">Programme</th>
                <th scope="col" className="py-3 px-4 font-bold">Enrolment</th>
                <th scope="col" className="py-3 px-4 font-bold">Check status</th>
                <th scope="col" className="py-3 px-4 font-bold text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <SkeletonRows cols={7} rows={8} />
              ) : data.items.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      title="No records match this filter"
                      hint={q ? 'Try a different search term or clear the search.' : 'Choose another status filter.'}
                    />
                  </td>
                </tr>
              ) : (
                data.items.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono text-slate-600">{st.institute_roll_no || '—'}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{st.name}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-blue-800 font-semibold">{st.apaar_masked}</span>
                        <ApaarStatusBadge status={st.apaar_status} />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{st.programme_name || '—'}</td>
                    <td className="py-3 px-4 text-slate-700 capitalize">{st.enrollment_status || '—'}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={st.validation_status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/students/${st.id}`}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 rounded font-semibold text-xs transition whitespace-nowrap"
                      >
                        View record<span className="sr-only"> for {st.name}</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={(p) => update({ page: String(p) })} />
      </div>
    </div>
  );
};
