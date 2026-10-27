import React from 'react';
import { Info } from 'lucide-react';

export const DISCLAIMER_TEXT =
  'Independent prototype for demonstration. Not an official AICTE or APAAR portal. Uses synthetic data and simulated verification.';

export const DisclaimerBar: React.FC = () => (
  <div
    role="note"
    className="w-full bg-amber-50 border-b border-amber-200 text-amber-900 text-xs font-medium px-4 py-1.5 flex items-center justify-center gap-2 text-center"
  >
    <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
    <span>{DISCLAIMER_TEXT}</span>
  </div>
);
