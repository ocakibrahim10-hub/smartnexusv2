'use client';

import { useEffect, useState } from 'react';
import { Wallet, TrendingUp, Building2, Percent, CheckCircle, Clock } from 'lucide-react';
import { fmtMoney, fmtPct, fmtNum } from '@/lib/format';
import { api } from '@/lib/api';

type CommissionData = {
  commissionRate: number;
  summary: {
    businessCount: number;
    activeCount: number;
    totalMonthlyRevenue: number;
    totalCommission: number;
    paidCommission: number;
    upcomingCommission: number;
    pendingPayout: number;
  };
  businesses: Array<{
    businessId: string;
    businessName: string;
    plan: string;
    monthlyRevenue: number;
    commissionAmount: number;
    isActive: boolean;
    endDate: string | null;
  }>;
  payoutHistory: Array<{
    id: string;
    period: string;
    amount: number;
    status: string;
    paidAt: string | null;
    dueDate: string | null;
  }>;
};

export default function DealerCommissionPage() {
  const [data, setData] = useState<CommissionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/reports/dealer/commission')
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-gray-400">Yükleniyor…</div>;
  if (!data) return <div className="p-6 text-gray-400">Veri yüklenemedi.</div>;

  const s = data.summary;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Wallet className="text-emerald-600" /> Hakediş Raporları
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Admin tarafından belirlenen %{fmtPct(data.commissionRate, 0)} komisyon oranı — alınan ve
          alınacak ödemeler
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          {
            label: 'İşletmelerim',
            value: fmtNum(s.businessCount),
            sub: `${s.activeCount} aktif`,
            icon: Building2,
            color: 'text-indigo-400',
          },
          {
            label: 'Aylık Ciro',
            value: fmtMoney(s.totalMonthlyRevenue),
            icon: TrendingUp,
            color: 'text-blue-400',
          },
          {
            label: 'Toplam Hakediş',
            value: fmtMoney(s.totalCommission),
            icon: Wallet,
            color: 'text-emerald-600',
          },
          {
            label: 'Ödenen',
            value: fmtMoney(s.paidCommission),
            icon: CheckCircle,
            color: 'text-green-400',
          },
          {
            label: 'Alınacak',
            value: fmtMoney(s.upcomingCommission),
            icon: Clock,
            color: 'text-amber-400',
          },
          {
            label: 'Komisyon Oranı',
            value: `%${fmtPct(data.commissionRate, 0)}`,
            icon: Percent,
            color: 'text-purple-400',
          },
        ].map((k) => (
          <div key={k.label} className="kpi-card">
            <div className="flex justify-between mb-2">
              <span className="text-gray-400 text-sm">{k.label}</span>
              <k.icon size={18} className={k.color} />
            </div>
            <div className="text-xl font-bold text-gray-900">{k.value}</div>
            {'sub' in k && k.sub && <div className="text-xs text-gray-500">{k.sub}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card overflow-x-auto">
          <h3 className="text-gray-900 font-semibold mb-4">İşletme Bazlı Hakediş</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs border-b border-gray-200">
                <th className="text-left py-2">İşletme</th>
                <th className="text-left py-2">Plan</th>
                <th className="text-right py-2">Ücret</th>
                <th className="text-right py-2">Komisyon</th>
                <th className="text-right py-2">Durum</th>
              </tr>
            </thead>
            <tbody>
              {data.businesses.map((b) => (
                <tr key={b.businessId} className="border-b border-gray-100">
                  <td className="py-3 text-gray-900">{b.businessName}</td>
                  <td className="py-3 text-gray-600">{b.plan}</td>
                  <td className="py-3 text-right text-gray-600">{fmtMoney(b.monthlyRevenue)}</td>
                  <td className="py-3 text-right text-emerald-600 font-semibold">
                    {fmtMoney(b.commissionAmount)}
                  </td>
                  <td className="py-3 text-right">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${b.isActive ? 'bg-emerald-500/20 text-emerald-600' : 'bg-red-500/20 text-red-400'}`}
                    >
                      {b.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3 className="text-gray-900 font-semibold mb-4">Ödeme Geçmişi & Alacaklar</h3>
          <div className="space-y-3">
            {data.payoutHistory.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200"
              >
                <div>
                  <div className="text-gray-900 text-sm font-medium">{p.period}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {p.status === 'PAID' && p.paidAt
                      ? `Ödendi: ${new Date(p.paidAt).toLocaleDateString('tr-TR')}`
                      : p.dueDate
                        ? `Vade: ${new Date(p.dueDate).toLocaleDateString('tr-TR')}`
                        : '—'}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`font-bold ${p.status === 'PAID' ? 'text-green-400' : 'text-amber-400'}`}
                  >
                    {fmtMoney(p.amount)}
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'PAID' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}
                  >
                    {p.status === 'PAID' ? 'Ödendi' : 'Bekliyor'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
