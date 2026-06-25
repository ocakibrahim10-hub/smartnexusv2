'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { toast, type ToastEvent } from '@/lib/toast';

const ICONS = {
  success: <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />,
  error: <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />,
  info: <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />,
};

const BARS = {
  success: 'bg-emerald-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  warning: 'bg-amber-500',
};

export function Toaster() {
  const [toasts, setToasts] = useState<ToastEvent[]>([]);

  useEffect(() => {
    return toast.subscribe((event) => {
      setToasts((prev) => [...prev, event]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== event.id));
      }, event.duration ?? 4000);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Bildirimler"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className="relative overflow-hidden flex items-start gap-3 bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 min-w-[280px] max-w-sm pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          {ICONS[t.type]}
          <p className="text-sm text-gray-800 flex-1 leading-snug">{t.message}</p>
          <button
            aria-label="Bildirimi kapat"
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 -mr-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          {/* Progress bar */}
          <span
            className={`absolute bottom-0 left-0 h-0.5 ${BARS[t.type]} animate-progress`}
            style={{ animationDuration: `${t.duration ?? 4000}ms` }}
          />
        </div>
      ))}
    </div>
  );
}
