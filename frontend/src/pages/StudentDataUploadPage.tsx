import React, { useState } from 'react';
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

  const downloadSampleTemplate = () => {
    const csvContent = `student_name,apaar_id,dob,gender,programme,enrollment_date,status,category,roll_no,email,phone
Aarav Sharma,240000000001,2004-05-15,Male,CSE,2025-07-20,active,General,312325104001,aarav.sharma@college.edu.in,9876500001
Diya Patel,240000000002,2004-08-22,Female,CSE,2025-07-20,active,OBC,312325104002,diya.patel@college.edu.in,9876500002
Vihaan Reddy,240000000003,2003-12-10,Male,CSE,2025-07-20,active,General,312325104003,vihaan.reddy@college.edu.in,9876500003
Ananya Iyer,554433221100,2004-03-18,Female,CSE,2025-07-20,active,General,312325104004,ananya.iyer@college.edu.in,9876500004
Rohan Kumar,554433221100,2004-11-05,Male,CSE,2025-07-20,active,SC,312325104005,rohan.kumar@college.edu.in,9876500005
Sneha Rao,123456789,2004-07-14,Female,CSE,2025-07-20,active,General,312325104006,sneha.rao@college.edu.in,9876500006
Kabir Singh,998877665544,2004-01-30,Male,CSE,2025-07-20,active,General,312325104007,kabir.singh@college.edu.in,9876500007
Pari Deshmukh,240000000008,2028-01-01,Female,CSE,2025-07-20,active,OBC,312325104008,pari.deshmukh@college.edu.in,9876500008`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'AICTE_Student_Admission_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Wizard Progress Stepper */}
      <div className="glass-panel p-4 rounded-xl border border-[#1d3558]">
        <div className="flex items-center justify-between max-w-3xl mx-auto text-xs">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs">
              1
            </span>
            <span>Upload File</span>
          </div>
          <div className="h-0.5 w-12 bg-slate-700" />
          <div className="flex items-center gap-2 text-slate-500">
            <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs">
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

      {/* Main Grid: Upload Area on Left, Checklist on Right */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Drag & Drop Zone */}
        <div className="md:col-span-2 glass-panel p-6 rounded-xl border border-[#1b3459] space-y-6">
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">Upload Student Admission Data</h1>
            <p className="text-xs text-slate-400 mt-1">
              Upload institutional admission records (CSV, XLSX) to perform automated APAAR verification and intake reconciliation.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Academic Year Selection */}
          <div className="flex items-center gap-4">
            <label className="text-xs font-semibold text-slate-300">Admission Academic Year:</label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="bg-[#081220] border border-[#1b3459] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
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
                ? 'border-amber-400 bg-amber-500/10'
                : file
                ? 'border-emerald-500/80 bg-emerald-950/20'
                : 'border-[#1e3a66] hover:border-slate-500 bg-[#081220]/60'
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
              <div className="w-14 h-14 mx-auto rounded-full bg-[#0d1c33] border border-[#1f3d68] flex items-center justify-center text-amber-400 mb-3 shadow-inner">
                {file ? <FileSpreadsheet className="w-7 h-7 text-emerald-400" /> : <UploadCloud className="w-7 h-7" />}
              </div>

              {file ? (
                <div>
                  <p className="text-sm font-semibold text-emerald-400">{file.name}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {(file.size / 1024).toFixed(1)} KB · Ready to map columns
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-white">
                    Drag and drop your student data file here, or{' '}
                    <span className="text-amber-400 hover:underline">browse</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports .CSV, .XLSX (Max file size: 10MB)
                  </p>
                </div>
              )}
            </label>
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={downloadSampleTemplate}
              className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium py-1.5 px-3 rounded-lg border border-amber-500/30 bg-amber-500/5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Sample CSV Template</span>
            </button>

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-lg text-xs shadow-lg shadow-amber-500/20 transition disabled:opacity-40"
            >
              <span>{uploading ? 'Processing File...' : 'Proceed to Column Mapping'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Requirements Checklist */}
        <div className="glass-panel p-6 rounded-xl border border-[#1b3459] flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide mb-3 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-amber-400" />
              <span>Required Data Schema</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-200">Student Full Name</p>
                  <p className="text-[11px] text-slate-400">As per official 10th / Aadhaar record</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-200">APAAR ID (12 Digits)</p>
                  <p className="text-[11px] text-slate-400">Automated One Nation One Student ID</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-200">Date of Birth</p>
                  <p className="text-[11px] text-slate-400">YYYY-MM-DD or DD/MM/YYYY format</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-200">Gender & Category</p>
                  <p className="text-[11px] text-slate-400">Male / Female / Other & Quota</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-200">Academic Programme</p>
                  <p className="text-[11px] text-slate-400">Reconciled against approved AICTE intake</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-center gap-1.5 text-amber-300 text-xs font-semibold mb-1">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Duplicate & Intake Rule:</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Records will be checked in real-time against cross-institution enrollments and sanctioned intake quotas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
