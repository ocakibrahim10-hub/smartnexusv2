'use client';

import { toast } from '@/lib/toast';
import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { platformApi } from '@/lib/api';
import { Coins, ShoppingCart } from 'lucide-react';
import { KONTOR_LOW_THRESHOLD } from '@/lib/plans';

type SummaryItem = {
  moduleCode: string;
  moduleName: string;
  balance: number;
  totalPurchased: number;
  totalUsed: number;
  lowBalance: boolean;
};

export default function KontorPurchasePage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [summary, setSummary] = useState<{ items: SummaryItem[]; threshold: number } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const load = () => {
    platformApi.getKontorPackages().then(setPackages).catch(() => {});
    platformApi.getKontorSummary().then(setSummary).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const purchase = async (packageId: string) => {
    setLoading(packageId);
    try {
      const res = await platformApi.purchaseKontor(packageId);
      if (res.redirectUrl) window.location.href = res.redirectUrl;
      else toast.info('Ödeme başlatıldı');
    } catch (e: any) {
      toast.info(e.response?.data?.message || 'Ödeme başlatılamadı — PayTR yapılandırmasını kontrol edin');
    } finally {
      setLoading(null);
    }
  };

  const items = summary?.items ?? [];

  return (
    <>
      <TopBar title="Kontör Yönetimi" subtitle="E-Fatura, E-Arşiv ve SMS kontör bakiyesi — PayTR ile satın al" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="kpi-card">
            <Coins className="w-5 h-5 text-indigo-500 mb-2" />
            <div className="text-xs text-gray-500">Mevcut bakiye</div>
            <div className="text-2xl font-bold text-gray-900">
              {items.reduce((s, i) => s + i.balance, 0)}
            </div>
          </div>
          <div className="kpi-card">
            <ShoppingCart className="w-5 h-5 text-green-500 mb-2" />
            <div className="text-xs text-gray-500">Toplam alınan</div>
            <div className="text-2xl font-bold text-gray-900">
              {items.reduce((s, i) => s + i.totalPurchased, 0)}
            </div>
          </div>
          <div className="kpi-card">
            <div className="text-xs text-gray-500 mb-2">Kullanılan</div>
            <div className="text-2xl font-bold text-gray-900">
              {items.reduce((s, i) => s + i.totalUsed, 0)}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {items.map((b) => (
            <div
              key={b.moduleCode}
              className={`card p-4 ${b.lowBalance ? 'border-amber-300 bg-amber-50/50' : ''}`}
            >
              <div className="text-xs text-gray-500">{b.moduleName}</div>
              <div className="flex justify-between mt-2 text-sm">
                <span>Bakiye</span>
                <span className={`font-bold ${b.balance <= KONTOR_LOW_THRESHOLD ? 'text-amber-700' : 'text-gray-900'}`}>
                  {b.balance}
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Alınan</span>
                <span>{b.totalPurchased}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Kullanılan</span>
                <span>{b.totalUsed}</span>
              </div>
            </div>
          ))}
        </div>

        {packages.map((mod) => (
          <div key={mod.id} className="card p-5">
            <h3 className="font-bold text-gray-900 mb-1">{mod.name}</h3>
            <p className="text-sm text-gray-500 mb-4">{mod.description}</p>
            <div className="grid md:grid-cols-3 gap-4">
              {(mod.kontorPackages || []).map((p: any) => (
                <div key={p.id} className="border border-gray-200 rounded-xl p-4 hover:border-indigo-300 transition-colors">
                  <div className="text-lg font-bold text-gray-900">{p.name}</div>
                  <div className="text-sm text-gray-500">{p.quantity} adet · {p.unitPrice} ₺/adet</div>
                  <div className="text-xl font-bold text-indigo-600 my-3">{p.totalPrice.toLocaleString('tr-TR')} ₺</div>
                  <button
                    type="button"
                    disabled={loading === p.id}
                    onClick={() => purchase(p.id)}
                    aria-label={`${mod.name} ${p.name} satın al`}
                    className="w-full py-2 rounded-xl text-white text-sm font-medium disabled:opacity-60 bg-[#606BDF]"
                  >
                    {loading === p.id ? 'Yönlendiriliyor…' : 'PayTR ile Satın Al'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
