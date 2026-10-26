import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentsApi } from '../api/client';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import {
  User,
  ShieldAlert,
  History,
  FileCheck2,
  Award,
  ArrowLeft,
  Edit3,
  AlertTriangle,
} from 'lucide-react';

export const StudentRecordDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'issues' | 'history'>('details');

  // Correction Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [corrName, setCorrName] = useState('');
  const [corrApaar, setCorrApaar] = useState('');
  const [corrDob, setCorrDob] = useState('');
  const [corrGender, setCorrGender] = useState('Male');
  const [corrCategory, setCorrCategory] = useState('General');
  const [corrReason, setCorrReason] = useState('');
  const [savingCorr, setSavingCorr] = useState(false);
  const [corrError, setCorrError] = useState<string | null>(null);

  const fetchStudentData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await studentsApi.get(id);
      setStudent(data);

      setCorrName(data.name || '');
      setCorrApaar(data.apaar_id || '');
      setCorrDob(data.date_of_birth ? data.date_of_birth.substring(0, 10) : '');
      setCorrGender(data.gender || 'Male');
      setCorrCategory(data.category || 'General');
    } catch (err) {
      console.error('Error fetching student record:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [id]);

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!corrReason || corrReason.trim().length < 5) {
      setCorrError('A detailed reason is mandatory for auditing student corrections.');
      return;
    }

    setSavingCorr(true);
    setCorrError(null);
    try {
      await studentsApi.correct(id, {
        name: corrName,
        apaar_id: corrApaar,
        date_of_birth: corrDob || null,
        gender: corrGender,
        category: corrCategory,
        reason: corrReason,
      });
      setIsModalOpen(false);
      setCorrReason('');
      await fetchStudentData();
    } catch (err: any) {
      setCorrError(err.message || 'Correction failed.');
    } finally {
      setSavingCorr(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500 font-medium">Student record not found.</p>
        <button
          onClick={() => navigate('/students')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg"
        >
          Back to Students
        </button>
      </div>
    );
  }

  const hasDuplicate = student.validation_status === 'duplicate' || student.remarks?.includes('duplicate');

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1.5 font-semibold transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Records</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-semibold rounded-lg text-xs transition cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Submit Correction</span>
          </button>

          <button
            onClick={() => navigate(`/certificate?student_id=${student.id}`)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-sm shadow-blue-500/20 transition cursor-pointer"
          >
            <Award className="w-3.5 h-3.5" />
            <span>Certificate Preview</span>
          </button>
        </div>
      </div>

      {/* Duplicate Alert Banner */}
      {hasDuplicate && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
              Potential Duplicate Enrollment Flagged
            </h3>
            <p className="text-xs text-slate-700 mt-0.5 leading-relaxed font-medium">
              {student.remarks || 'This APAAR ID matches another active student registration in the AICTE system.'}
            </p>
          </div>
        </div>
      )}

      {/* Student Profile Header Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
            <User className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{student.name}</h1>
              <StatusBadge status={student.validation_status} />
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                v{student.version}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1.5 font-medium">
              <span>
                APAAR ID: <strong className="font-mono text-blue-700">{student.apaar_id || 'Not Assigned'}</strong>
              </span>
              <span>·</span>
              <span>Roll No: <strong className="text-slate-800">{student.institute_roll_no || 'N/A'}</strong></span>
              <span>·</span>
              <span>Institution: <strong className="text-slate-800">{student.institution_name || 'AICTE College'}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs">
        <button
          onClick={() => setActiveTab('details')}
          className={`pb-3 px-3 font-semibold transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'details'
              ? 'border-b-2 border-blue-600 text-blue-700 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Profile Details</span>
        </button>

        <button
          onClick={() => setActiveTab('issues')}
          className={`pb-3 px-3 font-semibold transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'issues'
              ? 'border-b-2 border-blue-600 text-blue-700 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>Issues & Cases ({student.issues?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-3 font-semibold transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'history'
              ? 'border-b-2 border-blue-600 text-blue-700 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Audit Version History ({student.version_history?.length || 1})</span>
        </button>
      </div>

      {/* Tab 1: Profile Details */}
      {activeTab === 'details' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-xs">
          <div>
            <span className="text-slate-400 uppercase tracking-wider font-bold text-[10px]">Date of Birth</span>
            <p className="text-sm font-semibold text-slate-800 mt-1">{student.date_of_birth || '-'}</p>
          </div>

          <div>
            <span className="text-slate-400 uppercase tracking-wider font-bold text-[10px]">Gender</span>
            <p className="text-sm font-semibold text-slate-800 mt-1">{student.gender || '-'}</p>
          </div>

          <div>
            <span className="text-slate-400 uppercase tracking-wider font-bold text-[10px]">Category / Quota</span>
            <p className="text-sm font-semibold text-slate-800 mt-1">{student.category || 'General'}</p>
          </div>

          <div>
            <span className="text-slate-400 uppercase tracking-wider font-bold text-[10px]">Programme</span>
            <p className="text-sm font-semibold text-slate-800 mt-1">{student.programme_name || 'CSE'}</p>
          </div>

          <div>
            <span className="text-slate-400 uppercase tracking-wider font-bold text-[10px]">Enrollment Date</span>
            <p className="text-sm font-semibold text-slate-800 mt-1">{student.enrollment_date || '-'}</p>
          </div>

          <div>
            <span className="text-slate-400 uppercase tracking-wider font-bold text-[10px]">Admission Status</span>
            <p className="text-sm font-semibold text-emerald-700 mt-1 capitalize">{student.enrollment_status || 'active'}</p>
          </div>

          <div>
            <span className="text-slate-400 uppercase tracking-wider font-bold text-[10px]">Email Address</span>
            <p className="text-sm font-semibold text-slate-800 mt-1">{student.email || '-'}</p>
          </div>

          <div>
            <span className="text-slate-400 uppercase tracking-wider font-bold text-[10px]">Phone Number</span>
            <p className="text-sm font-semibold text-slate-800 mt-1">{student.phone || '-'}</p>
          </div>

          <div>
            <span className="text-slate-400 uppercase tracking-wider font-bold text-[10px]">CSV Row Index</span>
            <p className="text-sm font-semibold text-slate-700 mt-1">Row {student.row_number || 1}</p>
          </div>
        </div>
      )}

      {/* Tab 2: Issues & Cases */}
      {activeTab === 'issues' && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-3 tracking-tight">Validation Rule Discrepancies</h2>
            {student.issues && student.issues.length > 0 ? (
              <div className="space-y-3">
                {student.issues.map((iss: any) => (
                  <div key={iss.id} className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-rose-800">{iss.rule_code}</span>
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                          {iss.severity}
                        </span>
                      </div>
                      <p className="text-slate-700 mt-0.5 font-medium">{iss.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-medium">No active validation discrepancies recorded.</p>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-3 tracking-tight">Associated Verification Cases</h2>
            {student.cases && student.cases.length > 0 ? (
              <div className="space-y-3">
                {student.cases.map((c: any) => (
                  <div
                    key={c.id}
                    onClick={() => navigate('/cases')}
                    className="p-3 bg-slate-50 border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 rounded-lg text-xs cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{c.title || c.issue_type}</span>
                        <StatusBadge status={c.status} size="sm" />
                      </div>
                      <p className="text-slate-500 mt-0.5 font-medium">{c.description}</p>
                    </div>
                    <span className="text-blue-700 text-xs font-semibold">Review Case →</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-medium">No open verification cases for this student.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Version History */}
      {activeTab === 'history' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-4 tracking-tight">Immutable Audit Version History</h2>
          <div className="relative border-l-2 border-slate-200 ml-4 space-y-6">
            {student.version_history?.map((ver: any) => (
              <div key={ver.id} className="relative pl-6">
                <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-xs" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Version {ver.version}</span>
                    {ver.is_latest && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                        Current Latest
                      </span>
                    )}
                    <span className="text-slate-400 text-[11px] font-medium">
                      {ver.updated_at ? new Date(ver.updated_at).toLocaleString() : ''}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 mt-1 font-medium">
                    Student Name: <strong className="text-slate-900">{ver.name}</strong> · APAAR ID:{' '}
                    <strong className="font-mono text-blue-700">{ver.apaar_id || 'N/A'}</strong>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 italic">{ver.remarks || 'Initial upload version'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Correction Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Submit Student Record Correction">
        <form onSubmit={handleCorrectionSubmit} className="space-y-4">
          <p className="text-xs text-slate-500 font-medium">
            Corrections create a new immutable version in accordance with AICTE audit trail requirements. The original record remains preserved.
          </p>

          {corrError && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200 font-medium">
              {corrError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Student Full Name</label>
            <input
              type="text"
              value={corrName}
              onChange={(e) => setCorrName(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">APAAR ID (12 Digits)</label>
            <input
              type="text"
              value={corrApaar}
              onChange={(e) => setCorrApaar(e.target.value)}
              placeholder="e.g. 240000000001"
              maxLength={12}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={corrDob}
                onChange={(e) => setCorrDob(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
              <select
                value={corrGender}
                onChange={(e) => setCorrGender(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Audit Correction Justification <span className="text-rose-600">*</span>
            </label>
            <textarea
              value={corrReason}
              onChange={(e) => setCorrReason(e.target.value)}
              required
              rows={3}
              placeholder="Provide justification rationale (e.g. Verified with DigiLocker 10th marksheet certificate #CBSE-2022-9988)"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingCorr}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {savingCorr ? 'Saving Version...' : 'Confirm & Save Version'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
