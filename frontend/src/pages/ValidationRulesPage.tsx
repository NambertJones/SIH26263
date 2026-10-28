import React, { useCallback, useEffect, useState } from 'react';
import { SlidersHorizontal, Lock, Save } from 'lucide-react';
import { rulesApi } from '../api/client';
import { ErrorBanner, PageLoading } from '../components/ui/States';
import { useToast } from '../contexts/ToastContext';

type Config = {
  required_fields: string[];
  age_check: { enabled: boolean; min_age: number; review_below_age: number };
  gender_format: { enabled: boolean; severity: 'warning' | 'error' };
  email_format: { enabled: boolean; severity: 'warning' | 'error' };
  admission_date_check: { enabled: boolean };
};

/** Institution admin sets which checks run on uploads. Staff and reviewers can see the rules but not change them. */
export const ValidationRulesPage: React.FC = () => {
  const { notify } = useToast();
  const [data, setData] = useState<any>(null);
  const [cfg, setCfg] = useState<Config | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await rulesApi.get();
      setData(res);
      setCfg(res.config);
    } catch (err: any) {
      setError(err.message || 'Request failed');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorBanner message={error} onRetry={load} />;
  if (!data || !cfg) return <PageLoading label="Loading validation rules…" />;

  const editable: boolean = data.can_edit;
  const dirty = JSON.stringify(cfg) !== JSON.stringify(data.config);
  const set = (patch: Partial<Config>) => setCfg({ ...cfg, ...patch });

  const save = async () => {
    setSaving(true);
    try {
      const res = await rulesApi.save(cfg);
      setData({ ...data, config: res.config });
      setCfg(res.config);
      notify(res.changed.length ? 'Validation rules saved. They apply to the next validation run.' : 'No changes to save.', 'success');
    } catch (err: any) {
      notify(err.message || 'Could not save rules', 'error');
    } finally {
      setSaving(false);
    }
  };

  const Toggle: React.FC<{ id: string; checked: boolean; onChange: (v: boolean) => void; label: string }> = ({ id, checked, onChange, label }) => (
    <label htmlFor={id} className="inline-flex items-center gap-2 cursor-pointer">
      <input id={id} type="checkbox" checked={checked} disabled={!editable} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 accent-blue-600" />
      <span className="font-semibold text-slate-900">{label}</span>
    </label>
  );

  const Severity: React.FC<{ id: string; value: string; onChange: (v: 'warning' | 'error') => void; disabled: boolean }> = ({ id, value, onChange, disabled }) => (
    <select
      id={id}
      aria-label="Severity"
      value={value}
      disabled={!editable || disabled}
      onChange={(e) => onChange(e.target.value as 'warning' | 'error')}
      className="border border-slate-300 rounded-lg px-2 py-1 text-xs bg-white disabled:bg-slate-100"
    >
      <option value="warning">Warning (record accepted, flagged)</option>
      <option value="error">Error (record rejected)</option>
    </select>
  );

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-blue-600" aria-hidden="true" />
            Validation Rules
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Checks applied when college staff validate an uploaded file. Changes apply to the next validation run; records already
            validated are not changed.
            {!editable && ' Only the institution admin can change these settings.'}
          </p>
        </div>
        {editable && (
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            title={!dirty ? 'No changes to save' : undefined}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" aria-hidden="true" />
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        )}
      </div>

      <section className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 text-xs">
        <h2 className="text-sm font-bold text-slate-900">Mandatory fields</h2>
        <p className="text-slate-600">A record missing a mandatory field is rejected with a “Missing mandatory field” error.</p>
        <div className="flex flex-wrap gap-2">
          {data.catalogue.always_required.map((f: any) => (
            <span key={f.field} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-700 font-semibold">
              <Lock className="w-3 h-3" aria-hidden="true" /> {f.label}
            </span>
          ))}
        </div>
        <fieldset className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
          <legend className="sr-only">Optional mandatory fields</legend>
          {data.catalogue.optional_required.map((f: any) => (
            <label key={f.field} className="inline-flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50">
              <input
                type="checkbox"
                className="w-4 h-4 accent-blue-600"
                disabled={!editable}
                checked={cfg.required_fields.includes(f.field)}
                onChange={(e) =>
                  set({
                    required_fields: e.target.checked
                      ? [...cfg.required_fields, f.field]
                      : cfg.required_fields.filter((x) => x !== f.field),
                  })
                }
              />
              {f.label}
            </label>
          ))}
        </fieldset>
      </section>

      <section className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 text-xs">
        <h2 className="text-sm font-bold text-slate-900">Configurable checks</h2>

        <div className="p-3 rounded-lg border border-slate-200 space-y-2">
          <Toggle id="age" label="Age plausibility" checked={cfg.age_check.enabled} onChange={(v) => set({ age_check: { ...cfg.age_check, enabled: v } })} />
          <div className="flex flex-wrap items-center gap-4 pl-6 text-slate-700">
            <label className="inline-flex items-center gap-2">
              Reject if younger than
              <input type="number" min={10} max={30} disabled={!editable || !cfg.age_check.enabled}
                value={cfg.age_check.min_age}
                onChange={(e) => set({ age_check: { ...cfg.age_check, min_age: Number(e.target.value) } })}
                className="w-16 border border-slate-300 rounded px-2 py-1 disabled:bg-slate-100" />
              years
            </label>
            <label className="inline-flex items-center gap-2">
              Flag for review if younger than
              <input type="number" min={10} max={35} disabled={!editable || !cfg.age_check.enabled}
                value={cfg.age_check.review_below_age}
                onChange={(e) => set({ age_check: { ...cfg.age_check, review_below_age: Number(e.target.value) } })}
                className="w-16 border border-slate-300 rounded px-2 py-1 disabled:bg-slate-100" />
              years
            </label>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Toggle id="gender" label="Gender value check" checked={cfg.gender_format.enabled} onChange={(v) => set({ gender_format: { ...cfg.gender_format, enabled: v } })} />
            <p className="pl-6 text-slate-600">Allowed: Male, Female, Other, Transgender, Non-binary.</p>
          </div>
          <Severity id="gender-sev" value={cfg.gender_format.severity} disabled={!cfg.gender_format.enabled}
            onChange={(v) => set({ gender_format: { ...cfg.gender_format, severity: v } })} />
        </div>

        <div className="p-3 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Toggle id="email" label="Email format check" checked={cfg.email_format.enabled} onChange={(v) => set({ email_format: { ...cfg.email_format, enabled: v } })} />
            <p className="pl-6 text-slate-600">Must look like name@domain.</p>
          </div>
          <Severity id="email-sev" value={cfg.email_format.severity} disabled={!cfg.email_format.enabled}
            onChange={(v) => set({ email_format: { ...cfg.email_format, severity: v } })} />
        </div>

        <div className="p-3 rounded-lg border border-slate-200">
          <Toggle id="admission" label="Admission date consistency" checked={cfg.admission_date_check.enabled}
            onChange={(v) => set({ admission_date_check: { enabled: v } })} />
          <p className="pl-6 text-slate-600">Admission date must be after the date of birth and not in the future.</p>
        </div>
      </section>

      <section className="bg-white p-5 rounded-xl border border-slate-200 space-y-2 text-xs">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <Lock className="w-4 h-4 text-slate-500" aria-hidden="true" /> Always-on integrity checks
        </h2>
        <p className="text-slate-600">These protect against duplicate enrolment and over-admission and cannot be switched off.</p>
        <ul className="list-disc pl-5 text-slate-800 space-y-1">
          {data.catalogue.locked_rules.map((r: any) => (
            <li key={r.code}>{r.label}</li>
          ))}
        </ul>
      </section>
    </div>
  );
};
