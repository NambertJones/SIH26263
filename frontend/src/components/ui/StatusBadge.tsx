import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const normStatus = (status || '').toLowerCase().trim();

  let bgClass = 'bg-slate-800 text-slate-300 border-slate-700';
  let dotColor = 'bg-slate-400';
  let label = status;

  if (['valid', 'resolved', 'active', 'approved'].includes(normStatus)) {
    bgClass = 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60';
    dotColor = 'bg-emerald-400';
    label = normStatus === 'valid' ? 'Valid' : normStatus === 'resolved' ? 'Resolved' : 'Active';
  } else if (['invalid', 'error', 'rejected'].includes(normStatus)) {
    bgClass = 'bg-rose-950/70 text-rose-300 border-rose-700/60';
    dotColor = 'bg-rose-400';
    label = normStatus === 'invalid' ? 'Invalid Format' : normStatus === 'rejected' ? 'Rejected' : 'Error';
  } else if (['duplicate', 'dup_apaar'].includes(normStatus)) {
    bgClass = 'bg-amber-950/70 text-amber-300 border-amber-700/60';
    dotColor = 'bg-amber-400';
    label = 'Duplicate';
  } else if (['warning', 'pending', 'clarification_requested'].includes(normStatus)) {
    bgClass = 'bg-amber-900/40 text-amber-200 border-amber-600/50';
    dotColor = 'bg-amber-400';
    label = normStatus === 'warning' ? 'Warning' : 'Pending';
  } else if (['under_review', 'open', 'mapping', 'uploaded'].includes(normStatus)) {
    bgClass = 'bg-sky-950/70 text-sky-300 border-sky-700/60';
    dotColor = 'bg-sky-400';
    label = normStatus === 'under_review' ? 'Under Review' : normStatus === 'open' ? 'Open' : normStatus;
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${bgClass} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span className="capitalize">{label}</span>
    </span>
  );
};
