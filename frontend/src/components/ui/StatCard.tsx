import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
  colorBorder?: string;
  /** When set, the whole card links to the filtered list behind this number. */
  to?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendType = 'neutral',
  colorBorder = 'border-slate-200',
  to,
}) => {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</span>
        {icon && <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">{icon}</div>}
      </div>

      <div className="mt-4 flex items-baseline gap-3">
        <span className="text-3xl font-extrabold tracking-tight text-slate-900">{value}</span>
        {trend && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              trendType === 'positive'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : trendType === 'negative'
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            {trend}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-1.5 text-xs text-slate-500 font-medium">{subtitle}</p>}
      {to && (
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
          View records <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </span>
      )}
    </>
  );

  const cls = `bg-white p-5 rounded-xl border ${colorBorder} shadow-xs transition-all duration-200 flex flex-col justify-between`;

  if (to) {
    return (
      <Link
        to={to}
        className={`${cls} hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600`}
      >
        {body}
      </Link>
    );
  }
  return <div className={cls}>{body}</div>;
};
