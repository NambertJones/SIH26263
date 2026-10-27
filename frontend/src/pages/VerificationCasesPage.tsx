import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { casesApi, usersApi } from '../api/client';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { maskApaar, isCentralUser } from '../lib/privacy';
import {
  AlertOctagon,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  MessageSquare,
  UserCheck,
  Send,
  HelpCircle,
  Clock,
} from 'lucide-react';

export const VerificationCasesPage: React.FC = () => {
  const { user } = useAuth();
  const canDecide = isCentralUser(user);
  const [cases, setCases] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [issueTypeFilter, setIssueTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Review Modal State
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [caseModalOpen, setCaseModalOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [reviewers, setReviewers] = useState<any[]>([]);
  const [selectedReviewer, setSelectedReviewer] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const navigate = useNavigate();

  const fetchCases = async () => {
    try {
      setLoading(true);
      const res = await casesApi.list({
        issue_type: issueTypeFilter === 'all' ? undefined : issueTypeFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search.trim() || undefined,
        limit: 100,
      });
      setCases(res.items);
      setTotalCount(res.total);
    } catch (err) {
      console.error('Error fetching verification cases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [issueTypeFilter, statusFilter, search]);

  useEffect(() => {
    async function loadReviewers() {
      try {
        const uList = await usersApi.list();
        setReviewers(uList);
      } catch {}
    }
    loadReviewers();
  }, []);

  const openCaseDetails = async (c: any) => {
    try {
      const fullCase = await casesApi.get(c.id);
      setSelectedCase(fullCase);
      setSelectedReviewer(fullCase.assigned_to || '');
      setCaseModalOpen(true);
      setActionReason('');
      setNewComment('');
    } catch (err) {
      console.error('Error fetching case detail:', err);
    }
  };

  const handleAddComment = async () => {
    if (!selectedCase || !newComment.trim()) return;
    setActionLoading(true);
    try {
      await casesApi.addComment(selectedCase.id, newComment);
      const refreshed = await casesApi.get(selectedCase.id);
      setSelectedCase(refreshed);
      setNewComment('');
      fetchCases();
    } catch (err: any) {
      alert(err.message || 'Failed to add comment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedCase || !selectedReviewer) return;
    setActionLoading(true);
    try {
      await casesApi.assign(selectedCase.id, selectedReviewer);
      const refreshed = await casesApi.get(selectedCase.id);
      setSelectedCase(refreshed);
      fetchCases();
    } catch (err: any) {
      alert(err.message || 'Failed to assign case');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedCase || !actionReason.trim()) {
      alert('A justification reason is mandatory to resolve a discrepancy.');
      return;
    }
    setActionLoading(true);
    try {
      await casesApi.resolve(selectedCase.id, actionReason);
      setCaseModalOpen(false);
      fetchCases();
    } catch (err: any) {
      alert(err.message || 'Failed to resolve case');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedCase || !actionReason.trim()) {
      alert('A rejection reason is mandatory.');
      return;
    }
    setActionLoading(true);
    try {
      await casesApi.reject(selectedCase.id, actionReason);
      setCaseModalOpen(false);
      fetchCases();
    } catch (err: any) {
      alert(err.message || 'Failed to reject case');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-wide flex items-center gap-2">
          <AlertOctagon className="w-5 h-5 text-blue-600" />
          <span>Verification & Discrepancy Review Queue</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Review, assign, and adjudicate student data discrepancies with full timeline audit logging.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Issue Type Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
          {[
            { id: 'all', label: 'All Cases' },
            { id: 'duplicate_enrollment', label: 'Duplicates' },
            { id: 'invalid_data', label: 'Invalid Data' },
            { id: 'intake_mismatch', label: 'Intake Exceeded' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setIssueTypeFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap cursor-pointer ${
                issueTypeFilter === tab.id
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Status Dropdown & Search */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs cursor-pointer"
          >
            <option value="all">Status: All</option>
            <option value="open">Open</option>
            <option value="under_review">Under Review</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>

          <div className="relative flex-1 md:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search case, student..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Cases Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="py-3 px-4 font-semibold">Priority</th>
                <th className="py-3 px-4 font-semibold">Case Title / Issue</th>
                <th className="py-3 px-4 font-semibold">Student Name</th>
                <th className="py-3 px-4 font-semibold">APAAR ID</th>
                <th className="py-3 px-4 font-semibold">Type</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Assigned Reviewer</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading verification queue...
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No verification cases found matching criteria.
                  </td>
                </tr>
              ) : (
                cases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          c.priority === 'critical'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : c.priority === 'high'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {c.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 max-w-xs truncate">{c.title || c.description}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{c.student_name || 'N/A'}</td>
                    <td className="py-3 px-4 font-mono text-blue-700 font-medium">{maskApaar(c.student_apaar_id) || 'N/A'}</td>
                    <td className="py-3 px-4 capitalize text-slate-600">{c.issue_type?.replace('_', ' ')}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={c.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-slate-600">{c.assigned_user_name || <span className="italic text-slate-400">Unassigned</span>}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openCaseDetails(c)}
                        className="px-3 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded font-semibold text-xs transition cursor-pointer"
                      >
                        Adjudicate
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjudication & Case Review Modal */}
      <Modal isOpen={caseModalOpen} onClose={() => setCaseModalOpen(false)} title="Case Review & Adjudication" maxWidth="2xl">
        {selectedCase && (
          <div className="space-y-6 text-xs">
            {/* Header Summary */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{selectedCase.title}</h3>
                  <StatusBadge status={selectedCase.status} size="sm" />
                </div>
                <p className="text-slate-600 mt-1">{selectedCase.description}</p>
                <div className="flex items-center gap-4 text-slate-500 mt-2 text-[11px]">
                  <span>Student: <strong className="text-slate-900">{selectedCase.student_name}</strong></span>
                  <span>·</span>
                  <span>APAAR: <strong className="font-mono text-blue-700 font-semibold">{maskApaar(selectedCase.student_apaar_id) || 'N/A'}</strong></span>
                </div>
              </div>

              {selectedCase.student_id && (
                <button
                  onClick={() => {
                    setCaseModalOpen(false);
                    navigate(`/students/${selectedCase.student_id}`);
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-blue-700 font-semibold rounded text-xs shrink-0 shadow-xs cursor-pointer"
                >
                  View Profile →
                </button>
              )}
            </div>

            {/* Assignment Section (AICTE only) */}
            {canDecide && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>Assigned Reviewer:</span>
              </div>
              <div className="flex items-center gap-2 flex-1 max-w-xs">
                <select
                  value={selectedReviewer}
                  onChange={(e) => setSelectedReviewer(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs"
                >
                  <option value="">-- Assign Reviewer --</option>
                  {reviewers.map((rev) => (
                    <option key={rev.id} value={rev.id}>
                      {rev.name} ({rev.role})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAssign}
                  disabled={actionLoading || !selectedReviewer}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-xs transition disabled:opacity-50 cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
            )}

            {/* Event Timeline */}
            <div>
              <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Case Timeline & Review Notes</span>
              </h4>

              <div className="max-h-48 overflow-y-auto space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                {selectedCase.events && selectedCase.events.length > 0 ? (
                  selectedCase.events.map((ev: any) => (
                    <div key={ev.id} className="p-2 rounded bg-white border border-slate-200 text-[11px] shadow-xs">
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="font-semibold text-blue-700">
                          {ev.actor_name || 'System'} ({ev.actor_role || 'audit'})
                        </span>
                        <span>{new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-slate-700 mt-1">{ev.description}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-center py-2">No timeline events yet.</p>
                )}
              </div>
            </div>

            {/* Add Comment Field */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Add reviewer comment or internal observation..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-xs"
              />
              <button
                type="button"
                onClick={handleAddComment}
                disabled={actionLoading || !newComment.trim()}
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-40 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {!canDecide && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  This case is decided by an AICTE verification officer. Add your explanation or evidence as a
                  comment above; your institution cannot approve or reject its own flagged records.
                </span>
              </div>
            )}

            {/* Resolution Rationale & Final Action (AICTE only) */}
            {canDecide && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <label className="block font-semibold text-slate-800">
                Adjudication Rationale / Justification <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={2}
                placeholder="State verified evidence, DigiLocker check, or reason for resolution/rejection..."
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-xs"
              />

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setCaseModalOpen(false)}
                  className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject Record</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResolve}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs shadow-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Approve & Resolve</span>
                  </button>
                </div>
              </div>
            </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
