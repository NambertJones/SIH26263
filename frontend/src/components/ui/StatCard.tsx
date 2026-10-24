import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
  colorBorder?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendType = 'neutral',
  colorBorder = 'border-slate-800',
}) => {
  return (
    <div
      className={`glass-panel p-5 rounded-xl border ${colorBorder} hover:border-slate-600 transition-all duration-200 flex flex-col justify-between`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        {icon && <div className="text-slate-400 p-2 rounded-lg bg-slate-800/60">{icon}</div>}
      </div>

      <div className="mt-4 flex items-baseline gap-3">
        <span className="text-3xl font-bold tracking-tight text-white">{value}</span>
        {trend && (
          <span
            className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
              trendType === 'positive'
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                : trendType === 'negative'
                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            {trend}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
};
