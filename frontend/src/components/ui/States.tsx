import React from 'react';
import { AlertTriangle, Inbox, Lock, RefreshCw } from 'lucide-react';

/** Shown when a request fails, instead of silently rendering zeros. */
export const ErrorBanner: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div role="alert" className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm flex items-start gap-3">
    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
    <div className="flex-1">
      <p className="font-semibold">Could not load this data</p>
      <p className="text-xs mt-0.5">{message}</p>
    </div>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-300 bg-white text-xs font-semibold hover:bg-rose-100"
      >
        <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
        Retry
      </button>
    )}
  </div>
);

/** Explains why a list is empty and what to do next. */
export const EmptyState: React.FC<{ title: string; hint?: string; action?: React.ReactNode }> = ({ title, hint, action }) => (
  <div className="py-10 px-4 text-center text-slate-600">
    <Inbox className="w-8 h-8 mx-auto text-slate-400" aria-hidden="true" />
    <p className="mt-2 text-sm font-semibold text-slate-800">{title}</p>
    {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    {action && <div className="mt-3">{action}</div>}
  </div>
);

export const Forbidden: React.FC<{ message?: string }> = ({ message }) => (
  <div className="py-16 text-center text-slate-600">
    <Lock className="w-8 h-8 mx-auto text-slate-400" aria-hidden="true" />
    <p className="mt-2 text-sm font-semibold text-slate-800">You don&apos;t have access to this page</p>
    <p className="mt-1 text-xs">{message || 'Your role does not include this function. Ask an administrator if you need it.'}</p>
  </div>
);

/** Placeholder rows while a table loads (avoids layout jumps). */
export const SkeletonRows: React.FC<{ rows?: number; cols: number }> = ({ rows = 6, cols }) => (
  <>
    {Array.from({ length: rows }).map((_, r) => (
      <tr key={r} aria-hidden="true">
        {Array.from({ length: cols }).map((__, c) => (
          <td key={c} className="py-3 px-4">
            <div className="h-3 rounded bg-slate-200/80 animate-pulse" />
          </td>
        ))}
      </tr>
    ))}
  </>
);

export const PageLoading: React.FC<{ label?: string }> = ({ label = 'Loading…' }) => (
  <div className="flex items-center justify-center h-64 gap-3 text-sm text-slate-500" role="status">
    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-600" aria-hidden="true" />
    {label}
  </div>
);
