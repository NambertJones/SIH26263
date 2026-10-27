import { maskApaar } from '../lib/privacy';
import React, { useState, useEffect } from 'react';
import { reportsApi } from '../api/client';
import { StatusBadge } from '../components/ui/StatusBadge';
import {
  BarChart3,
  Download,
  ShieldCheck,
  FileSpreadsheet,
  AlertTriangle,
  Building,
  Calendar,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'enrollment' | 'discrepancy' | 'compliance' | 'institution'>('enrollment');
  const [enrollmentData, setEnrollmentData] = useState<any>(null);
  const [discrepancies, setDiscrepancies] = useState<any[]>([]);
  const [compliance, setCompliance] = useState<any>(null);
  const [institutionWise, setInstitutionWise] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        const [enr, disc, comp, instWise] = await Promise.all([
          reportsApi.getEnrollmentSummary(),
          reportsApi.getDiscrepancies(),
          reportsApi.getCompliance(),
          reportsApi.getInstitutionWise(),
        ]);
        setEnrollmentData(enr);
        setDiscrepancies(disc);
        setCompliance(comp);
        setInstitutionWise(instWise);
      } catch (err) {
        console.error('Error fetching reports:', err);
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, [academicYear]);

  const handleExportCSV = () => {
    // Direct browser trigger to backend export endpoint
    window.open('/api/reports/export?report_type=discrepancy', '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-wide flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span>Reports & Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Reconciliation summaries, discrepancy lists and institution comparisons.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="2025-26" className="bg-white text-slate-800">Academic Year 2025-26</option>
              <option value="2024-25" className="bg-white text-slate-800">Academic Year 2024-25</option>
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs shadow-sm transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs">
        {[
          { id: 'enrollment', label: 'Enrollment Summary', icon: <FileSpreadsheet className="w-3.5 h-3.5" /> },
          { id: 'discrepancy', label: `Discrepancy Audit (${discrepancies.length})`, icon: <AlertTriangle className="w-3.5 h-3.5" /> },
          { id: 'compliance', label: 'Data-Quality Summary', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
          { id: 'institution', label: 'Institution-Wise Matrix', icon: <Building className="w-3.5 h-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 px-3.5 font-semibold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-600 text-blue-700'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Enrollment Summary */}
      {activeTab === 'enrollment' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-4">Programme-wise Intake Reference vs Enrolled</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="py-3 px-4 font-semibold">Programme Code</th>
                    <th className="py-3 px-4 font-semibold">Programme Name</th>
                    <th className="py-3 px-4 font-semibold text-right">Intake Reference</th>
                    <th className="py-3 px-4 font-semibold text-right">Actual Enrolled</th>
                    <th className="py-3 px-4 font-semibold text-right">Utilization %</th>
                    <th className="py-3 px-4 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {enrollmentData?.programmes?.map((p: any) => {
                    const isExceeded = p.enrolled_count > p.approved_intake;
                    return (
                      <tr key={p.programme_code} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">{p.programme_code}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{p.programme_name}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-800">{p.approved_intake}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          <span className={isExceeded ? 'text-rose-600 font-extrabold' : 'text-slate-900'}>{p.enrolled_count}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-800">{p.utilization_percentage}%</td>
                        <td className="py-3 px-4 text-center">
                          {isExceeded ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                              Potential discrepancy (+{p.enrolled_count - p.approved_intake}) — review
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                              Within reference
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Discrepancy Report */}
      {activeTab === 'discrepancy' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Discrepancy List</h2>
            <span className="text-xs text-slate-500 font-medium">{discrepancies.length} total issues recorded</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="py-3 px-4 font-semibold">Rule Code</th>
                  <th className="py-3 px-4 font-semibold">Severity</th>
                  <th className="py-3 px-4 font-semibold">Student Name</th>
                  <th className="py-3 px-4 font-semibold">APAAR ID</th>
                  <th className="py-3 px-4 font-semibold">Discrepancy Description</th>
                  <th className="py-3 px-4 font-semibold">Row</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {discrepancies.map((iss) => (
                  <tr key={iss.issue_id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">{iss.rule_code}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                          iss.severity === 'error'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {iss.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{iss.student_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{maskApaar(iss.student_apaar_id)}</td>
                    <td className="py-3 px-4 max-w-sm text-slate-700">{iss.description}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{iss.row_number || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={iss.status} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Data-quality summary — traceable counts only, no composite score */}
      {activeTab === 'compliance' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Data-Quality Summary</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Counts computed from the current records. No composite score is shown because no
              official scoring method exists for this data. Possible duplicates and intake differences need human review.
            </p>
          </div>

          {compliance ? (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">Records passing all data checks</p>
                  <p className="text-[11px] text-slate-500">
                    APAAR format check, duplicate check and intake comparison. Format checks are not identity verification.
                  </p>
                </div>
                <span className="text-slate-900 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">{compliance.valid_percentage}%</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">Possible duplicate enrolments — review required</p>
                  <p className="text-[11px] text-slate-500">Open cases where the same APAAR ID appears more than once</p>
                </div>
                <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{compliance.duplicate_count}</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">Programmes with potential intake discrepancy — review required</p>
                  <p className="text-[11px] text-slate-500">Enrolled count above the intake reference</p>
                </div>
                <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">{compliance.programmes_exceeded}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Summary data is not available.</p>
          )}
        </div>
      )}

      {/* Tab 4: Institution-Wise Matrix */}
      {activeTab === 'institution' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-900">Multi-Institution Comparative Matrix</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="py-3 px-4 font-semibold">AICTE ID</th>
                  <th className="py-3 px-4 font-semibold">Institution Name</th>
                  <th className="py-3 px-4 font-semibold">Location</th>
                  <th className="py-3 px-4 font-semibold">Type</th>
                  <th className="py-3 px-4 font-semibold text-right">Students</th>
                  <th className="py-3 px-4 font-semibold text-right">Passing checks %</th>
                  <th className="py-3 px-4 font-semibold text-right">Issues</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {institutionWise.map((inst) => (
                  <tr key={inst.institution_id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">{inst.aicte_id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{inst.name}</td>
                    <td className="py-3 px-4 text-slate-600">{inst.city}, {inst.state}</td>
                    <td className="py-3 px-4 text-slate-600">{inst.type}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{inst.total_students}</td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700 font-bold">
                      {inst.valid_percentage}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-600 font-bold">
                      {inst.issues_count}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={inst.status} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
