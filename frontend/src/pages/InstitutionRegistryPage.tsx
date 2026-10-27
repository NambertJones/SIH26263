import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Landmark, Search } from 'lucide-react';
import { institutionsApi, reportsApi } from '../api/client';
import { Modal } from '../components/ui/Modal';
import { EmptyState, ErrorBanner, SkeletonRows } from '../components/ui/States';

const SourceTag: React.FC = () => (
  <span className="px-1.5 py-0.5 rounded border bg-violet-50 border-violet-200 text-violet-800 text-[11px] font-semibold">
    Synthetic (demo)
  </span>
);

/** Oversight view of all demo institutions. Approval status is shown only if confirmed from a source — never assumed. */
export const InstitutionRegistryPage: React.FC = () => {
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [stats, setStats] = useState<Record<string, any>>({});
  const [programmes, setProgrammes] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [insts, wise] = await Promise.all([institutionsApi.list(), reportsApi.getInstitutionWise()]);
      setInstitutions(insts);
      setStats(Object.fromEntries(wise.map((w: any) => [w.institution_id, w])));
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

  const types = useMemo(() => Array.from(new Set(institutions.map((i) => i.type).filter(Boolean))), [institutions]);
  const filtered = institutions.filter((i) => {
    const text = `${i.name} ${i.aicte_id} ${i.city} ${i.state}`.toLowerCase();
    return (!q || text.includes(q.toLowerCase())) && (typeFilter === 'all' || i.type === typeFilter);
  });

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Landmark className="w-5 h-5 text-blue-600" aria-hidden="true" />
          Institution Registry
        </h1>
        <p className="text-xs text-slate-600 mt-1 max-w-3xl">
          Demo institutions in this prototype. Institution codes, programmes and intake figures are synthetic. AICTE approval is
          shown as &ldquo;Not confirmed&rdquo; because no authoritative approval source is connected.
        </p>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="inst-search" className="block text-xs font-semibold text-slate-700 mb-1">
            Search name, code or location
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" aria-hidden="true" />
            <input id="inst-search" value={q} onChange={(e) => setQ(e.target.value)} className="w-full border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs" />
          </div>
        </div>
        <div>
          <label htmlFor="inst-type" className="block text-xs font-semibold text-slate-700 mb-1">
            Type
          </label>
          <select id="inst-type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-white">
            <option value="all">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">Demo institutions</caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                <th scope="col" className="py-3 px-4 font-semibold">Institution</th>
                <th scope="col" className="py-3 px-4 font-semibold">Code</th>
                <th scope="col" className="py-3 px-4 font-semibold">Type</th>
                <th scope="col" className="py-3 px-4 font-semibold">Location</th>
                <th scope="col" className="py-3 px-4 font-semibold">Approval status</th>
                <th scope="col" className="py-3 px-4 font-semibold">Source</th>
                <th scope="col" className="py-3 px-4 font-semibold text-right">Programmes</th>
                <th scope="col" className="py-3 px-4 font-semibold text-right">Records</th>
                <th scope="col" className="py-3 px-4 font-semibold text-right">Flagged</th>
                <th scope="col" className="py-3 px-4"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <SkeletonRows cols={10} rows={4} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10}>
                    <EmptyState title="No institutions match" hint="Clear the search or type filter." />
                  </td>
                </tr>
              ) : (
                filtered.map((i) => (
                  <tr key={i.id}>
                    <td className="py-3 px-4 font-semibold text-slate-900">{i.name}</td>
                    <td className="py-3 px-4 font-mono">{i.aicte_id}</td>
                    <td className="py-3 px-4">{i.type || '—'}</td>
                    <td className="py-3 px-4">{[i.city, i.state].filter(Boolean).join(', ') || '—'}</td>
                    <td className="py-3 px-4">
                      <span className="px-1.5 py-0.5 rounded border bg-slate-100 border-slate-300 text-slate-700 text-[11px] font-semibold">
                        Not confirmed
                      </span>
                    </td>
                    <td className="py-3 px-4"><SourceTag /></td>
                    <td className="py-3 px-4 text-right font-mono">{programmes[i.id]?.length ?? '—'}</td>
                    <td className="py-3 px-4 text-right font-mono">{stats[i.id]?.total_students ?? '—'}</td>
                    <td className="py-3 px-4 text-right font-mono">{stats[i.id]?.issues_count ?? '—'}</td>
                    <td className="py-3 px-4">
                      <button type="button" onClick={() => setSelected(i)} className="text-blue-700 font-semibold hover:underline whitespace-nowrap">
                        View details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.name || 'Institution'} maxWidth="3xl">
        {selected && (
          <div className="space-y-4 text-xs">
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div><dt className="text-slate-500">Code (synthetic)</dt><dd className="font-mono font-semibold">{selected.aicte_id}</dd></div>
              <div><dt className="text-slate-500">Type</dt><dd className="font-semibold">{selected.type || '—'}</dd></div>
              <div><dt className="text-slate-500">Location</dt><dd className="font-semibold">{[selected.city, selected.state].filter(Boolean).join(', ')}</dd></div>
              <div><dt className="text-slate-500">AICTE approval</dt><dd className="font-semibold">Not confirmed from an authoritative source</dd></div>
            </dl>
            <div>
              <h3 className="font-bold text-slate-900 mb-2">Programmes and intake reference (demo)</h3>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                      <th scope="col" className="py-2 px-3 font-semibold">Code</th>
                      <th scope="col" className="py-2 px-3 font-semibold">Programme</th>
                      <th scope="col" className="py-2 px-3 font-semibold">Year</th>
                      <th scope="col" className="py-2 px-3 font-semibold text-right">Approved</th>
                      <th scope="col" className="py-2 px-3 font-semibold text-right">Supernumerary</th>
                      <th scope="col" className="py-2 px-3 font-semibold text-right">NRI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(programmes[selected.id] || []).map((p: any) => (
                      <tr key={p.id}>
                        <td className="py-2 px-3 font-mono">{p.code}</td>
                        <td className="py-2 px-3">{p.name}</td>
                        <td className="py-2 px-3 font-mono">{p.academic_year}</td>
                        <td className="py-2 px-3 text-right font-mono">{p.approved_intake}</td>
                        <td className="py-2 px-3 text-right font-mono">{p.supernumerary_seats}</td>
                        <td className="py-2 px-3 text-right font-mono">{p.nri_seats}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-slate-500">Source: synthetic programme records created for the demo. Not sourced from AICTE.</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
