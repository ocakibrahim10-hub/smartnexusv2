'use client';

import { useEffect, useState } from 'react';
import { Wallet, TrendingUp, Store, Building2, Percent, CheckCircle, Clock } from 'lucide-react';
import { fmtMoney, fmtNum } from '@/lib/format';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';

type AdminCommission = {
  commissionRate: number;
  summary: {
    dealerCount: number;
    totalBusinesses: number;
    totalCommission: number;
    paidCommission: number;
    upcomingCommission: number;
    platformRevenue: number;
    monthlySaaSRevenue: number;
  };
  dealers: Array<{
    dealerId: string;
    dealerName: string;
    city: string | null;
    businessCount: number;
    activeBusinesses: number;
    monthlyRevenue: number;
    commissionAmount: number;
    paidCommission: number;
    upcomingCommission: number;
    platformFee: number;
    isActive: boolean;
  }>;
};

export default function AdminCommissionPage() {
  const user = getUser();
  const router = useRouter();
  const [data, setData] = useState<AdminCommission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.tenantType !== 'SUPERADMIN') {
      router.replace('/dashboard');
      return;
    }
    api
      .get('/reports/admin/commission')
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [user, router]);

  if (loading) return <div className="p-6 text-gray-400">Yükleniyor…</div>;
  if (!data?.summary) return <div className="p-6 text-gray-400">Veri yüklenemedi.</div>;

  const s = data.summary;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Wallet className="text-emerald-600" /> Platform Hakediş Özeti
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Tüm bayilerin %{data.commissionRate} komisyon oranına göre aldıkları ve alacakları —
          platform geliri dahil
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          {
            label: 'Bayi Sayısı',
            value: fmtNum(s.dealerCount),
            icon: Store,
            color: 'text-indigo-400',
          },
          {
            label: 'Toplam İşletme',
            value: fmtNum(s.totalBusinesses),
            icon: Building2,
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
            label: 'Platform Geliri',
            value: fmtMoney(s.platformRevenue),
            icon: TrendingUp,
            color: 'text-purple-400',
          },
        ].map((k) => (
          <div key={k.label} className="kpi-card">
            <div className="flex justify-between mb-2">
              <span className="text-gray-400 text-sm">{k.label}</span>
              <k.icon size={18} className={k.color} />
            </div>
            <div className="text-xl font-bold text-gray-900">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <h3 className="text-gray-900 font-semibold mb-4">Bayi Bazlı Hakediş Tablosu</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs border-b border-gray-200">
              <th className="text-left py-2">Bayi</th>
              <th className="text-left py-2">Şehir</th>
              <th className="text-right py-2">İşletme</th>
              <th className="text-right py-2">Abonelik Ciro</th>
              <th className="text-right py-2">Hakediş</th>
              <th className="text-right py-2">Ödenen</th>
              <th className="text-right py-2">Alınacak</th>
              <th className="text-right py-2">Platform Ücreti</th>
            </tr>
          </thead>
          <tbody>
            {data.dealers.map((d) => (
              <tr key={d.dealerId} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 text-gray-900 font-medium">{d.dealerName}</td>
                <td className="py-3 text-gray-400">{d.city || '—'}</td>
                <td className="py-3 text-right text-gray-600">
                  {d.activeBusinesses}/{d.businessCount}
                </td>
                <td className="py-3 text-right text-gray-600">{fmtMoney(d.monthlyRevenue)}</td>
                <td className="py-3 text-right text-emerald-600 font-semibold">
                  {fmtMoney(d.commissionAmount)}
                </td>
                <td className="py-3 text-right text-green-400">{fmtMoney(d.paidCommission)}</td>
                <td className="py-3 text-right text-amber-400">{fmtMoney(d.upcomingCommission)}</td>
                <td className="py-3 text-right text-purple-300">{fmtMoney(d.platformFee)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200 font-semibold">
              <td colSpan={3} className="py-3 text-gray-600">
                Toplam
              </td>
              <td className="py-3 text-right text-gray-900">
                {fmtMoney(data.dealers.reduce((a, d) => a + d.monthlyRevenue, 0))}
              </td>
              <td className="py-3 text-right text-emerald-600">{fmtMoney(s.totalCommission)}</td>
              <td className="py-3 text-right text-green-400">{fmtMoney(s.paidCommission)}</td>
              <td className="py-3 text-right text-amber-400">{fmtMoney(s.upcomingCommission)}</td>
              <td className="py-3 text-right text-purple-300">{fmtMoney(s.platformRevenue)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
