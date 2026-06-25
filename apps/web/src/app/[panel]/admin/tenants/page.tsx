'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { api } from '@/lib/api';
import { Building2, Store, GitBranch, Search, Filter } from 'lucide-react';

const TYPE_LABELS: Record<string, string> = {
  SUPERADMIN: 'Platform',
  DEALER: 'Bayi',
  BUSINESS: 'İşletme',
  BRANCH: 'Şube',
};
const TYPE_COLORS: Record<string, string> = {
  SUPERADMIN: 'bg-purple-50 text-purple-700',
  DEALER: 'bg-blue-50 text-blue-700',
  BUSINESS: 'bg-emerald-50 text-emerald-700',
  BRANCH: 'bg-amber-50 text-amber-700',
};
const PLAN_COLORS: Record<string, string> = {
  PLATINUM: 'bg-violet-50 text-violet-700',
  PROFESSIONAL: 'bg-indigo-50 text-indigo-700',
  BASIC: 'bg-gray-100 text-gray-700',
};

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  useEffect(() => {
    api.get('/platform/boss')
      .then((r) => {
        // Extract all tenants from platform data
        const allTenants = r.data?.allTenants || [];
        setTenants(allTenants);
      })
      .catch(() => {
        // Fallback: try fetching from tenants list
        api.get('/tenants').then(r => setTenants(r.data || [])).catch(() => setTenants([]));
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = tenants.filter((t: any) => {
    if (filterType !== 'ALL' && t.type !== filterType) return false;
    if (search && !t.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    total: tenants.length,
    dealer: tenants.filter((t: any) => t.type === 'DEALER').length,
    business: tenants.filter((t: any) => t.type === 'BUSINESS').length,
    branch: tenants.filter((t: any) => t.type === 'BRANCH').length,
  };

  return (
    <>
      <TopBar title="Tüm Tenant'lar" subtitle="Platform üzerindeki bayi, işletme ve şubelerin yönetimi" />
      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Toplam', value: counts.total, icon: Building2, color: 'text-gray-700' },
            { label: 'Bayi', value: counts.dealer, icon: Store, color: 'text-blue-600' },
            { label: 'İşletme', value: counts.business, icon: Building2, color: 'text-emerald-600' },
            { label: 'Şube', value: counts.branch, icon: GitBranch, color: 'text-amber-600' },
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

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tenant ara..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#606BDF]"
            />
          </div>
          <div className="flex gap-2">
            {['ALL', 'DEALER', 'BUSINESS', 'BRANCH'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  filterType === t
                    ? 'bg-[#606BDF] text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t === 'ALL' ? 'Tümü' : TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Yükleniyor…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Sonuç bulunamadı</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-xs border-b border-gray-200 bg-gray-50/50">
                    <th className="text-left py-3 px-4">İsim</th>
                    <th className="text-left py-3 px-4">Kod</th>
                    <th className="text-center py-3 px-4">Tip</th>
                    <th className="text-center py-3 px-4">Plan</th>
                    <th className="text-left py-3 px-4">Şehir</th>
                    <th className="text-center py-3 px-4">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t: any) => (
                    <tr key={t.id} className="border-b border-gray-50 hover:bg-[#FBF8FF] transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-900">{t.name}</td>
                      <td className="py-3 px-4 text-gray-500 font-mono text-xs">{t.code || '—'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${TYPE_COLORS[t.type] || 'bg-gray-100 text-gray-600'}`}>
                          {TYPE_LABELS[t.type] || t.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${PLAN_COLORS[t.plan] || 'bg-gray-100 text-gray-600'}`}>
                          {t.plan}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500">{t.city || '—'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`w-2 h-2 rounded-full inline-block ${t.isActive !== false ? 'bg-emerald-500' : 'bg-red-400'}`} />
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
