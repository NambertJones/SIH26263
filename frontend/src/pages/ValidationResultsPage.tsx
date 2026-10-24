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
  ArrowRight,
  ArrowLeft,
  FileSpreadsheet,
  Send,
  Users,
} from 'lucide-react';

export const ValidationResultsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const submissionId = searchParams.get('submission_id');
  const navigate = useNavigate();

  const [submission, setSubmission] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
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
          setTotalCount(studentData.total);
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
      <div className="glass-panel p-4 rounded-xl border border-[#1d3558]">
        <div className="flex items-center justify-between max-w-3xl mx-auto text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500 flex items-center justify-center text-xs">
              ✓
            </span>
            <span>Upload File</span>
          </div>
          <div className="h-0.5 w-12 bg-emerald-500" />
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500 flex items-center justify-center text-xs">
              ✓
            </span>
            <span>Map Columns</span>
          </div>
          <div className="h-0.5 w-12 bg-amber-500" />
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs">
              3
            </span>
            <span>Validate & Reconcile</span>
          </div>
          <div className="h-0.5 w-12 bg-slate-700" />
          <div className="flex items-center gap-2 text-slate-500">
            <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs">
              4
            </span>
            <span>Submit</span>
          </div>
        </div>
      </div>

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Automated Validation & Reconciliation Results</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            File: <strong className="text-amber-300">{submission?.file_name}</strong> · Batch Status:{' '}
            <span className="capitalize font-semibold text-white">{submission?.status}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/mapping?submission_id=${submission?.id}`)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Re-map Columns</span>
          </button>

          <button
            onClick={handleFinalSubmit}
            disabled={submitting || submission?.status === 'submitted'}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold shadow-lg transition ${
              submission?.status === 'submitted'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 cursor-default'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>{submission?.status === 'submitted' ? 'Submitted to AICTE ✓' : submitting ? 'Submitting...' : 'Confirm & Finalize Batch'}</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs rounded-xl flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Evaluated"
          value={submission?.total_records || 0}
          subtitle="Processed student rows"
          icon={<FileSpreadsheet className="w-5 h-5 text-sky-400" />}
          colorBorder="border-sky-900/40"
        />
        <StatCard
          title="Valid Records"
          value={submission?.valid_records || 0}
          subtitle="Passed all deterministic rules"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          colorBorder="border-emerald-900/40"
        />
        <StatCard
          title="Critical Errors"
          value={submission?.error_records || 0}
          subtitle="Format & duplicate discrepancies"
          icon={<AlertOctagon className="w-5 h-5 text-rose-400" />}
          colorBorder="border-rose-900/40"
        />
        <StatCard
          title="Warnings"
          value={submission?.warning_records || 0}
          subtitle="Requires secondary confirmation"
          icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
          colorBorder="border-amber-900/40"
        />
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="glass-panel p-4 rounded-xl border border-[#1b3459] flex flex-col md:flex-row md:items-center justify-between gap-4">
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
              className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                filterStatus === tab.id
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-[#081220] text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search student or APAAR ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#081220] border border-[#1b3459] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Results Table */}
      <div className="glass-panel rounded-xl border border-[#1b3459] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1b3459] bg-[#0c172a] text-slate-400">
                <th className="py-3 px-4 font-semibold">Row #</th>
                <th className="py-3 px-4 font-semibold">Student Name</th>
                <th className="py-3 px-4 font-semibold">APAAR ID</th>
                <th className="py-3 px-4 font-semibold">Programme</th>
                <th className="py-3 px-4 font-semibold">Validation Status</th>
                <th className="py-3 px-4 font-semibold">Remarks & Audit Flag</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#152a48] text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading records...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No records found matching current filter.
                  </td>
                </tr>
              ) : (
                students.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-mono text-slate-500">{st.row_number || '-'}</td>
                    <td className="py-3 px-4 font-semibold text-white">{st.name}</td>
                    <td className="py-3 px-4 font-mono text-amber-300">
                      {st.apaar_id || <span className="text-rose-400 italic font-sans">Missing APAAR</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{st.programme_name || 'CSE'}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={st.validation_status} />
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-[11px] text-slate-400" title={st.remarks}>
                      {st.remarks || '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => navigate(`/students/${st.id}`)}
                        className="px-2.5 py-1 bg-[#12233f] hover:bg-[#1a335a] border border-amber-500/40 text-amber-300 rounded font-semibold text-xs transition"
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
