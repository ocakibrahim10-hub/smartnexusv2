'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import PricingCatalogPreview from '@/components/pricing/PricingCatalogPreview';
import { PLAN_ORDER } from '@/lib/plans';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function FiyatlandirmaPage() {
  const [pricing, setPricing] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState('BASIC');
  const [extraCart, setExtraCart] = useState<string[]>([]);

  useEffect(() => {
    fetch(`${API}/platform/pricing/public`)
      .then((r) => r.json())
      .then(setPricing)
      .catch(() => setPricing(null));
  }, []);

  useEffect(() => {
    const allowed =
      pricing?.plans
        ?.find((p: any) => p.plan === selectedPlan)
        ?.purchasableExtraModules?.map((m: any) => m.moduleId) ?? [];
    if (allowed.length) {
      setExtraCart((prev) => prev.filter((id) => allowed.includes(id)));
    }
  }, [selectedPlan, pricing]);

  const toggleCart = useCallback((moduleId: string) => {
    setExtraCart((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId],
    );
  }, []);

  return (
    <div className="min-h-screen bg-[#FBF8FF]">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">
            Smart<span className="text-[#606BDF]">Nexus</span>
          </Link>
          <div className="flex gap-3">
            <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
              Giriş
            </Link>
            <Link
              href="/kayit"
              className="text-sm px-4 py-2 rounded-xl text-white bg-[#606BDF] font-medium"
            >
              Kayıt Ol
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Fiyatlandırma</h1>
          <p className="text-gray-500 mt-2 max-w-xl mx-auto">
            İşletmenize uygun yıllık abonelik planını seçin; pakete dahil olmayan modülleri sepete
            ekleyin. E-Fatura / E-Arşiv ortak kontör; SMS ayrı paketlerle satılır.
          </p>
        </div>

        {pricing ? (
          <PricingCatalogPreview
            pricing={pricing}
            selectedPlan={selectedPlan}
            onPlanChange={setSelectedPlan}
            extraCart={extraCart}
            onToggleExtraCart={toggleCart}
            showCta
            ctaHref="/kayit"
            kontorLoginHref="/isletme"
            extraCheckoutHref={`/kayit?plan=${selectedPlan}${extraCart.length ? `&extras=${extraCart.join(',')}` : ''}`}
            extraCheckoutLabel="Kayıt ol ve satın al"
          />
        ) : (
          <p className="text-center text-gray-500">Fiyat listesi yükleniyor…</p>
        )}
      </main>
    </div>
  );
}
