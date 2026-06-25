'use client';

import React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Lock, Sparkles, Rocket, ArrowRight } from 'lucide-react';

export default function UpsellPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const path = searchParams.get('path') || 'Bu modül';

  return (
    <div className="flex h-full w-full items-center justify-center p-6 bg-slate-50/50">
      <div className="max-w-md w-full border-dashed border-2 border-slate-200 bg-white rounded-xl shadow-sm p-6">
        <div className="text-center space-y-4 mb-6">
          <div className="mx-auto bg-[#606BDF]/10 w-16 h-16 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-[#606BDF]" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Premium Özellik</h2>
          <p className="text-base text-slate-600">
            Erişmeye çalıştığınız <span className="font-semibold text-slate-800">{path}</span>{' '}
            modülü mevcut abonelik planınızda bulunmuyor.
          </p>
        </div>
        <div className="space-y-4 mb-8">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3">
            <h4 className="font-medium text-slate-700 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Neden Yükseltmelisiniz?
            </h4>
            <ul className="text-sm text-slate-600 space-y-2">
              <li className="flex items-start gap-2">
                <Rocket className="w-4 h-4 text-[#606BDF] shrink-0 mt-0.5" />
                <span>İşletmenizin tüm operasyonlarını tek bir merkezden yönetin.</span>
              </li>
              <li className="flex items-start gap-2">
                <Rocket className="w-4 h-4 text-[#606BDF] shrink-0 mt-0.5" />
                <span>Zaman kazandıran otomasyon ve yapay zeka özellikleri.</span>
              </li>
              <li className="flex items-start gap-2">
                <Rocket className="w-4 h-4 text-[#606BDF] shrink-0 mt-0.5" />
                <span>Sektörünüze özel gelişmiş raporlama yetenekleri.</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <button className="w-full font-semibold py-3 px-4 bg-[#606BDF] hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center transition-colors">
            Aboneliği Yükselt <ArrowRight className="w-4 h-4 ml-2" />
          </button>
          <button 
            className="w-full py-3 px-4 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors font-medium" 
            onClick={() => router.back()}
          >
            Geri Dön
          </button>
        </div>
      </div>
    </div>
  );
}
