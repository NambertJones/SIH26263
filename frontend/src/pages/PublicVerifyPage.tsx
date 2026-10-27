import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';
import { publicApi } from '../api/client';
import { SiteFooter } from '../components/ui/DisclaimerBar';

/** Public certificate check for employers and other regulators (Requirement 5). */
export const PublicVerifyPage: React.FC = () => {
  const { certId = '' } = useParams();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    publicApi
      .verify(certId)
      .then(setData)
      .catch((err) => setError(err?.status === 404 ? 'No record found for this certificate number.' : 'Verification service is unavailable. Please try again.'));
  }, [certId]);

  const valid = data?.result === 'VALID';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
        <div>
          <p className="text-[11px] font-semibold tracking-wide text-blue-700 uppercase">APAAR ReconX · Record Verification</p>
          <p className="font-mono text-xs text-slate-500 mt-1 break-all">{certId}</p>
        </div>

        {!data && !error && (
          <div className="flex items-center gap-2 text-slate-600 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Checking record…
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {data && (
          <>
            <div
              className={`flex items-center gap-3 p-4 rounded-xl border text-sm font-semibold ${
                valid ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              {valid ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
              <span>{valid ? 'Record found — passed APAAR ReconX data checks' : 'Record found — has not passed data checks'}</span>
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-slate-500">Student</dt>
              <dd className="font-semibold text-slate-900">{data.student_name}</dd>
              <dt className="text-slate-500">APAAR ID</dt>
              <dd className="font-mono text-slate-900">{data.apaar_id_masked}</dd>
              <dt className="text-slate-500">Institution</dt>
              <dd className="text-slate-900">{data.institution}</dd>
              <dt className="text-slate-500">Programme</dt>
              <dd className="text-slate-900">{data.programme || '—'}</dd>
              <dt className="text-slate-500">Academic year</dt>
              <dd className="text-slate-900">{data.academic_year || '—'}</dd>
              <dt className="text-slate-500">Status</dt>
              <dd className="text-slate-900 capitalize">{data.enrollment_status}</dd>
            </dl>

            <p className="text-[11px] text-slate-400 border-t border-slate-200 pt-3">
              {data.notice} Only minimum details are shown; date of birth and contact details are never disclosed.
            </p>
          </>
        )}
      </div>
    </div>
    <SiteFooter />
    </div>
  );
};
