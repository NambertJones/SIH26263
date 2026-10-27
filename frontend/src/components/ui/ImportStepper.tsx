import React from 'react';
import { Check } from 'lucide-react';

export const IMPORT_STEPS = [
  'Select file',
  'Map columns',
  'Validate',
  'Review & submit',
  'Done',
] as const;

/** Shared 5-step progress indicator for the bulk import flow (upload → mapping → validation). */
export const ImportStepper: React.FC<{ current: number }> = ({ current }) => (
  <nav aria-label="Import progress" className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
    <ol className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-xs">
      {IMPORT_STEPS.map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <li key={label} className="flex items-center gap-2" aria-current={active ? 'step' : undefined}>
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold border ${
                done
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : active
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}
            >
              {done ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : step}
            </span>
            <span className={active ? 'font-bold text-blue-800' : done ? 'font-semibold text-emerald-800' : 'text-slate-500'}>
              {label}
              {done && <span className="sr-only"> (completed)</span>}
            </span>
            {step < IMPORT_STEPS.length && <span className="hidden sm:block h-0.5 w-8 bg-slate-200" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  </nav>
);
