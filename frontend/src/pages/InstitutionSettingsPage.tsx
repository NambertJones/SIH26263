import React, { useState, useEffect } from 'react';
import { institutionsApi } from '../api/client';
import { Modal } from '../components/ui/Modal';
import {
  Building2,
  Save,
  Plus,
  BookOpen,
  Calendar,
  Shield,
  CheckCircle2,
} from 'lucide-react';

export const InstitutionSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'programmes' | 'calendar' | 'security'>('profile');
  const [institution, setInstitution] = useState<any>(null);
  const [programmes, setProgrammes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Profile Fields
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [type, setType] = useState('');

  // Add Programme Modal
  const [progModalOpen, setProgModalOpen] = useState(false);
  const [newProgCode, setNewProgCode] = useState('');
  const [newProgName, setNewProgName] = useState('');
  const [newProgIntake, setNewProgIntake] = useState(60);
  const [addingProg, setAddingProg] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const instList = await institutionsApi.list();
        if (instList.length > 0) {
          const inst = instList[0];
          setInstitution(inst);
          setName(inst.name);
          setAddress(inst.address || '');
          setCity(inst.city || '');
          setState(inst.state || '');
          setType(inst.type || 'Self-Financing');

          const progs = await institutionsApi.getProgrammes(inst.id);
          setProgrammes(progs);
        }
      } catch (err) {
        console.error('Error fetching institution details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution?.id) return;
    setSaving(true);
    setSuccessMsg(null);
    try {
      await institutionsApi.update(institution.id, {
        name,
        address,
        city,
        state,
        type,
      });
      setSuccessMsg('Institution profile updated successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAddProgramme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution?.id) return;
    setAddingProg(true);
    try {
      await institutionsApi.addProgramme(institution.id, {
        code: newProgCode,
        name: newProgName,
        approved_intake: Number(newProgIntake),
        academic_year: '2025-26',
        supernumerary_seats: 6,
        nri_seats: 3,
      });
      const progs = await institutionsApi.getProgrammes(institution.id);
      setProgrammes(progs);
      setProgModalOpen(false);
      setNewProgCode('');
      setNewProgName('');
    } catch (err: any) {
      alert(err.message || 'Failed to add programme');
    } finally {
      setAddingProg(false);
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
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
          <Building2 className="w-5 h-5 text-amber-400" />
          <span>Institution Profile & Sanctioned Seat Matrix</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage AICTE institutional credentials, approved programmes, and sanctioned seat allocations.
        </p>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1b3459] text-xs">
        {[
          { id: 'profile', label: 'Institution Profile', icon: <Building2 className="w-3.5 h-3.5" /> },
          { id: 'programmes', label: `Programmes & Intake (${programmes.length})`, icon: <BookOpen className="w-3.5 h-3.5" /> },
          { id: 'calendar', label: 'Academic Year Cycle', icon: <Calendar className="w-3.5 h-3.5" /> },
          { id: 'security', label: 'Security & 2FA', icon: <Shield className="w-3.5 h-3.5" /> },
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

      {/* Tab 1: Profile */}
      {activeTab === 'profile' && (
        <div className="glass-panel p-6 rounded-xl border border-[#1b3459]">
          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  AICTE Permanent Institute ID
                </label>
                <input
                  type="text"
                  disabled
                  value={institution?.aicte_id || ''}
                  className="w-full bg-[#081220] border border-[#1b3459] rounded-lg px-3 py-2 text-xs text-amber-300 font-mono opacity-80 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Institution Category / Type</label>
                <input
                  type="text"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-[#081220] border border-[#1b3459] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Institution Official Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#081220] border border-[#1b3459] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Campus Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-[#081220] border border-[#1b3459] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-[#081220] border border-[#1b3459] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full bg-[#081220] border border-[#1b3459] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-lg text-xs shadow-md transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Programmes & Intake */}
      {activeTab === 'programmes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Sanctioned seat capacity authoritative intake reference figures used by the reconciliation engine.
            </p>
            <button
              onClick={() => setProgModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#12233f] hover:bg-[#1a335a] border border-amber-500/40 text-amber-300 font-semibold rounded-lg text-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Programme</span>
            </button>
          </div>

          <div className="glass-panel rounded-xl border border-[#1b3459] overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1b3459] bg-[#0c172a] text-slate-400">
                  <th className="py-3 px-4 font-semibold">Code</th>
                  <th className="py-3 px-4 font-semibold">Programme Name</th>
                  <th className="py-3 px-4 font-semibold text-right">Sanctioned Intake</th>
                  <th className="py-3 px-4 font-semibold text-right">Supernumerary (TFW)</th>
                  <th className="py-3 px-4 font-semibold text-right">NRI Quota</th>
                  <th className="py-3 px-4 font-semibold text-right">Total Effective Quota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#152a48] text-slate-300">
                {programmes.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono font-bold text-amber-300">{p.code}</td>
                    <td className="py-3 px-4 font-semibold text-white">{p.name}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold">{p.approved_intake}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">+{p.supernumerary_seats}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">+{p.nri_seats}</td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-400 font-bold">
                      {p.approved_intake + p.supernumerary_seats + p.nri_seats}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Calendar */}
      {activeTab === 'calendar' && (
        <div className="glass-panel p-6 rounded-xl border border-[#1b3459] space-y-4 text-xs">
          <h3 className="text-sm font-bold text-white mb-2">Admission Cycle Deadlines & Cutoffs</h3>
          <div className="space-y-3">
            <div className="p-3 bg-[#081220] border border-[#1b3459] rounded-lg flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-200">First Round Admission Upload Deadline</p>
                <p className="text-[11px] text-slate-400">Cut-off for institutional batch upload</p>
              </div>
              <span className="font-mono text-amber-300 font-bold">31 August 2025</span>
            </div>

            <div className="p-3 bg-[#081220] border border-[#1b3459] rounded-lg flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-200">Reconciliation & Review Cut-off</p>
                <p className="text-[11px] text-slate-400">Final date for adjudicating discrepancies</p>
              </div>
              <span className="font-mono text-amber-300 font-bold">15 September 2025</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Security */}
      {activeTab === 'security' && (
        <div className="glass-panel p-6 rounded-xl border border-[#1b3459] space-y-4 text-xs">
          <h3 className="text-sm font-bold text-white mb-2">Security & Identity Safeguards</h3>
          <div className="p-3 bg-[#081220] border border-[#1b3459] rounded-lg flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-200">Aadhaar eKYC Biometric Verification</p>
              <p className="text-[11px] text-slate-400">Enforce mandatory APAAR UIDAI biometric link</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
              Enforced (Demo)
            </span>
          </div>

          <div className="p-3 bg-[#081220] border border-[#1b3459] rounded-lg flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-200">Institutional Data Isolation (Multi-Tenancy)</p>
              <p className="text-[11px] text-slate-400">Cross-tenant boundaries enforced at middleware layer</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
              Active
            </span>
          </div>
        </div>
      )}

      {/* Add Programme Modal */}
      <Modal isOpen={progModalOpen} onClose={() => setProgModalOpen(false)} title="Add Academic Programme">
        <form onSubmit={handleAddProgramme} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Programme Code (e.g. ECE, AIML)</label>
            <input
              type="text"
              required
              value={newProgCode}
              onChange={(e) => setNewProgCode(e.target.value)}
              placeholder="e.g. AIDS"
              className="w-full bg-[#081220] border border-[#1b3459] rounded-lg px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Programme Full Name</label>
            <input
              type="text"
              required
              value={newProgName}
              onChange={(e) => setNewProgName(e.target.value)}
              placeholder="e.g. Artificial Intelligence and Data Science"
              className="w-full bg-[#081220] border border-[#1b3459] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Approved Sanctioned Intake Seats</label>
            <input
              type="number"
              required
              min={1}
              value={newProgIntake}
              onChange={(e) => setNewProgIntake(Number(e.target.value))}
              className="w-full bg-[#081220] border border-[#1b3459] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setProgModalOpen(false)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addingProg}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold rounded-lg text-xs shadow-md transition disabled:opacity-50"
            >
              {addingProg ? 'Adding...' : 'Add Programme'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
