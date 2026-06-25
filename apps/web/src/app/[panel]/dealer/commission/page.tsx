'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Wallet,
  TrendingUp,
  Building2,
  Percent,
  CheckCircle,
  Clock,
  Receipt,
  ArrowRight,
} from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { fmtMoney, fmtPct, fmtNum } from '@/lib/format';
import { planLabel } from '@/lib/plans';
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
  monthlyTrend: Array<{ month: string; commission: number; paid: number }>;
};

export default function DealerCommissionPage() {
  const params = useParams();
  const panel = (params?.panel as string) || 'bayi';
  const [data, setData] = useState<CommissionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/reports/dealer/commission')
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col min-h-full">
        <TopBar title="Hakediş" subtitle="Yükleniyor…" />
        <div className="p-6 text-gray-400">Veriler hazırlanıyor…</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col min-h-full">
        <TopBar title="Hakediş" subtitle="Veri alınamadı" />
        <div className="p-6 text-gray-500">Hakediş raporu yüklenemedi.</div>
      </div>
    );
  }

  const s = data.summary;
  const collectionRate =
    s.totalCommission > 0 ? Math.round((s.paidCommission / s.totalCommission) * 100) : 0;

  return (
    <div className="flex flex-col min-h-full">
      <TopBar
        title="Hakediş Raporları"
        subtitle={`Komisyon oranı %${fmtPct(data.commissionRate, 0)} — işletme bazlı kazanç takibi`}
      />

      <div className="p-6 space-y-6 flex-1">
        <div className="flex flex-wrap gap-2">
          <Link href={`/${panel}/dealer/billing`} className="btn-secondary text-sm inline-flex items-center gap-1">
            <Receipt size={14} /> Hakediş Faturası
            <ArrowRight size={14} />
          </Link>
          <Link href={`/${panel}/businesses`} className="btn-primary text-sm">
            + Yeni İşletme
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            { label: 'İşletmelerim', value: fmtNum(s.businessCount), sub: `${s.activeCount} aktif`, icon: Building2, color: 'text-indigo-500' },
            { label: 'Yıllık Portföy', value: fmtMoney(s.totalMonthlyRevenue), icon: TrendingUp, color: 'text-blue-500' },
            { label: 'Toplam Hakediş', value: fmtMoney(s.totalCommission), icon: Wallet, color: 'text-emerald-600' },
            { label: 'Tahsil Edilen', value: fmtMoney(s.paidCommission), sub: `%${collectionRate}`, icon: CheckCircle, color: 'text-emerald-500' },
            { label: 'Bekleyen Hakediş', value: fmtMoney(s.upcomingCommission), icon: Clock, color: 'text-amber-600' },
            { label: 'Oran', value: `%${fmtPct(data.commissionRate, 0)}`, icon: Percent, color: 'text-[#606BDF]' },
          ].map((k) => (
            <div key={k.label} className="kpi-card">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400 text-sm">{k.label}</span>
                <k.icon size={18} className={k.color} />
              </div>
              <div className="text-xl font-bold text-gray-900">{k.value}</div>
              {'sub' in k && k.sub && <div className="text-xs text-gray-500 mt-0.5">{k.sub}</div>}
            </div>
          ))}
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-1">Aylık Hakediş Trendi</h3>
          <p className="text-xs text-gray-500 mb-4">Hesaplanan ve tahsil edilen komisyon (son 6 ay)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.monthlyTrend ?? []} margin={{ left: -8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EFEDF4" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#777680' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#777680' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v: number) => fmtMoney(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="commission" name="Hakediş" fill="#C7C5FF" radius={[4, 4, 0, 0]} />
              <Bar dataKey="paid" name="Tahsil" fill="#606BDF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="card overflow-hidden">
            <h3 className="font-semibold text-gray-900 mb-4">İşletme Bazlı Komisyon</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-xs border-b border-gray-200">
                    <th className="text-left py-2.5">İşletme</th>
                    <th className="text-left py-2.5">Plan</th>
                    <th className="text-right py-2.5">Yıllık</th>
                    <th className="text-right py-2.5">Komisyon</th>
                    <th className="text-center py-2.5">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {data.businesses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">
                        Henüz işletme kaydı yok
                      </td>
                    </tr>
                  ) : (
                    data.businesses.map((b) => (
                      <tr key={b.businessId} className="border-b border-gray-50 hover:bg-[#FBF8FF]">
                        <td className="py-2.5 font-medium text-gray-900">{b.businessName}</td>
                        <td className="py-2.5 text-gray-500">{planLabel(b.plan)}</td>
                        <td className="py-2.5 text-right text-gray-600">{fmtMoney(b.monthlyRevenue)}</td>
                        <td className="py-2.5 text-right font-semibold text-emerald-600">
                          {fmtMoney(b.commissionAmount)}
                        </td>
                        <td className="py-2.5 text-center">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              b.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'
                            }`}
                          >
                            {b.isActive ? 'Aktif' : 'Ödeme Bekliyor'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Ödeme Dönemleri</h3>
            <ul className="space-y-2">
              {data.payoutHistory.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-[#EFEDF4] bg-[#FBF8FF]"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">{p.period}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {p.status === 'PAID' && p.paidAt
                        ? `Ödendi: ${new Date(p.paidAt).toLocaleDateString('tr-TR')}`
                        : p.dueDate
                          ? `Vade: ${new Date(p.dueDate).toLocaleDateString('tr-TR')}`
                          : '—'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${p.status === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {fmtMoney(p.amount)}
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        p.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {p.status === 'PAID' ? 'Ödendi' : 'Bekliyor'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
