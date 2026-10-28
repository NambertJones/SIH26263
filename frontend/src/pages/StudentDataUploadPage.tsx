import React, { useState } from 'react';
import { ImportStepper } from '../components/ui/ImportStepper';
import { useNavigate } from 'react-router-dom';
import { submissionsApi } from '../api/client';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

const SAMPLE_FILES = [
  {
    file: 'CSBS_2025-26_admissions',
    title: 'CSBS first-year admissions',
    description: 'A clean batch: every row should pass all checks.',
    programme: 'Computer Science & Business Systems (CSBS)',
    rows: 57,
    formats: ['csv'],
  },
  {
    file: 'MCA_2025-26_admissions',
    title: 'MCA first-year admissions',
    description: 'Includes typical data problems: missing and malformed APAAR IDs, a repeated ID, a student already enrolled at another college, an impossible date of birth and formatting errors.',
    programme: 'Master of Computer Applications (MCA)',
    rows: 60,
    formats: ['csv', 'xlsx'],
  },
  {
    file: 'MECH_2025-26_late_admissions',
    title: 'Mechanical late admissions',
    description: 'Late admissions that take Mechanical Engineering above its intake reference.',
    programme: 'Mechanical Engineering (MECH)',
    rows: 12,
    formats: ['csv'],
  },
];

export const StudentDataUploadPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const navigate = useNavigate();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a CSV or XLSX file first.');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('academic_year', academicYear);

    try {
      const res = await submissionsApi.upload(formData);
      navigate(`/mapping?submission_id=${res.submission_id}`);
    } catch (err: any) {
      setError(err.message || 'File upload failed. Ensure CSV or XLSX format.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <ImportStepper current={1} />

      {/* Main Grid: Upload Area on Left, Checklist on Right */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Drag & Drop Zone */}
        <div className="md:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Upload Student Admission Data</h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Upload institutional admission records (CSV, XLSX) to run APAAR format checks, duplicate checks and intake comparison. Flags need human review.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Academic Year Selection */}
          <div className="flex items-center gap-4">
            <label className="text-xs font-semibold text-slate-700">Admission Academic Year:</label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 font-medium"
            >
              <option value="2025-26">2025-26 (Current Academic Year)</option>
              <option value="2024-25">2024-25</option>
            </select>
          </div>

          {/* Drag & Drop Card */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
              dragActive
                ? 'border-blue-500 bg-blue-50/50'
                : file
                ? 'border-emerald-500 bg-emerald-50/40'
                : 'border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/20'
            }`}
          >
            <input
              type="file"
              id="file-upload"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="file-upload" className="cursor-pointer block">
              <div className="w-14 h-14 mx-auto rounded-full bg-white border border-slate-200 flex items-center justify-center text-blue-600 mb-3 shadow-xs">
                {file ? <FileSpreadsheet className="w-7 h-7 text-emerald-600" /> : <UploadCloud className="w-7 h-7" />}
              </div>

              {file ? (
                <div>
                  <p className="text-sm font-semibold text-emerald-700">{file.name}</p>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    {(file.size / 1024).toFixed(1)} KB · Ready to map columns
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Drag and drop your student data file here, or{' '}
                    <span className="text-blue-600 hover:underline">browse</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1 font-medium">
                    Supports .CSV, .XLSX (Max file size: 10MB)
                  </p>
                </div>
              )}
            </label>
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-between pt-2">
            <a
              href="/samples/ReconX_Student_Template.csv"
              download
              className="flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-800 font-semibold py-1.5 px-3 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100 transition"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Download CSV Template</span>
            </a>

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-sm shadow-blue-500/20 transition disabled:opacity-40 cursor-pointer"
            >
              <span>{uploading ? 'Processing File...' : 'Proceed to Column Mapping'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Requirements Checklist */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight mb-3 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-blue-600" />
              <span>Required Data Schema</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800">Student Full Name</p>
                  <p className="text-[11px] text-slate-500">As on the institution's admission record</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800">APAAR ID (12 Digits)</p>
                  <p className="text-[11px] text-slate-500">Format check only (12 digits); not verified with the APAAR registry</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800">Date of Birth</p>
                  <p className="text-[11px] text-slate-500">YYYY-MM-DD or DD/MM/YYYY format</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800">Gender & Category</p>
                  <p className="text-[11px] text-slate-500">Male / Female / Other & Quota</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800">Academic Programme</p>
                  <p className="text-[11px] text-slate-500">Compared with the intake reference</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-3.5 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-1.5 text-amber-800 text-xs font-bold mb-1">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Duplicate & Intake Rule:</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
              Records are checked for possible duplicates (within and across institutions) and compared with the intake reference. Flags need human review.
            </p>
          </div>
        </div>
      </div>
      {/* Ready-made admission files for this college's departments */}
      <section aria-labelledby="sample-files" className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <h2 id="sample-files" className="text-sm font-bold text-slate-900 tracking-tight">Sample admission files</h2>
        <p className="text-xs text-slate-600 mt-1">
          Download a file, then upload it above and pick the matching programme on the next step.
        </p>
        <ul className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {SAMPLE_FILES.map((f) => (
            <li key={f.file} className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{f.title}</p>
                <p className="text-slate-600 mt-0.5">{f.description}</p>
                <p className="text-slate-500 mt-1">Programme: <strong>{f.programme}</strong> · {f.rows} rows</p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                {f.formats.map((ext) => (
                  <a
                    key={ext}
                    href={`/samples/${f.file}.${ext}`}
                    download
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-blue-200 bg-white text-blue-700 font-semibold hover:bg-blue-50"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    {ext.toUpperCase()}
                  </a>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
