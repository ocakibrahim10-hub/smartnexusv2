'use client';

import { useEffect } from 'react';
import { resetStaleClientState } from '@/lib/reset-client-state';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    resetStaleClientState();
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FBF8FF] px-4">
      <div className="max-w-md w-full bg-white border border-[#EFEDF4] rounded-2xl p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-[#1B1B1F] mb-2">Sayfa yüklenemedi</h1>
        <p className="text-sm text-gray-600 mb-6">
          Önbellek veya oturum verisi bozulmuş olabilir. Aşağıdaki düğmeyle tekrar deneyin.
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              resetStaleClientState().finally(() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/isletme';
              });
            }}
            className="w-full py-3 rounded-xl bg-[#606BDF] text-white font-medium hover:opacity-90"
          >
            Önbelleği temizle ve girişe git
          </button>
          <button
            type="button"
            onClick={() => reset()}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-800"
          >
            Tekrar dene
          </button>
        </div>
      </div>
    </div>
  );
}
