'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  BarChart3,
  Building2,
  GitBranch,
  AlertTriangle,
  CreditCard,
  TrendingUp,
  Clock,
} from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { fmtMoney, fmtNum } from '@/lib/format';
import { planLabel } from '@/lib/plans';
import { api } from '@/lib/api';

export default function DealerReportsPage() {
  const params = useParams();
  const panel = (params?.panel as string) || 'bayi';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/reports/dealer/advanced')
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col min-h-full">
        <TopBar title="Bayi Raporları" subtitle="Yükleniyor…" />
        <div className="p-6 text-gray-400">Veriler hazırlanıyor…</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col min-h-full">
        <TopBar title="Bayi Raporları" subtitle="Veri alınamadı" />
        <div className="p-6 text-gray-500">Rapor yüklenemedi. API bağlantısını kontrol edin.</div>
      </div>
    );
  }

  const k = data.kpis;
  const pendingPayment = (data.businesses ?? []).filter((b: any) => !b.isActive).length;

  return (
    <div className="flex flex-col min-h-full">
      <TopBar
        title="Bayi Raporları"
        subtitle="İşletme portföyü, plan dağılımı ve abonelik takibi"
      />

      <div className="p-6 space-y-6 flex-1">
        <div className="flex flex-wrap gap-3">
          <Link href={`/${panel}/businesses`} className="btn-primary text-sm">
            + Yeni İşletme Kaydı
          </Link>
          <Link href={`/${panel}/dealer/commission`} className="btn-secondary text-sm">
            Hakediş Detayı
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Toplam İşletme', value: fmtNum(k.totalBusinesses), icon: Building2, color: 'text-indigo-500' },
            { label: 'Aktif', value: fmtNum(k.activeBusinesses), icon: TrendingUp, color: 'text-emerald-600' },
            { label: 'Ödeme Bekleyen', value: fmtNum(pendingPayment), icon: CreditCard, color: 'text-amber-600' },
            { label: 'Toplam Şube', value: fmtNum(k.totalBranches), icon: GitBranch, color: 'text-blue-500' },
            { label: 'Süresi Bitiyor', value: fmtNum(k.expiringSoon), icon: AlertTriangle, color: 'text-red-500' },
          ].map((item) => (
            <div key={item.label} className="kpi-card">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400 text-sm">{item.label}</span>
                <item.icon size={18} className={item.color} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="card">
            <h3 className="text-gray-900 font-semibold mb-4">Plan Dağılımı</h3>
            <div className="space-y-2">
              {data.planBreakdown.map((p: any) => {
                const pct =
                  k.totalBusinesses > 0
                    ? Math.round((p.count / k.totalBusinesses) * 100)
                    : 0;
                return (
                  <div key={p.plan}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{planLabel(p.plan)}</span>
                      <span className="font-medium text-gray-900">{p.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-[#606BDF] rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between pt-4 mt-4 border-t border-gray-100 text-sm">
              <span className="text-gray-400">Ortalama paket değeri</span>
              <span className="text-emerald-600 font-semibold">{fmtMoney(k.avgPlanValue)}</span>
            </div>
          </div>

          <div className="card">
            <h3 className="text-gray-900 font-semibold mb-4 flex items-center gap-2">
              <Clock size={16} className="text-amber-500" />
              Süresi Yaklaşan Abonelikler
            </h3>
            {data.expiringSoon.length === 0 ? (
              <p className="text-gray-500 text-sm">30 gün içinde süresi dolacak işletme yok.</p>
            ) : (
              <ul className="space-y-2">
                {data.expiringSoon.map((b: any) => (
                  <li
                    key={b.id}
                    className="flex items-center justify-between py-2 border-b border-gray-50 text-sm"
                  >
                    <span className="font-medium text-gray-900">{b.name}</span>
                    <span className="text-amber-600 text-xs">
                      {b.endDate ? new Date(b.endDate).toLocaleDateString('tr-TR') : '—'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-900 font-semibold">İşletme Portföyü</h3>
            <span className="text-xs text-gray-400">{data.businesses.length} kayıt</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs border-b border-gray-200">
                  <th className="text-left py-2.5 font-medium">İşletme</th>
                  <th className="text-left py-2.5 font-medium">Plan</th>
                  <th className="text-center py-2.5 font-medium">Durum</th>
                  <th className="text-right py-2.5 font-medium">Şube</th>
                  <th className="text-right py-2.5 font-medium">Yıllık</th>
                  <th className="text-right py-2.5 font-medium">Bitiş</th>
                </tr>
              </thead>
              <tbody>
                {data.businesses.map((b: any) => (
                  <tr key={b.id} className="border-b border-gray-50 hover:bg-[#FBF8FF]">
                    <td className="py-2.5 text-gray-900 font-medium">{b.name}</td>
                    <td className="py-2.5 text-gray-500">{planLabel(b.plan)}</td>
                    <td className="py-2.5 text-center">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          b.isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {b.isActive ? 'Aktif' : 'Ödeme Bekliyor'}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-gray-600">{b.branchCount}</td>
                    <td className="py-2.5 text-right text-gray-600">{fmtMoney(b.monthlyFee)}</td>
                    <td className="py-2.5 text-right text-gray-400">
                      {b.endDate ? new Date(b.endDate).toLocaleDateString('tr-TR') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
