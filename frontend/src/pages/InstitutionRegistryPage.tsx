import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Landmark, Search, CheckCircle2, Clock, Building2, Users, GraduationCap } from 'lucide-react';
import { institutionsApi, reportsApi } from '../api/client';
import { Modal } from '../components/ui/Modal';
import { EmptyState, ErrorBanner, SkeletonRows } from '../components/ui/States';

const ApprovalBadge: React.FC<{ status?: string; validTill?: string }> = ({ status, validTill }) => {
  if (status === 'Approved') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-emerald-50 border-emerald-200 text-emerald-800 text-[11px] font-semibold whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
        Approved{validTill ? ` · ${validTill}` : ''}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-amber-50 border-amber-300 text-amber-900 text-[11px] font-semibold whitespace-nowrap">
      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
      {status || 'Not submitted'}
    </span>
  );
};

const capacityOf = (progs: any[] = []) =>
  progs.reduce((sum, p) => sum + (p.approved_intake || 0) + (p.supernumerary_seats || 0) + (p.nri_seats || 0), 0);

/** Oversight view of all institutions with approval details as submitted by each institution. */
export const InstitutionRegistryPage: React.FC = () => {
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [stats, setStats] = useState<Record<string, any>>({});
  const [programmes, setProgrammes] = useState<Record<string, any[]>>({});
  const [intake, setIntake] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [approvalFilter, setApprovalFilter] = useState('all');
  const [selected, setSelected] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [insts, wise, recon] = await Promise.all([
        institutionsApi.list(),
        reportsApi.getInstitutionWise(),
        reportsApi.getIntakeReconciliation(),
      ]);
      setInstitutions(insts);
      setStats(Object.fromEntries(wise.map((w: any) => [w.institution_id, w])));
      const enrolled: Record<string, Record<string, number>> = {};
      recon.items.forEach((r: any) => {
        enrolled[r.institution_id] = { ...(enrolled[r.institution_id] || {}), [r.programme_id]: r.enrolled_count };
      });
      setIntake(enrolled);
      const progs = await Promise.all(insts.map((i: any) => institutionsApi.getProgrammes(i.id).catch(() => [])));
      setProgrammes(Object.fromEntries(insts.map((i: any, idx: number) => [i.id, progs[idx]])));
    } catch (err: any) {
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const types = useMemo(() => Array.from(new Set(institutions.map((i) => i.type).filter(Boolean))).sort(), [institutions]);
  const states = useMemo(() => Array.from(new Set(institutions.map((i) => i.state).filter(Boolean))).sort(), [institutions]);
  const filtered = institutions.filter((i) => {
    const text = `${i.name} ${i.aicte_id} ${i.city} ${i.state}`.toLowerCase();
    return (
      (!q || text.includes(q.toLowerCase())) &&
      (typeFilter === 'all' || i.type === typeFilter) &&
      (stateFilter === 'all' || i.state === stateFilter) &&
      (approvalFilter === 'all' || (i.approval_status || 'Not submitted') === approvalFilter)
    );
  });

  const enrolledOf = (id: string) => Object.values(intake[id] || {}).reduce((a, b) => a + b, 0);
  const totals = {
    institutions: institutions.length,
    approved: institutions.filter((i) => i.approval_status === 'Approved').length,
    capacity: institutions.reduce((sum, i) => sum + capacityOf(programmes[i.id]), 0),
    enrolled: institutions.reduce((sum, i) => sum + enrolledOf(i.id), 0),
  };

  const summary = [
    { label: 'Institutions', value: totals.institutions, icon: Building2 },
    { label: 'Approval on file', value: `${totals.approved} of ${totals.institutions}`, icon: CheckCircle2 },
    { label: 'Total intake capacity', value: totals.capacity.toLocaleString('en-IN'), icon: GraduationCap },
    { label: 'Students enrolled', value: totals.enrolled.toLocaleString('en-IN'), icon: Users },
  ];

  return (
    <div className="space-y-5 max-w-7xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Landmark className="w-5 h-5 text-blue-600" aria-hidden="true" />
          Institution Registry
        </h1>
        <p className="text-xs text-slate-600 mt-1 max-w-3xl">
          Institutions reporting student data, with AICTE approval details as submitted by each institution, programmes,
          intake capacity and enrolment for 2025-26.
        </p>
      </div>

      {!loading && !error && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summary.map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                {label}
                <Icon className="w-4 h-4 text-blue-600" aria-hidden="true" />
              </div>
              <p className="mt-2 text-2xl font-extrabold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="inst-search" className="block text-xs font-semibold text-slate-700 mb-1">
            Search name, code or city
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" aria-hidden="true" />
            <input id="inst-search" value={q} onChange={(e) => setQ(e.target.value)} className="w-full border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs" />
          </div>
        </div>
        {[
          { id: 'inst-state', label: 'State', value: stateFilter, set: setStateFilter, options: states, all: 'All states' },
          { id: 'inst-type', label: 'Type', value: typeFilter, set: setTypeFilter, options: types, all: 'All types' },
          { id: 'inst-approval', label: 'Approval', value: approvalFilter, set: setApprovalFilter, options: ['Approved', 'Pending'], all: 'Any status' },
        ].map((f) => (
          <div key={f.id}>
            <label htmlFor={f.id} className="block text-xs font-semibold text-slate-700 mb-1">
              {f.label}
            </label>
            <select id={f.id} value={f.value} onChange={(e) => f.set(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-white">
              <option value="all">{f.all}</option>
              {f.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">Institutions</caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                <th scope="col" className="py-3 px-4 font-semibold">Institution</th>
                <th scope="col" className="py-3 px-4 font-semibold">Code</th>
                <th scope="col" className="py-3 px-4 font-semibold">Type</th>
                <th scope="col" className="py-3 px-4 font-semibold">AICTE approval</th>
                <th scope="col" className="py-3 px-4 font-semibold text-right">Programmes</th>
                <th scope="col" className="py-3 px-4 font-semibold text-right">Capacity</th>
                <th scope="col" className="py-3 px-4 font-semibold text-right">Enrolled</th>
                <th scope="col" className="py-3 px-4 font-semibold text-right">Flagged</th>
                <th scope="col" className="py-3 px-4"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <SkeletonRows cols={9} rows={6} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <EmptyState title="No institutions match" hint="Clear the search or filters." />
                  </td>
                </tr>
              ) : (
                filtered.map((i) => {
                  const cap = capacityOf(programmes[i.id]);
                  const enr = enrolledOf(i.id);
                  return (
                    <tr key={i.id} className="align-top">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{i.name}</p>
                        <p className="text-slate-500">
                          {[i.city, i.state].filter(Boolean).join(', ')}
                          {i.established_year ? ` · Est. ${i.established_year}` : ''}
                        </p>
                      </td>
                      <td className="py-3 px-4 font-mono whitespace-nowrap">{i.aicte_id}</td>
                      <td className="py-3 px-4">{i.type || '—'}</td>
                      <td className="py-3 px-4">
                        <ApprovalBadge status={i.approval_status} validTill={i.approval_valid_till} />
                        {i.approval_reference && <p className="text-[11px] text-slate-500 mt-1 font-mono">{i.approval_reference}</p>}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">{programmes[i.id]?.length ?? '—'}</td>
                      <td className="py-3 px-4 text-right font-mono">{cap.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right font-mono">
                        {enr.toLocaleString('en-IN')}
                        {cap > 0 && <span className="block text-[11px] text-slate-500">{Math.round((enr / cap) * 100)}% filled</span>}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">{stats[i.id]?.issues_count ?? '—'}</td>
                      <td className="py-3 px-4">
                        <button type="button" onClick={() => setSelected(i)} className="text-blue-700 font-semibold hover:underline whitespace-nowrap">
                          View details<span className="sr-only"> for {i.name}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.name || 'Institution'} maxWidth="3xl">
        {selected && (
          <div className="space-y-5 text-xs">
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
              <div><dt className="text-slate-500">Institution code</dt><dd className="font-mono font-semibold">{selected.aicte_id}</dd></div>
              <div><dt className="text-slate-500">Type</dt><dd className="font-semibold">{selected.type || '—'}</dd></div>
              <div><dt className="text-slate-500">Established</dt><dd className="font-semibold">{selected.established_year || '—'}</dd></div>
              <div className="sm:col-span-2"><dt className="text-slate-500">Address</dt><dd className="font-semibold">{[selected.address, selected.city, selected.state].filter(Boolean).join(', ')}</dd></div>
              <div><dt className="text-slate-500">Contact</dt><dd className="font-semibold break-all">{selected.contact_email || '—'}</dd></div>
              <div className="sm:col-span-2"><dt className="text-slate-500">Affiliation</dt><dd className="font-semibold">{selected.affiliating_university || '—'}</dd></div>
              <div>
                <dt className="text-slate-500">AICTE approval</dt>
                <dd className="mt-0.5"><ApprovalBadge status={selected.approval_status} validTill={selected.approval_valid_till} /></dd>
              </div>
              <div className="sm:col-span-3">
                <dt className="text-slate-500">Approval reference</dt>
                <dd className="font-mono font-semibold">{selected.approval_reference || 'Not yet issued'}</dd>
                <dd className="text-[11px] text-slate-500 mt-0.5">As submitted by the institution; not yet checked against AICTE records.</dd>
              </div>
            </dl>
            <div>
              <h3 className="font-bold text-slate-900 mb-2">Programmes and seat allocation (2025-26)</h3>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                      <th scope="col" className="py-2 px-3 font-semibold">Programme</th>
                      <th scope="col" className="py-2 px-3 font-semibold">Degree</th>
                      <th scope="col" className="py-2 px-3 font-semibold text-right">Approved</th>
                      <th scope="col" className="py-2 px-3 font-semibold text-right">Supernumerary</th>
                      <th scope="col" className="py-2 px-3 font-semibold text-right">NRI</th>
                      <th scope="col" className="py-2 px-3 font-semibold text-right">Total</th>
                      <th scope="col" className="py-2 px-3 font-semibold text-right">Enrolled</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(programmes[selected.id] || []).map((p: any) => {
                      const total = p.approved_intake + p.supernumerary_seats + p.nri_seats;
                      const enr = intake[selected.id]?.[p.id] ?? 0;
                      return (
                        <tr key={p.id}>
                          <td className="py-2 px-3"><span className="font-mono font-semibold">{p.code}</span> {p.name}</td>
                          <td className="py-2 px-3">{p.degree_type}</td>
                          <td className="py-2 px-3 text-right font-mono">{p.approved_intake}</td>
                          <td className="py-2 px-3 text-right font-mono">{p.supernumerary_seats}</td>
                          <td className="py-2 px-3 text-right font-mono">{p.nri_seats}</td>
                          <td className="py-2 px-3 text-right font-mono font-semibold">{total}</td>
                          <td className={`py-2 px-3 text-right font-mono ${enr > total ? 'text-amber-800 font-bold' : ''}`}>{enr}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
