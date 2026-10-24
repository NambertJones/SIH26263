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
  CheckCircle2,
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
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            <span>AICTE Statutory Reports & Analytics</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Reconciliation summaries, discrepancy audits, and multi-institutional compliance reporting.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#0c182c] border border-[#1d3558] rounded-lg px-3 py-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
            >
              <option value="2025-26" className="bg-[#0c182c]">Academic Year 2025-26</option>
              <option value="2024-25" className="bg-[#0c182c]">Academic Year 2024-25</option>
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-lg text-xs shadow-md shadow-amber-500/20 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV Audit File</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1b3459] text-xs">
        {[
          { id: 'enrollment', label: 'Enrollment Summary', icon: <FileSpreadsheet className="w-3.5 h-3.5" /> },
          { id: 'discrepancy', label: `Discrepancy Audit (${discrepancies.length})`, icon: <AlertTriangle className="w-3.5 h-3.5" /> },
          { id: 'compliance', label: 'AICTE Compliance Rating', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
          { id: 'institution', label: 'Institution-Wise Matrix', icon: <Building className="w-3.5 h-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 px-3.5 font-semibold transition flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'border-b-2 border-amber-400 text-amber-300'
                : 'text-slate-400 hover:text-white'
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
          <div className="glass-panel p-6 rounded-xl border border-[#1b3459]">
            <h2 className="text-sm font-bold text-white mb-4">Programme-wise Sanctioned Intake vs Enrolled</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#1b3459] bg-[#0c172a] text-slate-400">
                    <th className="py-3 px-4 font-semibold">Programme Code</th>
                    <th className="py-3 px-4 font-semibold">Programme Name</th>
                    <th className="py-3 px-4 font-semibold text-right">Approved Intake</th>
                    <th className="py-3 px-4 font-semibold text-right">Actual Enrolled</th>
                    <th className="py-3 px-4 font-semibold text-right">Utilization %</th>
                    <th className="py-3 px-4 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#152a48] text-slate-300">
                  {enrollmentData?.programmes?.map((p: any) => {
                    const isExceeded = p.enrolled_count > p.approved_intake;
                    return (
                      <tr key={p.programme_code} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-mono font-bold text-amber-300">{p.programme_code}</td>
                        <td className="py-3 px-4 font-semibold text-white">{p.programme_name}</td>
                        <td className="py-3 px-4 text-right font-mono">{p.approved_intake}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          <span className={isExceeded ? 'text-rose-400' : 'text-white'}>{p.enrolled_count}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono">{p.utilization_percentage}%</td>
                        <td className="py-3 px-4 text-center">
                          {isExceeded ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                              Exceeded (+{p.enrolled_count - p.approved_intake})
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-medium">
                              Within Limit
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
        <div className="glass-panel rounded-xl border border-[#1b3459] overflow-hidden">
          <div className="p-4 border-b border-[#1b3459] flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Full Discrepancy Audit Log</h2>
            <span className="text-xs text-slate-400">{discrepancies.length} total issues recorded</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1b3459] bg-[#0c172a] text-slate-400">
                  <th className="py-3 px-4 font-semibold">Rule Code</th>
                  <th className="py-3 px-4 font-semibold">Severity</th>
                  <th className="py-3 px-4 font-semibold">Student Name</th>
                  <th className="py-3 px-4 font-semibold">APAAR ID</th>
                  <th className="py-3 px-4 font-semibold">Discrepancy Description</th>
                  <th className="py-3 px-4 font-semibold">Row</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#152a48] text-slate-300">
                {discrepancies.map((iss) => (
                  <tr key={iss.issue_id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono font-bold text-amber-300">{iss.rule_code}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                          iss.severity === 'error'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {iss.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">{iss.student_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">{iss.student_apaar_id}</td>
                    <td className="py-3 px-4 max-w-sm">{iss.description}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{iss.row_number || '-'}</td>
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

      {/* Tab 3: Compliance Report */}
      {activeTab === 'compliance' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-xl border border-[#1b3459] text-center flex flex-col items-center justify-center">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Overall Compliance Rating
            </h3>
            <div className="w-32 h-32 rounded-full border-4 border-amber-400 flex items-center justify-center my-3 bg-[#081220]">
              <span className="text-3xl font-extrabold text-white">{compliance?.compliance_score || 0}</span>
              <span className="text-xs text-slate-400 ml-1">/100</span>
            </div>
            <span
              className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                compliance?.status === 'COMPLIANT'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                  : 'bg-amber-950 text-amber-300 border border-amber-700'
              }`}
            >
              {compliance?.status || 'COMPLIANT'}
            </span>
          </div>

          <div className="md:col-span-2 glass-panel p-6 rounded-xl border border-[#1b3459] space-y-4">
            <h3 className="text-sm font-bold text-white mb-2">AICTE Statutory Audit Criteria</h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#081220] border border-[#172d4e] rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-200">APAAR ID Biometric Linkage Compliance</p>
                  <p className="text-[11px] text-slate-400">{compliance?.valid_percentage}% authenticated with NDEAR registry</p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>

              <div className="p-3 bg-[#081220] border border-[#172d4e] rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-200">Cross-Institution Duplicate Enrollments</p>
                  <p className="text-[11px] text-slate-400">{compliance?.duplicate_count} active duplicate conflicts detected</p>
                </div>
                <span className="text-amber-400 font-bold">{compliance?.duplicate_count}</span>
              </div>

              <div className="p-3 bg-[#081220] border border-[#172d4e] rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-200">Sanctioned Intake Over-Enrollment Violations</p>
                  <p className="text-[11px] text-slate-400">{compliance?.programmes_exceeded} programmes currently exceed quota</p>
                </div>
                <span className="text-rose-400 font-bold">{compliance?.programmes_exceeded}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Institution-Wise Matrix */}
      {activeTab === 'institution' && (
        <div className="glass-panel rounded-xl border border-[#1b3459] overflow-hidden">
          <div className="p-4 border-b border-[#1b3459]">
            <h2 className="text-sm font-bold text-white">Multi-Institution Comparative Matrix</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1b3459] bg-[#0c172a] text-slate-400">
                  <th className="py-3 px-4 font-semibold">AICTE ID</th>
                  <th className="py-3 px-4 font-semibold">Institution Name</th>
                  <th className="py-3 px-4 font-semibold">Location</th>
                  <th className="py-3 px-4 font-semibold">Type</th>
                  <th className="py-3 px-4 font-semibold text-right">Students</th>
                  <th className="py-3 px-4 font-semibold text-right">Verified %</th>
                  <th className="py-3 px-4 font-semibold text-right">Issues</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#152a48] text-slate-300">
                {institutionWise.map((inst) => (
                  <tr key={inst.institution_id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono font-bold text-amber-300">{inst.aicte_id}</td>
                    <td className="py-3 px-4 font-semibold text-white">{inst.name}</td>
                    <td className="py-3 px-4 text-slate-400">{inst.city}, {inst.state}</td>
                    <td className="py-3 px-4 text-slate-400">{inst.type}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold">{inst.total_students}</td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-400 font-bold">
                      {inst.valid_percentage}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-400 font-bold">
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
