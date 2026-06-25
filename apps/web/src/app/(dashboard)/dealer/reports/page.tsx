'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Building2, GitBranch, AlertTriangle } from 'lucide-react';
import { fmtMoney, fmtNum } from '@/lib/format';
import { api } from '@/lib/api';

export default function DealerReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/reports/dealer/advanced')
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-gray-400">Yükleniyor…</div>;
  if (!data) return <div className="p-6 text-gray-400">Veri yüklenemedi.</div>;

  const k = data.kpis;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <BarChart3 className="text-indigo-400" /> Gelişmiş Bayi Raporları
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Kayıtlı işletmelerinizin durumu, plan dağılımı ve süre takibi
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'İşletme', value: fmtNum(k.totalBusinesses), icon: Building2 },
          { label: 'Aktif', value: fmtNum(k.activeBusinesses), icon: Building2 },
          { label: 'Şube', value: fmtNum(k.totalBranches), icon: GitBranch },
          { label: 'Süresi Bitiyor', value: fmtNum(k.expiringSoon), icon: AlertTriangle },
        ].map((item) => (
          <div key={item.label} className="kpi-card">
            <div className="flex justify-between mb-2">
              <span className="text-gray-400 text-sm">{item.label}</span>
              <item.icon size={18} className="text-indigo-400" />
            </div>
            <div className="page-title">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-gray-900 font-semibold mb-3">Plan Dağılımı</h3>
          {data.planBreakdown.map((p: any) => (
            <div
              key={p.plan}
              className="flex justify-between py-2 border-b border-gray-100 text-sm"
            >
              <span className="text-gray-400">{p.plan}</span>
              <span className="text-gray-900 font-medium">{p.count} işletme</span>
            </div>
          ))}
          <div className="flex justify-between pt-3 text-sm">
            <span className="text-gray-400">Ort. Aylık Ücret</span>
            <span className="text-emerald-600 font-semibold">{fmtMoney(k.avgPlanValue)}</span>
          </div>
        </div>

        <div className="card">
          <h3 className="text-gray-900 font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-400" /> Süresi Yaklaşan
          </h3>
          {data.expiringSoon.length === 0 ? (
            <p className="text-gray-500 text-sm">Yakında süresi dolacak işletme yok.</p>
          ) : (
            data.expiringSoon.map((b: any) => (
              <div
                key={b.id}
                className="flex justify-between py-2 border-b border-gray-100 text-sm"
              >
                <span className="text-gray-900 font-medium">{b.name}</span>
                <span className="text-amber-400">
                  {b.endDate ? new Date(b.endDate).toLocaleDateString('tr-TR') : '—'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <h3 className="text-gray-900 font-semibold mb-3">Tüm İşletmeler</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs border-b border-gray-200">
              <th className="text-left py-2">İşletme</th>
              <th className="text-left py-2">Plan</th>
              <th className="text-right py-2">Şube</th>
              <th className="text-right py-2">Aylık</th>
              <th className="text-right py-2">Bitiş</th>
            </tr>
          </thead>
          <tbody>
            {data.businesses.map((b: any) => (
              <tr key={b.id} className="border-b border-gray-100">
                <td className="py-2 text-gray-900">{b.name}</td>
                <td className="py-2 text-gray-400">{b.plan}</td>
                <td className="py-2 text-right text-gray-600">{b.branchCount}</td>
                <td className="py-2 text-right text-gray-600">{fmtMoney(b.monthlyFee)}</td>
                <td className="py-2 text-right text-gray-400">
                  {b.endDate ? new Date(b.endDate).toLocaleDateString('tr-TR') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
