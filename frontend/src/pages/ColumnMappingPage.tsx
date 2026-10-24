import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { submissionsApi } from '../api/client';
import { Split, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Eye } from 'lucide-react';

const REQUIRED_FIELDS = [
  { key: 'name', label: 'Student Full Name', required: true, desc: 'Candidate official legal name' },
  { key: 'apaar_id', label: 'APAAR ID', required: true, desc: '12-digit One Nation One Student ID' },
  { key: 'date_of_birth', label: 'Date of Birth', required: true, desc: 'DOB for identity matching' },
  { key: 'gender', label: 'Gender', required: true, desc: 'Male, Female, or Other' },
  { key: 'programme', label: 'Programme / Branch', required: false, desc: 'CSE, AIML, ECE, MECH, etc.' },
  { key: 'enrollment_date', label: 'Enrollment Date', required: false, desc: 'Date of admission' },
  { key: 'enrollment_status', label: 'Enrollment Status', required: false, desc: 'Active, Withdrawn, etc.' },
  { key: 'category', label: 'Social Category / Quota', required: false, desc: 'General, OBC, SC, ST, EWS' },
  { key: 'institute_roll_no', label: 'Institute Roll / Reg No', required: false, desc: 'College register number' },
  { key: 'email', label: 'Email Address', required: false, desc: 'Student official or personal email' },
  { key: 'phone', label: 'Contact Phone Number', required: false, desc: 'Mobile number' },
];

export const ColumnMappingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const submissionId = searchParams.get('submission_id');
  const navigate = useNavigate();

  const [submission, setSubmission] = useState<any>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!submissionId) {
        // Fallback: list submissions and take latest
        try {
          const list = await submissionsApi.list();
          if (list.length > 0) {
            navigate(`/mapping?submission_id=${list[0].id}`, { replace: true });
            return;
          }
        } catch {}
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [sub, prev] = await Promise.all([
          submissionsApi.get(submissionId),
          submissionsApi.getPreview(submissionId),
        ]);
        setSubmission(sub);
        setColumns(prev.columns || []);
        setPreviewRows(prev.preview_rows || []);
        setMappings(prev.auto_mappings || {});
      } catch (err: any) {
        setError(err.message || 'Failed to load file preview.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [submissionId, navigate]);

  const handleFieldChange = (fieldKey: string, fileCol: string) => {
    setMappings((prev) => ({
      ...prev,
      [fieldKey]: fileCol,
    }));
  };

  const handleValidateAndProceed = async () => {
    if (!submissionId) return;

    // Check mandatory fields
    const missing = REQUIRED_FIELDS.filter((f) => f.required && !mappings[f.key]);
    if (missing.length > 0) {
      setError(`Please map all mandatory fields: ${missing.map((m) => m.label).join(', ')}`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      // 1. Save column mappings
      await submissionsApi.mapColumns(submissionId, { mapping: mappings });
      // 2. Trigger validation engine
      await submissionsApi.validate(submissionId);
      // 3. Navigate to Screen 5 (Validation Results)
      navigate(`/validation?submission_id=${submissionId}`);
    } catch (err: any) {
      setError(err.message || 'Validation execution failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Stepper */}
      <div className="glass-panel p-4 rounded-xl border border-[#1d3558]">
        <div className="flex items-center justify-between max-w-3xl mx-auto text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500 flex items-center justify-center text-xs">
              ✓
            </span>
            <span>Upload File</span>
          </div>
          <div className="h-0.5 w-12 bg-amber-500" />
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs">
              2
            </span>
            <span>Map Columns</span>
          </div>
          <div className="h-0.5 w-12 bg-slate-700" />
          <div className="flex items-center gap-2 text-slate-500">
            <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs">
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <Split className="w-5 h-5 text-amber-400" />
            <span>Map CSV Columns to AICTE Standard Schema</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            File: <strong className="text-amber-300">{submission?.file_name}</strong> · Total Rows:{' '}
            <strong className="text-white">{submission?.total_records}</strong>
          </p>
        </div>

        <button
          onClick={() => navigate('/upload')}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Upload Different File</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Mapping Table */}
      <div className="glass-panel p-6 rounded-xl border border-[#1b3459] space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2 border-b border-[#1b3459] text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <span>AICTE Standard Field</span>
          <span>Detected File Header</span>
        </div>

        <div className="space-y-3">
          {REQUIRED_FIELDS.map((field) => {
            const currentSelected = mappings[field.key] || '';
            const isMapped = Boolean(currentSelected);

            return (
              <div
                key={field.key}
                className="grid grid-cols-1 md:grid-cols-2 items-center gap-4 p-3 rounded-lg bg-[#081220] border border-[#152a48] hover:border-[#1e3d68] transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">{field.label}</span>
                    {field.required && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-400 border border-rose-800 font-semibold">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{field.desc}</p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={currentSelected}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    className="w-full bg-[#0c182c] border border-[#1f3b64] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="">-- Select Column from File --</option>
                    {columns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                  {isMapped ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : field.required ? (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  ) : (
                    <span className="w-4 h-4" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Row Sample Preview */}
      {previewRows.length > 0 && (
        <div className="glass-panel p-6 rounded-xl border border-[#1b3459]">
          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-400" />
            <span>Raw File Sample Preview (First 3 Rows)</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1b3459] text-slate-400">
                  <th className="py-2 px-3 font-semibold">#</th>
                  {columns.map((col) => (
                    <th key={col} className="py-2 px-3 font-semibold whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#152945] text-slate-300">
                {previewRows.slice(0, 3).map((row) => (
                  <tr key={row.row_number} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 font-mono text-slate-500">{row.row_number}</td>
                    {columns.map((col) => (
                      <td key={col} className="py-2 px-3 whitespace-nowrap">
                        {row.data[col] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => navigate('/upload')}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-2 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Upload</span>
        </button>

        <button
          onClick={handleValidateAndProceed}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-lg text-xs shadow-lg shadow-amber-500/20 transition disabled:opacity-40"
        >
          <span>{saving ? 'Validating Batch...' : 'Save Mapping & Run Validation'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
