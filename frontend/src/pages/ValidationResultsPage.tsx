import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { submissionsApi, studentsApi } from '../api/client';
import { StatusBadge } from '../components/ui/StatusBadge';
import { StatCard } from '../components/ui/StatCard';
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Search,
  ArrowLeft,
  FileSpreadsheet,
  Send,
} from 'lucide-react';

export const ValidationResultsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const submissionId = searchParams.get('submission_id');
  const navigate = useNavigate();

  const [submission, setSubmission] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadResults() {
      try {
        setLoading(true);
        let activeSubId = submissionId;

        if (!activeSubId) {
          const subs = await submissionsApi.list();
          if (subs.length > 0) {
            activeSubId = subs[0].id;
          }
        }

        if (activeSubId) {
          const sub = await submissionsApi.get(activeSubId);
          setSubmission(sub);

          const studentData = await studentsApi.list({
            submission_id: activeSubId,
            validation_status: filterStatus === 'all' ? undefined : filterStatus,
            search: search.trim() || undefined,
            limit: 100,
          });
          setStudents(studentData.items);
        }
      } catch (err) {
        console.error('Error fetching validation results:', err);
      } finally {
        setLoading(false);
      }
    }
    loadResults();
  }, [submissionId, filterStatus, search]);

  const handleFinalSubmit = async () => {
    if (!submission?.id) return;
    setSubmitting(true);
    try {
      await submissionsApi.submit(submission.id);
      setSuccessMsg('Batch submitted successfully to AICTE! Verification cases have been dispatched to reviewers.');
      setSubmission((prev: any) => ({ ...prev, status: 'submitted' }));
    } catch (err: any) {
      alert(err.message || 'Failed to submit batch');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Stepper */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between max-w-3xl mx-auto text-xs">
          <div className="flex items-center gap-2 text-emerald-700 font-semibold">
            <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center justify-center text-xs font-bold">
              ✓
            </span>
            <span>Upload File</span>
          </div>
          <div className="h-0.5 w-12 bg-emerald-200" />
          <div className="flex items-center gap-2 text-emerald-700 font-semibold">
            <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center justify-center text-xs font-bold">
              ✓
            </span>
            <span>Map Columns</span>
          </div>
          <div className="h-0.5 w-12 bg-emerald-200" />
          <div className="flex items-center gap-2 text-blue-700 font-bold">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
              3
            </span>
            <span>Validate & Reconcile</span>
          </div>
          <div className="h-0.5 w-12 bg-slate-200" />
          <div className="flex items-center gap-2 text-slate-400 font-medium">
            <span className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center text-xs">
              4
            </span>
            <span>Submit</span>
          </div>
        </div>
      </div>

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Automated Validation & Reconciliation Results</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            File: <strong className="text-blue-700">{submission?.file_name}</strong> · Batch Status:{' '}
            <span className="capitalize font-semibold text-slate-800">{submission?.status}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/mapping?submission_id=${submission?.id}`)}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Re-map Columns</span>
          </button>

          <button
            onClick={handleFinalSubmit}
            disabled={submitting || submission?.status === 'submitted'}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold shadow-xs transition cursor-pointer ${
              submission?.status === 'submitted'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 cursor-default'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>{submission?.status === 'submitted' ? 'Submitted to AICTE ✓' : submitting ? 'Submitting...' : 'Confirm & Finalize Batch'}</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 shadow-xs font-medium">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Evaluated"
          value={submission?.total_records || 0}
          subtitle="Processed student rows"
          icon={<FileSpreadsheet className="w-5 h-5 text-blue-600" />}
          colorBorder="border-blue-100"
        />
        <StatCard
          title="Valid Records"
          value={submission?.valid_records || 0}
          subtitle="Passed all deterministic rules"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          colorBorder="border-emerald-100"
        />
        <StatCard
          title="Critical Errors"
          value={submission?.error_records || 0}
          subtitle="Format & duplicate discrepancies"
          icon={<AlertOctagon className="w-5 h-5 text-rose-600" />}
          colorBorder="border-rose-100"
        />
        <StatCard
          title="Warnings"
          value={submission?.warning_records || 0}
          subtitle="Requires secondary confirmation"
          icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
          colorBorder="border-amber-100"
        />
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
          {[
            { id: 'all', label: 'All Records' },
            { id: 'valid', label: 'Valid Only' },
            { id: 'invalid', label: 'Errors Only' },
            { id: 'duplicate', label: 'Duplicates' },
            { id: 'warning', label: 'Warnings' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap cursor-pointer ${
                filterStatus === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search student or APAAR ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium"
          />
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="py-3 px-4 font-bold">Row #</th>
                <th className="py-3 px-4 font-bold">Student Name</th>
                <th className="py-3 px-4 font-bold">APAAR ID</th>
                <th className="py-3 px-4 font-bold">Programme</th>
                <th className="py-3 px-4 font-bold">Validation Status</th>
                <th className="py-3 px-4 font-bold">Remarks & Audit Flag</th>
                <th className="py-3 px-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-medium">
                    Loading records...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-medium">
                    No records found matching current filter.
                  </td>
                </tr>
              ) : (
                students.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono text-slate-400 font-medium">{st.row_number || '-'}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{st.name}</td>
                    <td className="py-3 px-4 font-mono text-blue-700 font-semibold">
                      {st.apaar_id || <span className="text-rose-600 italic font-sans font-medium">Missing APAAR</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{st.programme_name || 'CSE'}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={st.validation_status} />
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-[11px] text-slate-500 font-medium" title={st.remarks}>
                      {st.remarks || '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => navigate(`/students/${st.id}`)}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded font-semibold text-xs transition cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
