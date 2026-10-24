import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentsApi, institutionsApi } from '../api/client';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Users, Search, Filter, ArrowRight, UserPlus, FileSpreadsheet } from 'lucide-react';

export const StudentRecordsListPage: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadStudents() {
      try {
        setLoading(true);
        const data = await studentsApi.list({
          validation_status: statusFilter === 'all' ? undefined : statusFilter,
          search: search.trim() || undefined,
          limit: 100,
        });
        setStudents(data.items);
        setTotalCount(data.total);
      } catch (err) {
        console.error('Error fetching students:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStudents();
  }, [statusFilter, search]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <span>Master Student Directory & Verification Records</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Comprehensive institutional registry of all enrolled students with APAAR reconciliation states.
          </p>
        </div>

        <button
          onClick={() => navigate('/upload')}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold rounded-lg text-xs shadow-md shadow-amber-500/20 transition"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Upload New Batch</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="glass-panel p-4 rounded-xl border border-[#1b3459] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
          {[
            { id: 'all', label: `All Students (${totalCount})` },
            { id: 'valid', label: 'Valid Records' },
            { id: 'duplicate', label: 'Duplicates' },
            { id: 'invalid', label: 'Invalid Format' },
            { id: 'warning', label: 'Warnings' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-[#081220] text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search student, APAAR ID, roll..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#081220] border border-[#1b3459] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-xl border border-[#1b3459] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1b3459] bg-[#0c172a] text-slate-400">
                <th className="py-3 px-4 font-semibold">Roll No</th>
                <th className="py-3 px-4 font-semibold">Student Name</th>
                <th className="py-3 px-4 font-semibold">APAAR ID</th>
                <th className="py-3 px-4 font-semibold">Programme</th>
                <th className="py-3 px-4 font-semibold">Gender / Category</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#152a48] text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading student records...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No students found matching current filter.
                  </td>
                </tr>
              ) : (
                students.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-mono text-slate-400">{st.institute_roll_no || '-'}</td>
                    <td className="py-3 px-4 font-semibold text-white">{st.name}</td>
                    <td className="py-3 px-4 font-mono text-amber-300">
                      {st.apaar_id || <span className="text-rose-400 font-sans italic">Missing</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{st.programme_name || 'CSE'}</td>
                    <td className="py-3 px-4 text-slate-400">
                      {st.gender} ({st.category || 'General'})
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={st.validation_status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => navigate(`/students/${st.id}`)}
                        className="px-2.5 py-1 bg-[#12233f] hover:bg-[#1a335a] border border-amber-500/40 text-amber-300 rounded font-semibold text-xs transition"
                      >
                        Inspect Record →
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
