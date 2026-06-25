'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { api } from '@/lib/api';
import { fmtMoney } from '@/lib/format';
import { Building2, CheckCircle, XCircle, CreditCard, TrendingUp, Search } from 'lucide-react';

export default function DealerBusinessesPage() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/reports/dealer/commission')
      .then((r) => setBusinesses(r.data?.businesses || []))
      .catch(() => setBusinesses([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = businesses.filter((b: any) => {
    if (!search) return true;
    return b.businessName?.toLowerCase().includes(search.toLowerCase());
  });

  const activeCount = businesses.filter((b: any) => b.isActive).length;
  const totalRevenue = businesses.reduce((s: number, b: any) => s + (b.monthlyRevenue || 0), 0);

  return (
    <>
      <TopBar title="İşletmelerim" subtitle="Bayinize bağlı tüm işletmeler ve performansları" />
      <div className="p-6 space-y-6">
        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Toplam İşletme', value: businesses.length, icon: Building2, color: 'text-indigo-600' },
            { label: 'Aktif', value: activeCount, icon: CheckCircle, color: 'text-emerald-600' },
            { label: 'Pasif', value: businesses.length - activeCount, icon: XCircle, color: 'text-red-500' },
            { label: 'Toplam Gelir', value: fmtMoney(totalRevenue), icon: TrendingUp, color: 'text-blue-600' },
          ].map((k) => (
            <div key={k.label} className="kpi-card">
              <div className="flex items-center gap-2 mb-2">
                <k.icon className={`w-4 h-4 ${k.color}`} />
                <span className="text-xs text-gray-500">{k.label}</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{k.value}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="İşletme ara..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#606BDF]"
          />
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Yükleniyor…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400">İşletme bulunamadı</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-xs border-b border-gray-200 bg-gray-50/50">
                    <th className="text-left py-3 px-4">İşletme Adı</th>
                    <th className="text-center py-3 px-4">Plan</th>
                    <th className="text-right py-3 px-4">Yıllık Gelir</th>
                    <th className="text-right py-3 px-4">Komisyon</th>
                    <th className="text-center py-3 px-4">Bitiş Tarihi</th>
                    <th className="text-center py-3 px-4">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b: any) => (
                    <tr key={b.businessId} className="border-b border-gray-50 hover:bg-[#FBF8FF] transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-900">{b.businessName}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          b.plan === 'PLATINUM' ? 'bg-violet-50 text-violet-700' :
                          b.plan === 'PROFESSIONAL' ? 'bg-indigo-50 text-indigo-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {b.plan}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-gray-700">{fmtMoney(b.monthlyRevenue)}</td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-600">{fmtMoney(b.commissionAmount)}</td>
                      <td className="py-3 px-4 text-center text-gray-500 text-xs">
                        {b.endDate ? new Date(b.endDate).toLocaleDateString('tr-TR') : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          b.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {b.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
