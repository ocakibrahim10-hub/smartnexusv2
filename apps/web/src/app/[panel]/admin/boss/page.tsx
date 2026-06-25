'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { platformApi } from '@/lib/api';
import { fmtMoney } from '@/lib/format';
import {
  Activity,
  Building2,
  Store,
  TrendingUp,
  CreditCard,
  Coins,
  AlertTriangle,
  Users,
} from 'lucide-react';

const PERIODS = [
  { id: 'day', label: 'Günlük' },
  { id: 'week', label: 'Haftalık' },
  { id: 'month', label: 'Aylık' },
  { id: 'year', label: 'Yıllık' },
];

export default function PlatformBossPage() {
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    platformApi
      .getBoss(period)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [period]);

  const kpis = data?.kpis;

  return (
    <>
      <TopBar title="Platform Boss Ekranı" subtitle="Anlık platform metrikleri ve satış akışı" />
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                period === p.id
                  ? 'text-white bg-[#606BDF]'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-gray-500">Yükleniyor…</div>
        ) : !data ? (
          <div className="card p-8 text-center text-gray-500">Veri yüklenemedi</div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {[
                { label: 'Bayi', value: kpis?.dealers, icon: Store, color: 'text-blue-600' },
                { label: 'İşletme', value: kpis?.businesses, icon: Building2, color: 'text-emerald-600' },
                { label: 'Şube', value: kpis?.branches, icon: Users, color: 'text-violet-600' },
                { label: 'MRR', value: fmtMoney(kpis?.mrr), icon: TrendingUp, color: 'text-indigo-600' },
                { label: 'Kontör Geliri', value: fmtMoney(kpis?.kontorRevenue), icon: Coins, color: 'text-amber-600' },
                { label: 'Yakında Biten', value: kpis?.expiringSoon, icon: AlertTriangle, color: 'text-red-600' },
              ].map((k) => (
                <div key={k.label} className="kpi-card">
                  <div className="flex items-center gap-2 mb-2">
                    <k.icon className={`w-4 h-4 ${k.color}`} />
                    <span className="text-xs text-gray-500">{k.label}</span>
                  </div>
                  <div className="text-xl font-bold text-gray-900">{k.value ?? '—'}</div>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="card p-5">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  Bayi Satış Performansı
                </h3>
                <div className="space-y-3">
                  {(data.dealerPerformance || []).map((d: any, i: number) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <div className="font-medium text-gray-900">{d.name}</div>
                        <div className="text-xs text-gray-500">{d.count} satış</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-indigo-600">{fmtMoney(d.revenue)}</div>
                      </div>
                    </div>
                  ))}
                  {(!data.dealerPerformance || data.dealerPerformance.length === 0) && (
                    <p className="text-sm text-gray-400">Bu dönemde bayi satışı yok</p>
                  )}
                </div>
              </div>

              <div className="card p-5">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  Yakında Sona Eren Abonelikler
                </h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {(data.expiringSubscriptions || []).map((s: any) => (
                    <div key={s.tenantId} className="flex justify-between py-2 border-b border-gray-100">
                      <div>
                        <div className="font-medium text-gray-900">{s.tenantName}</div>
                        <div className="text-xs text-gray-500">{s.plan}</div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="text-red-600 font-medium">
                          {new Date(s.endDate).toLocaleDateString('tr-TR')}
                        </div>
                        <div className="text-gray-500">{fmtMoney(s.price)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="card p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Son Bayi Satışları</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="pb-2">İşletme</th>
                      <th className="pb-2">Bayi</th>
                      <th className="pb-2">Plan</th>
                      <th className="pb-2 text-right">Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.recentDealerSales || []).map((r: any) => (
                      <tr key={r.id} className="border-b border-gray-50">
                        <td className="py-2">{r.name}</td>
                        <td className="py-2 text-gray-500">{r.dealerName || '—'}</td>
                        <td className="py-2">{r.plan}</td>
                        <td className="py-2 text-right">{fmtMoney(r.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="card p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Kontör Alımları</h3>
                <div className="space-y-2">
                  {(data.kontorPurchases || []).map((p: any, i: number) => (
                    <div key={i} className="flex justify-between py-2 border-b border-gray-50">
                      <div>
                        <div className="font-medium">{p.tenantName}</div>
                        <div className="text-xs text-gray-500">{p.moduleCode} · {p.quantity} adet</div>
                      </div>
                      <div className="font-semibold text-amber-600">{fmtMoney(p.amount)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
