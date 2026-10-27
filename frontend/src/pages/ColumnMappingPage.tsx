import React, { useState, useEffect } from 'react';
import { ImportStepper } from '../components/ui/ImportStepper';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { submissionsApi } from '../api/client';
import { Split, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Eye } from 'lucide-react';

const REQUIRED_FIELDS = [
  { key: 'name', label: 'Student Full Name', required: true, desc: 'Name as on the admission record' },
  { key: 'apaar_id', label: 'APAAR ID', required: true, desc: '12-digit APAAR ID (format checked only)' },
  { key: 'date_of_birth', label: 'Date of Birth', required: true, desc: 'DOB for identity matching' },
  { key: 'gender', label: 'Gender', required: true, desc: 'Male, Female, or Other' },
  { key: 'programme', label: 'Programme / Branch', required: false, desc: 'CSE, AIML, ECE, MECH, etc.' },
  { key: 'enrollment_date', label: 'Enrollment Date', required: false, desc: 'Date of admission' },
  { key: 'enrollment_status', label: 'Enrollment Status', required: false, desc: 'Active, Withdrawn, etc.' },
  { key: 'category', label: 'Social Category / Quota', required: false, desc: 'General, OBC, SC, ST, EWS' },
  { key: 'institute_roll_no', label: 'Institute Roll / Reg No', required: false, desc: 'College register number' },
  { key: 'email', label: 'Email Address', required: false, desc: 'Student email' },
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
        try {
          // Resume only an upload that is still waiting for column mapping
          const list = await submissionsApi.list();
          const pending = list.find((s: any) => s.status === 'mapping' || s.status === 'uploaded');
          if (pending) {
            navigate(`/mapping?submission_id=${pending.id}`, { replace: true });
            return;
          }
        } catch {}
        setError('No upload is waiting for column mapping. Start from "Upload Data" to upload a CSV or Excel file.');
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

    const missing = REQUIRED_FIELDS.filter((f) => f.required && !mappings[f.key]);
    if (missing.length > 0) {
      setError(`Please map all mandatory fields: ${missing.map((m) => m.label).join(', ')}`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await submissionsApi.mapColumns(submissionId, { mapping: mappings });
      await submissionsApi.validate(submissionId);
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
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <ImportStepper current={2} />

      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Split className="w-5 h-5 text-blue-600" />
            <span>Map CSV Columns to the ReconX Template</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            File: <strong className="text-blue-700">{submission?.file_name}</strong> · Total Rows:{' '}
            <strong className="text-slate-800">{submission?.total_records}</strong>
          </p>
        </div>

        <button
          onClick={() => navigate('/upload')}
          className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Upload Different File</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Mapping Table */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <span>ReconX Template Field</span>
          <span>Detected File Header</span>
        </div>

        <div className="space-y-3">
          {REQUIRED_FIELDS.map((field) => {
            const currentSelected = mappings[field.key] || '';
            const isMapped = Boolean(currentSelected);

            return (
              <div
                key={field.key}
                className="grid grid-cols-1 md:grid-cols-2 items-center gap-4 p-3 rounded-lg bg-slate-50/70 border border-slate-200 hover:border-slate-300 transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">{field.label}</span>
                    {field.required && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{field.desc}</p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={currentSelected}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium shadow-2xs"
                  >
                    <option value="">-- Select Column from File --</option>
                    {columns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                  {isMapped ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : field.required ? (
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
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
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2 tracking-tight">
            <Eye className="w-4 h-4 text-blue-600" />
            <span>Raw File Sample Preview (First 3 Rows)</span>
          </h2>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="py-2.5 px-3 font-bold">#</th>
                  {columns.map((col) => (
                    <th key={col} className="py-2.5 px-3 font-bold whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {previewRows.slice(0, 3).map((row) => (
                  <tr key={row.row_number} className="hover:bg-slate-50/70 transition">
                    <td className="py-2 px-3 font-mono text-slate-400 font-medium">{row.row_number}</td>
                    {columns.map((col) => (
                      <td key={col} className="py-2 px-3 whitespace-nowrap font-medium">
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
          className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Upload</span>
        </button>

        <button
          onClick={handleValidateAndProceed}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-sm shadow-blue-500/20 transition disabled:opacity-40 cursor-pointer"
        >
          <span>{saving ? 'Validating Batch...' : 'Save Mapping & Run Validation'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
