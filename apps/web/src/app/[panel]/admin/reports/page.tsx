'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { platformApi } from '@/lib/api';
import { fmtMoney } from '@/lib/format';
import { planLabel } from '@/lib/plans';
import { BarChart3, TrendingUp, Users, AlertTriangle } from 'lucide-react';

export default function PlatformReportsPage() {
  const [data, setData] = useState<any>(null);
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    platformApi
      .getPlatformReports(period)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [period]);

  const kpis = data?.kpis;

  return (
    <>
      <TopBar title="Platform Raporları" subtitle="Gelir, abonelik, kontör ve bayi performansı" />
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap gap-2">
          {(['day', 'week', 'month', 'year'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              aria-label={`Dönem: ${p}`}
              className={`px-4 py-2 rounded-xl text-sm font-medium ${
                period === p ? 'bg-[#606BDF] text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {p === 'day' ? 'Bugün' : p === 'week' ? 'Hafta' : p === 'month' ? 'Ay' : 'Yıl'}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-500">Yükleniyor…</p>
        ) : !data ? (
          <p className="text-red-600">Rapor yüklenemedi.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="kpi-card">
                <TrendingUp className="w-5 h-5 text-indigo-500 mb-2" />
                <div className="text-xs text-gray-500">MRR</div>
                <div className="text-2xl font-bold">{fmtMoney(kpis?.mrr ?? 0)}</div>
              </div>
              <div className="kpi-card">
                <BarChart3 className="w-5 h-5 text-green-500 mb-2" />
                <div className="text-xs text-gray-500">Kontör geliri</div>
                <div className="text-2xl font-bold">{fmtMoney(kpis?.kontorRevenue ?? 0)}</div>
              </div>
              <div className="kpi-card">
                <Users className="w-5 h-5 text-blue-500 mb-2" />
                <div className="text-xs text-gray-500">Aktif abonelik</div>
                <div className="text-2xl font-bold">{kpis?.activeSubscriptions ?? 0}</div>
              </div>
              <div className="kpi-card">
                <AlertTriangle className="w-5 h-5 text-amber-500 mb-2" />
                <div className="text-xs text-gray-500">Süresi dolacak (30g)</div>
                <div className="text-2xl font-bold">{kpis?.expiringSoon ?? 0}</div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="card p-5">
                <h3 className="font-semibold mb-4">Plan dağılımı</h3>
                <div className="space-y-2">
                  {(data.planBreakdown || []).map((p: any) => (
                    <div key={p.plan} className="flex justify-between text-sm py-2 border-b border-gray-100">
                      <span>{planLabel(p.plan)}</span>
                      <span>
                        {p.count} abonelik · {fmtMoney(p.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-5">
                <h3 className="font-semibold mb-4">Bayi performansı</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {(data.dealerPerformance || []).map((d: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm py-2 border-b border-gray-100">
                      <span>{d.name}</span>
                      <span>{d.count} satış · {fmtMoney(d.revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {(data.lowBalanceAlerts?.length ?? 0) > 0 && (
              <div className="card p-5 border-amber-200">
                <h3 className="font-semibold mb-3 text-amber-800">Düşük kontör bakiyesi</h3>
                <div className="space-y-2">
                  {data.lowBalanceAlerts.map((a: any) => (
                    <div key={`${a.tenantId}-${a.moduleCode}`} className="text-sm flex justify-between">
                      <span>{a.tenantName} ({a.moduleCode})</span>
                      <span className="font-medium text-amber-700">{a.balance} kontör</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card p-5">
              <h3 className="font-semibold mb-4">Son kontör alımları</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="pb-2">İşletme</th>
                      <th className="pb-2">Modül</th>
                      <th className="pb-2">Adet</th>
                      <th className="pb-2">Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.kontorPurchases || []).map((p: any, i: number) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-2">{p.tenantName}</td>
                        <td className="py-2">{p.moduleCode}</td>
                        <td className="py-2">{p.quantity}</td>
                        <td className="py-2">{fmtMoney(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
