'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { platformApi } from '@/lib/api';
import { fmtMoney } from '@/lib/format';
import { Coins, Package, Store, TrendingUp, ShoppingCart } from 'lucide-react';

export default function AdminKontorPage() {
  const [summary, setSummary] = useState<any>(null);
  const [packages, setPackages] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      platformApi.getKontorSummary().catch(() => null),
      platformApi.getKontorPackages().catch(() => []),
      platformApi.getKontorBalances().catch(() => []),
    ]).then(([s, p, b]) => {
      setSummary(s);
      setPackages(Array.isArray(p) ? p : []);
      setBalances(Array.isArray(b) ? b : []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <TopBar title="Kontör Yönetimi" subtitle="Platform geneli kontör bakiyeleri ve paketler" />
      <div className="p-6 space-y-6">
        {loading ? (
          <div className="text-gray-400">Yükleniyor…</div>
        ) : (
          <>
            {/* KPI */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Toplam Satış', value: fmtMoney(summary?.totalRevenue || 0), icon: TrendingUp, color: 'text-emerald-600' },
                { label: 'Aktif Paket', value: packages.length, icon: Package, color: 'text-indigo-600' },
                { label: 'Bakiye Kayıtları', value: balances.length, icon: Coins, color: 'text-amber-600' },
                { label: 'Toplam Alım', value: summary?.totalPurchases || 0, icon: ShoppingCart, color: 'text-blue-600' },
              ].map((k) => (
                <div key={k.label} className="kpi-card">
                  <div className="flex items-center gap-2 mb-2">
                    <k.icon className={`w-4 h-4 ${k.color}`} />
                    <span className="text-xs text-gray-500">{k.label}</span>
                  </div>
                  <div className="text-xl font-bold text-gray-900">{k.value}</div>
                </div>
              ))}
            </div>

            {/* Paketler */}
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Kontör Paketleri</h3>
              {packages.length === 0 ? (
                <p className="text-sm text-gray-400">Henüz kontör paketi tanımlı değil</p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {packages.map((p: any) => (
                    <div key={p.id} className="border border-gray-200 rounded-xl p-4 hover:border-[#606BDF] transition-colors">
                      <div className="font-medium text-gray-900">{p.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{p.addonModule?.name || p.moduleCode}</div>
                      <div className="flex justify-between mt-3">
                        <span className="text-sm text-gray-600">{p.quantity} adet</span>
                        <span className="font-semibold text-[#606BDF]">{fmtMoney(p.totalPrice)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bakiyeler */}
            <div className="card overflow-hidden">
              <h3 className="font-semibold text-gray-900 mb-4 px-5 pt-5">Tenant Kontör Bakiyeleri</h3>
              {balances.length === 0 ? (
                <p className="text-sm text-gray-400 px-5 pb-5">Bakiye kaydı yok</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 text-xs border-b border-gray-200 bg-gray-50/50">
                        <th className="text-left py-3 px-5">Tenant</th>
                        <th className="text-left py-3 px-5">Modül</th>
                        <th className="text-right py-3 px-5">Bakiye</th>
                      </tr>
                    </thead>
                    <tbody>
                      {balances.map((b: any) => (
                        <tr key={b.id} className="border-b border-gray-50 hover:bg-[#FBF8FF]">
                          <td className="py-2.5 px-5 font-medium text-gray-900">{b.tenant?.name || b.tenantId}</td>
                          <td className="py-2.5 px-5 text-gray-500">{b.moduleCode}</td>
                          <td className="py-2.5 px-5 text-right font-semibold text-amber-600">{b.balance}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
