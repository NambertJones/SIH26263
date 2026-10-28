import React from 'react';
import { CheckCircle2, XCircle, Copy, Clock, AlertTriangle, CircleDot, Ban, Flag } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

type Style = { label: string; cls: string; icon: React.ElementType };

/** One badge for every record and case status: colour plus text plus icon, never colour alone. */
const STYLES: Record<string, Style> = {
  valid: { label: 'Passing checks', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: CheckCircle2 },
  active: { label: 'Active', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: CheckCircle2 },
  approved: { label: 'Active', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: CheckCircle2 },
  resolved: { label: 'Resolved', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: CheckCircle2 },
  invalid: { label: 'Invalid data', cls: 'bg-rose-50 text-rose-800 border-rose-200', icon: XCircle },
  error: { label: 'Error', cls: 'bg-rose-50 text-rose-800 border-rose-200', icon: XCircle },
  rejected: { label: 'Dismissed', cls: 'bg-slate-100 text-slate-700 border-slate-300', icon: Ban },
  duplicate: { label: 'Possible duplicate', cls: 'bg-amber-50 text-amber-900 border-amber-300', icon: Copy },
  dup_apaar: { label: 'Possible duplicate', cls: 'bg-amber-50 text-amber-900 border-amber-300', icon: Copy },
  warning: { label: 'Warning', cls: 'bg-amber-50 text-amber-900 border-amber-300', icon: AlertTriangle },
  pending: { label: 'Awaiting evidence', cls: 'bg-amber-50 text-amber-900 border-amber-300', icon: Clock },
  escalated: { label: 'Escalated', cls: 'bg-orange-50 text-orange-900 border-orange-300', icon: Flag },
  clarification_requested: { label: 'Awaiting evidence', cls: 'bg-amber-50 text-amber-900 border-amber-300', icon: Clock },
  under_review: { label: 'Under review', cls: 'bg-blue-50 text-blue-800 border-blue-200', icon: CircleDot },
  open: { label: 'Open', cls: 'bg-blue-50 text-blue-800 border-blue-200', icon: CircleDot },
  mapping: { label: 'Mapping', cls: 'bg-blue-50 text-blue-800 border-blue-200', icon: CircleDot },
  uploaded: { label: 'Uploaded', cls: 'bg-blue-50 text-blue-800 border-blue-200', icon: CircleDot },
  submitted: { label: 'Submitted', cls: 'bg-blue-50 text-blue-800 border-blue-200', icon: CircleDot },
  skipped: { label: 'Skipped (already on record)', cls: 'bg-slate-100 text-slate-600 border-slate-300', icon: Ban },
  accepted: { label: 'Accepted by reviewer', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: CheckCircle2 },
  dismissed: { label: 'Dismissed', cls: 'bg-slate-100 text-slate-700 border-slate-300', icon: Ban },
  superseded: { label: 'Superseded by correction', cls: 'bg-slate-100 text-slate-600 border-slate-300', icon: CircleDot },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const key = (status || '').toLowerCase().trim();
  const style: Style = STYLES[key] || {
    label: key ? key.replace(/_/g, ' ') : 'Unknown',
    cls: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: CircleDot,
  };
  const Icon = style.icon;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1 font-semibold rounded-full border whitespace-nowrap ${style.cls} ${sizeClasses}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{style.label}</span>
    </span>
  );
};
