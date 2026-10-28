import React, { useEffect, useState } from 'react';
import { institutionsApi, studentsApi } from '../api/client';
import { Modal } from './ui/Modal';
import { useToast } from '../contexts/ToastContext';

interface Props {
  isOpen: boolean;
  institutionId: string;
  onClose: () => void;
  onCreated: (studentId: string) => void;
}

const EMPTY = { name: '', institute_roll_no: '', programme_id: '', apaar_id: '', date_of_birth: '', gender: '', enrollment_date: '', email: '', phone: '' };

/** Manual entry of one student. The server applies the same checks as a file upload and opens a case if needed. */
export const AddStudentModal: React.FC<Props> = ({ isOpen, institutionId, onClose, onCreated }) => {
  const { notify } = useToast();
  const [form, setForm] = useState({ ...EMPTY });
  const [programmes, setProgrammes] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && institutionId) institutionsApi.getProgrammes(institutionId).then(setProgrammes).catch(() => setProgrammes([]));
  }, [isOpen, institutionId]);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: any = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''));
      const res = await studentsApi.create(payload);
      notify(
        res.validation_status === 'valid'
          ? 'Student added. The record passes all checks.'
          : `Student added with issues: ${res.issues.join(' ')}${res.case_opened ? ' A review case was opened.' : ''}`,
        res.validation_status === 'valid' ? 'success' : 'info',
      );
      setForm({ ...EMPTY });
      onCreated(res.student_id);
    } catch (err: any) {
      setError(err.message || 'Could not add the student');
    } finally {
      setSaving(false);
    }
  };

  const field = (id: keyof typeof EMPTY, label: string, type = 'text', required = false) => (
    <div>
      <label htmlFor={`add-${id}`} className="block text-xs font-semibold text-slate-700 mb-1">
        {label} {required && <span className="text-rose-600">*</span>}
      </label>
      <input id={`add-${id}`} type={type} required={required} value={form[id]} onChange={set(id)}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-600" />
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add a student" maxWidth="xl">
      <form onSubmit={submit} className="space-y-3 text-xs">
        {error && <p role="alert" className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-800">{error}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {field('name', 'Student name', 'text', true)}
          {field('institute_roll_no', 'Roll number', 'text', true)}
          <div>
            <label htmlFor="add-programme_id" className="block text-xs font-semibold text-slate-700 mb-1">
              Programme <span className="text-rose-600">*</span>
            </label>
            <select id="add-programme_id" required value={form.programme_id} onChange={set('programme_id')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white">
              <option value="">Select a programme</option>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
              ))}
            </select>
          </div>
          {field('apaar_id', 'APAAR ID (12 digits)')}
          {field('date_of_birth', 'Date of birth', 'date')}
          <div>
            <label htmlFor="add-gender" className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
            <select id="add-gender" value={form.gender} onChange={set('gender')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white">
              <option value="">Not recorded</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
          {field('enrollment_date', 'Admission date', 'date')}
          {field('email', 'Email', 'email')}
          {field('phone', 'Phone')}
        </div>
        <p className="text-slate-600">The record is checked with the institution's validation rules as soon as it is saved.</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 font-semibold">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50">
            {saving ? 'Saving…' : 'Add student'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
