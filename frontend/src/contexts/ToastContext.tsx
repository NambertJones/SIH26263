import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  notify: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const STYLES: Record<ToastKind, { box: string; icon: React.ReactNode }> = {
  success: { box: 'bg-emerald-50 border-emerald-300 text-emerald-900', icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" /> },
  error: { box: 'bg-rose-50 border-rose-300 text-rose-900', icon: <AlertTriangle className="w-4 h-4 text-rose-600" aria-hidden="true" /> },
  info: { box: 'bg-blue-50 border-blue-300 text-blue-900', icon: <Info className="w-4 h-4 text-blue-600" aria-hidden="true" /> },
};

/** Replaces window.alert(): non-blocking messages announced to screen readers. */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  const notify = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => dismiss(id), kind === 'error' ? 8000 : 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div aria-live="polite" role="status" className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)]">
        {toasts.map((t) => (
          <div key={t.id} className={`flex items-start gap-2 p-3 rounded-lg border shadow-md text-sm ${STYLES[t.kind].box}`}>
            <span className="mt-0.5">{STYLES[t.kind].icon}</span>
            <span className="flex-1">{t.message}</span>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="opacity-70 hover:opacity-100">
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};
