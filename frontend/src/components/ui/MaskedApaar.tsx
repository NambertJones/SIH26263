import React, { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { studentsApi } from '../../api/client';
import { Modal } from './Modal';
import { useToast } from '../../contexts/ToastContext';

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  FORMAT_VALID: { text: 'Format OK — not verified', cls: 'bg-slate-100 text-slate-700 border-slate-300' },
  FORMAT_INVALID: { text: 'Format invalid', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  MISSING: { text: 'Missing', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
};

export const ApaarStatusBadge: React.FC<{ status?: string }> = ({ status }) => {
  const s = STATUS_LABEL[status || ''];
  if (!s) return null;
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${s.cls}`}>{s.text}</span>;
};

interface MaskedApaarProps {
  studentId: string;
  masked: string;
  status?: string;
  canReveal?: boolean;
}

/**
 * Shows the masked APAAR ID. Permitted roles can reveal the full value for 30 seconds
 * after giving a reason; the server records the reveal in the audit trail.
 */
export const MaskedApaar: React.FC<MaskedApaarProps> = ({ studentId, masked, status, canReveal }) => {
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [full, setFull] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!full) return;
    if (secondsLeft <= 0) {
      setFull(null);
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [full, secondsLeft]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await studentsApi.revealApaar(studentId, reason.trim());
      setFull(res.apaar_id);
      setSecondsLeft(res.visible_seconds || 30);
      setOpen(false);
      setReason('');
      notify('Full APAAR ID shown for 30 seconds. This view was recorded in the audit trail.', 'info');
    } catch (err: any) {
      notify(err.message || 'Could not reveal the APAAR ID', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-2 flex-wrap">
      <strong className="font-mono text-blue-800">{full ?? masked}</strong>
      <ApaarStatusBadge status={status} />
      {canReveal && !full && status !== 'MISSING' && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
        >
          <Eye className="w-3.5 h-3.5" aria-hidden="true" /> Reveal
        </button>
      )}
      {full && (
        <button
          type="button"
          onClick={() => setFull(null)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:underline"
        >
          <EyeOff className="w-3.5 h-3.5" aria-hidden="true" /> Hide ({secondsLeft}s)
        </button>
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Reveal full APAAR ID" maxWidth="md">
        <form onSubmit={submit} className="space-y-4 text-sm">
          <p className="text-slate-600 text-xs">
            Full identifiers are hidden by default. Give the reason you need to see it. Your name, the time and the reason
            are recorded in the audit trail; the ID itself is not logged.
          </p>
          <div>
            <label htmlFor="reveal-reason" className="block text-xs font-semibold text-slate-700 mb-1">
              Reason (required)
            </label>
            <textarea
              id="reveal-reason"
              required
              minLength={5}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Matching against the student's admission form"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold">
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || reason.trim().length < 5}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold disabled:opacity-50"
              title={reason.trim().length < 5 ? 'Enter a reason of at least 5 characters' : undefined}
            >
              {busy ? 'Recording…' : 'Reveal for 30 seconds'}
            </button>
          </div>
        </form>
      </Modal>
    </span>
  );
};
