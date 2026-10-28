import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { Pagination } from '../components/ui/Pagination';
import { EmptyState, ErrorBanner, SkeletonRows } from '../components/ui/States';
import { casesApi, usersApi, studentsApi } from '../api/client';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { maskApaar } from '../lib/privacy';
import { personaOf } from '../lib/navigation';
import { formatIST } from '../lib/format';
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
  const persona = personaOf(user);
  const isCollege = persona === 'inst_admin' || persona === 'operator';
  const isOversight = persona === 'oversight' || persona === 'central_admin';
  const { notify } = useToast();
  const [params, setParams] = useSearchParams();
  const PAGE_SIZE = 20;
  const [cases, setCases] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [issueTypeFilter, setIssueTypeFilter] = useState(params.get('type') || 'all');
  const [statusFilter, setStatusFilter] = useState(params.get('status') || 'all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // Review Modal State
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [caseModalOpen, setCaseModalOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [asEvidence, setAsEvidence] = useState(false);
  const [reference, setReference] = useState<any>(null);
  const [actionReason, setActionReason] = useState('');
  const [reviewers, setReviewers] = useState<any[]>([]);
  const [selectedReviewer, setSelectedReviewer] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const navigate = useNavigate();

  const fetchCases = useCallback(async () => {
    try {
      setLoading(true);
      setListError(null);
      const res = await casesApi.list({
        issue_type: issueTypeFilter === 'all' ? undefined : issueTypeFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search.trim() || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      setCases(res.items);
      setTotalCount(res.total);
    } catch (err: any) {
      setListError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [issueTypeFilter, statusFilter, search, page]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Keep filters in the URL so views can be shared and linked from other screens
  useEffect(() => {
    const p = new URLSearchParams(params);
    if (issueTypeFilter === 'all') p.delete('type');
    else p.set('type', issueTypeFilter);
    if (statusFilter === 'all') p.delete('status');
    else p.set('status', statusFilter);
    setParams(p, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueTypeFilter, statusFilter]);

  useEffect(() => {
    async function loadReviewers() {
      try {
        const uList = await usersApi.list();
        setReviewers(uList.filter((u: any) => u.institution_id && (u.role === 'institution_user' || u.role === 'admin')));
      } catch {}
    }
    loadReviewers();
  }, []);

  const openCaseDetails = async (c: any) => {
    try {
      const fullCase = await casesApi.get(c.id);
      setSelectedCase(fullCase);
      setReference(null);
      if (fullCase.issue_type === 'reference_mismatch' && fullCase.student_id) {
        studentsApi.referenceComparison(fullCase.student_id).then(setReference).catch(() => setReference(null));
      }
      setSelectedReviewer(fullCase.assigned_to || '');
      setCaseModalOpen(true);
      setActionReason('');
      setNewComment('');
    } catch (err: any) {
      notify(err.message || 'Could not open this case', 'error');
    }
  };

  // Open a case directly when linked with ?case=<id> (e.g. from Duplicate Review)
  useEffect(() => {
    const caseId = params.get('case');
    if (caseId) openCaseDetails({ id: caseId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddComment = async () => {
    if (!selectedCase || !newComment.trim()) return;
    setActionLoading(true);
    try {
      await casesApi.addComment(selectedCase.id, newComment, asEvidence);
      const refreshed = await casesApi.get(selectedCase.id);
      setSelectedCase(refreshed);
      setNewComment('');
      if (asEvidence) notify('Evidence recorded on the case.', 'success');
      setAsEvidence(false);
      fetchCases();
    } catch (err: any) {
      notify(err.message || 'Failed to add comment', 'error');
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
      notify(err.message || 'Failed to assign case', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const runAction = async (fn: () => Promise<any>, success: string) => {
    if (!selectedCase) return;
    if (actionReason.trim().length < 5) {
      notify('Enter a reason of at least 5 characters first.', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await fn();
      const refreshed = await casesApi.get(selectedCase.id);
      setSelectedCase(refreshed);
      setActionReason('');
      fetchCases();
      notify(success, 'success');
    } catch (err: any) {
      notify(err.message || 'Action failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAwaitEvidence = () =>
    runAction(() => casesApi.requestClarification(selectedCase.id, actionReason), 'Case marked as awaiting evidence.');
  const handleEscalate = () =>
    runAction(() => casesApi.escalate(selectedCase.id, actionReason), 'Case escalated. The institution admin will decide it.');
  const handleRequestReview = () =>
    runAction(() => casesApi.requestReview(selectedCase.id, actionReason), 'Re-review requested. The college will re-examine the decision.');

  const handleResolve = async () => {
    if (!selectedCase || !actionReason.trim()) {
      notify('Enter a reason before resolving the case.', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await casesApi.resolve(selectedCase.id, actionReason);
      setCaseModalOpen(false);
      notify('Case resolved. The decision and reason were recorded in the case history.', 'success');
      fetchCases();
    } catch (err: any) {
      notify(err.message || 'Failed to resolve case', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedCase || !actionReason.trim()) {
      notify('Enter a reason before dismissing the case.', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await casesApi.reject(selectedCase.id, actionReason);
      setCaseModalOpen(false);
      notify('Case dismissed. The reason was recorded in the case history.', 'success');
      fetchCases();
    } catch (err: any) {
      notify(err.message || 'Failed to dismiss case', 'error');
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
          <span>Cases</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          College staff investigate and decide flagged records; oversight reviewers monitor, escalate and request re-review. Every action is recorded in the case history. A flag is a reason to review, not a finding.
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
            { id: 'intake_mismatch', label: 'Intake Discrepancy' },
            { id: 'reference_mismatch', label: 'Reference Mismatch' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setIssueTypeFilter(tab.id);
                setPage(1);
              }}
              aria-pressed={issueTypeFilter === tab.id}
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
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs cursor-pointer"
          >
            <option value="all">Status: All</option>
            <option value="open">Open</option>
            <option value="under_review">Under Review</option>
            <option value="pending">Awaiting evidence</option>
            <option value="escalated">Escalated</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Dismissed</option>
          </select>

          <div className="relative flex-1 md:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" aria-hidden="true" />
            <input
              type="search"
              aria-label="Search cases"
              placeholder="Search case, student..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-xs"
            />
          </div>
        </div>
      </div>

      {listError && <ErrorBanner message={listError} onRetry={fetchCases} />}

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
                <th className="py-3 px-4 font-semibold">Assigned to</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <SkeletonRows cols={8} />
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState title="No cases match these filters" hint="Change the type or status filter." />
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
                        Review<span className="sr-only"> case for {c.student_name}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={totalCount} onPageChange={setPage} />
      </div>

      {/* Adjudication & Case Review Modal */}
      <Modal isOpen={caseModalOpen} onClose={() => setCaseModalOpen(false)} title="Case Review" maxWidth="2xl">
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

            {(() => {
              const status = selectedCase.status;
              const closed = status === 'resolved' || status === 'rejected';
              const canAssign = persona === 'inst_admin' && !closed;
              const canDecide = isCollege && !closed && (status !== 'escalated' || persona === 'inst_admin');
              const canAwait = (isCollege || isOversight) && !closed && status !== 'pending';
              const canEscalate = (isOversight || persona === 'inst_admin') && !closed && status !== 'escalated';
              const canReReview = isOversight && closed;
              const anyAction = canDecide || canAwait || canEscalate || canReReview;
              return (
                <>
                  {canAssign && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-3">
                      <label htmlFor="case-assignee" className="flex items-center gap-2 text-slate-700 font-medium">
                        <UserCheck className="w-4 h-4 text-blue-600" aria-hidden="true" />
                        Assigned to
                      </label>
                      <div className="flex items-center gap-2 flex-1 max-w-xs">
                        <select
                          id="case-assignee"
                          value={selectedReviewer}
                          onChange={(e) => setSelectedReviewer(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800"
                        >
                          <option value="">— Select staff member —</option>
                          {reviewers.map((rev) => (
                            <option key={rev.id} value={rev.id}>
                              {rev.name} ({rev.role === 'admin' ? 'Institution Admin' : 'College Staff'})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleAssign}
                          disabled={actionLoading || !selectedReviewer}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-xs disabled:opacity-50"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Event Timeline */}
                  <div>
                    <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                      <span>Case history</span>
                    </h4>
                    <div className="max-h-52 overflow-y-auto space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      {selectedCase.events && selectedCase.events.length > 0 ? (
                        selectedCase.events.map((ev: any) => (
                          <div key={ev.id} className="p-2 rounded bg-white border border-slate-200 text-[11px] shadow-xs">
                            <div className="flex items-center justify-between text-slate-500">
                              <span className="font-semibold text-blue-700">
                                {ev.actor_name || 'System'}
                                {ev.actor_role ? ` · ${ev.actor_role === 'reviewer' ? 'Oversight Reviewer' : ev.actor_role === 'admin' ? 'Institution Admin' : 'College Staff'}` : ''}
                              </span>
                              <span>{formatIST(ev.created_at)}</span>
                            </div>
                            <p className="text-slate-700 mt-1">{ev.description}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-400 text-center py-2">No history yet.</p>
                      )}
                    </div>
                  </div>

                  {/* Comments are open to every role */}
                  <div className="flex items-center gap-2">
                    <label htmlFor="case-comment" className="sr-only">Add a comment</label>
                    <input
                      id="case-comment"
                      type="text"
                      placeholder={isOversight ? 'Add an observation or recommendation…' : 'Add a note or evidence summary…'}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400"
                    />
                    <button
                      type="button"
                      onClick={handleAddComment}
                      disabled={actionLoading || !newComment.trim()}
                      aria-label="Post comment"
                      className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-40"
                    >
                      <Send className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>

                  {!closed && (
                    <label className="inline-flex items-center gap-2 text-xs text-slate-700 -mt-1">
                      <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={asEvidence} onChange={(e) => setAsEvidence(e.target.checked)} />
                      Add as evidence (a case awaiting evidence returns to review)
                    </label>
                  )}

                  {selectedCase.issue_type === 'reference_mismatch' && reference?.available && (
                    <div className="p-3 rounded-lg border border-slate-200 bg-white">
                      <p className="font-semibold text-slate-900 mb-1">Institution record vs {reference.source}</p>
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="text-slate-600 border-b border-slate-200">
                            <th scope="col" className="py-1 pr-2">Field</th>
                            <th scope="col" className="py-1 pr-2">Institution</th>
                            <th scope="col" className="py-1 pr-2">Reference</th>
                            <th scope="col" className="py-1">Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reference.fields.map((f: any) => (
                            <tr key={f.field} className="border-b border-slate-100">
                              <th scope="row" className="py-1 pr-2 font-medium">{f.field}</th>
                              <td className="py-1 pr-2">{f.institution_value || '—'}</td>
                              <td className="py-1 pr-2">{f.reference_value || '—'}</td>
                              <td className={`py-1 font-semibold ${f.match === false ? 'text-amber-900' : 'text-emerald-800'}`}>
                                {f.match === null ? 'n/a' : f.match ? '✓ Matches' : '✗ Differs'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {selectedCase.matched_records?.length > 0 && (
                    <div className="p-3 rounded-lg border border-slate-200 bg-white">
                      <p className="font-semibold text-slate-900 mb-1">Records that may be the same student</p>
                      <ul className="space-y-1">
                        {selectedCase.matched_records.map((m: any, i: number) => (
                          <li key={i} className="text-[11px] text-slate-700">
                            <strong>{m.name}</strong>
                            {m.roll_no ? ` · roll ${m.roll_no}` : ''} · {m.institution_name} · APAAR {m.apaar_masked}
                            <span className="ml-1 text-amber-900 font-semibold">({m.match_reasons.join(', ')})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {status === 'escalated' && persona === 'operator' && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2">
                      <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>This case has been escalated. The institution admin records the decision; you can still add notes and evidence.</span>
                    </div>
                  )}

                  {isOversight && !anyAction && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs">
                      This case is already escalated. Decisions are recorded by the college; you can follow its history here.
                    </div>
                  )}

                  {anyAction && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <label htmlFor="case-reason" className="block font-semibold text-slate-800">
                        {isOversight ? 'Reason for escalation or re-review' : 'Reason for your decision'} <span className="text-rose-600">*</span>
                      </label>
                      <textarea
                        id="case-reason"
                        value={actionReason}
                        onChange={(e) => setActionReason(e.target.value)}
                        rows={2}
                        placeholder={isOversight ? 'Explain what needs another look…' : 'State the evidence you checked and the outcome…'}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 placeholder-slate-400"
                      />
                      {isOversight && (
                        <p className="text-[11px] text-slate-600">
                          Oversight reviewers monitor and escalate. They don&apos;t change student records or decide cases.
                        </p>
                      )}
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                        {canAwait && (
                          <button type="button" onClick={handleAwaitEvidence} disabled={actionLoading}
                            className="px-3 py-1.5 bg-white border border-slate-300 text-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-100 disabled:opacity-50">
                            Mark awaiting evidence
                          </button>
                        )}
                        {canEscalate && (
                          <button type="button" onClick={handleEscalate} disabled={actionLoading}
                            className="px-3 py-1.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-lg text-xs font-semibold hover:bg-amber-100 disabled:opacity-50">
                            Escalate
                          </button>
                        )}
                        {canReReview && (
                          <button type="button" onClick={handleRequestReview} disabled={actionLoading}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50">
                            Request re-review
                          </button>
                        )}
                        {canDecide && (
                          <>
                            {selectedCase.issue_type !== 'invalid_data' && (
                            <button type="button" onClick={handleReject} disabled={actionLoading}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold disabled:opacity-50">
                              <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                              Dismiss — not an issue
                            </button>
                            )}
                            <button type="button" onClick={handleResolve} disabled={actionLoading}
                              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs disabled:opacity-50">
                              <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
                              Resolve
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </Modal>
    </div>
  );
};
