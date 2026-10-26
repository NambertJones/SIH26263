import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const normStatus = (status || '').toLowerCase().trim();

  let bgClass = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';
  let label = status;

  if (['valid', 'resolved', 'active', 'approved'].includes(normStatus)) {
    bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    dotColor = 'bg-emerald-500';
    label = normStatus === 'valid' ? 'Valid' : normStatus === 'resolved' ? 'Resolved' : 'Active';
  } else if (['invalid', 'error', 'rejected'].includes(normStatus)) {
    bgClass = 'bg-rose-50 text-rose-700 border-rose-200';
    dotColor = 'bg-rose-500';
    label = normStatus === 'invalid' ? 'Invalid Format' : normStatus === 'rejected' ? 'Rejected' : 'Error';
  } else if (['duplicate', 'dup_apaar'].includes(normStatus)) {
    bgClass = 'bg-amber-50 text-amber-700 border-amber-200';
    dotColor = 'bg-amber-500';
    label = 'Duplicate';
  } else if (['warning', 'pending', 'clarification_requested'].includes(normStatus)) {
    bgClass = 'bg-amber-50 text-amber-800 border-amber-200';
    dotColor = 'bg-amber-500';
    label = normStatus === 'warning' ? 'Warning' : 'Pending';
  } else if (['under_review', 'open', 'mapping', 'uploaded'].includes(normStatus)) {
    bgClass = 'bg-blue-50 text-blue-700 border-blue-200';
    dotColor = 'bg-blue-500';
    label = normStatus === 'under_review' ? 'Under Review' : normStatus === 'open' ? 'Open' : normStatus;
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${bgClass} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span className="capitalize">{label}</span>
    </span>
  );
};
