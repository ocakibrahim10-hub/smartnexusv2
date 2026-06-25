'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PricingCatalogPreview from '@/components/pricing/PricingCatalogPreview';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function FiyatlandirmaPage() {
  const [pricing, setPricing] = useState<any>(null);

  useEffect(() => {
    fetch(`${API}/platform/pricing/public`)
      .then((r) => r.json())
      .then(setPricing)
      .catch(() => setPricing(null));
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
            İşletmenize uygun yıllık abonelik planını seçin. POS, API ve pazaryeri ek paketleri yıllık
            abonelikle; e-Fatura ve SMS kontör ile kullanılır.
          </p>
        </div>

        {pricing ? (
          <PricingCatalogPreview
            plans={pricing.plans}
            addons={pricing.addons}
            kontorModules={pricing.kontorModules}
            showCta
            ctaHref="/kayit"
            kontorLoginHref="/"
          />
        ) : (
          <p className="text-center text-gray-500">Fiyat listesi yükleniyor…</p>
        )}
      </main>
    </div>
  );
}
