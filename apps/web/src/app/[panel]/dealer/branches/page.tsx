'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { api } from '@/lib/api';
import { GitBranch, MapPin, Phone, CheckCircle, Search, Building2 } from 'lucide-react';

export default function DealerBranchesPage() {
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/reports/dealer/commission')
      .then((r) => {
        // Extract branches from commission data or tenant list
        const businesses = r.data?.businesses || [];
        // Use businesses as proxy — in a full implementation, a dedicated endpoint would be used
        setBranches(businesses);
      })
      .catch(() => setBranches([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = branches.filter((b: any) => {
    if (!search) return true;
    return b.businessName?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <>
      <TopBar title="Şube Takibi" subtitle="İşletmelere bağlı şubelerin durumu ve performansı" />
      <div className="p-6 space-y-6">
        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="kpi-card">
            <div className="flex items-center gap-2 mb-2">
              <GitBranch className="w-4 h-4 text-indigo-600" />
              <span className="text-xs text-gray-500">Toplam Kayıt</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{branches.length}</div>
          </div>
          <div className="kpi-card">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-gray-500">Aktif</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{branches.filter((b: any) => b.isActive).length}</div>
          </div>
          <div className="kpi-card">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-gray-500">Bağlı İşletme</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{new Set(branches.map((b: any) => b.businessId)).size}</div>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Şube / işletme ara..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#606BDF]"
          />
        </div>

        {/* List */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Yükleniyor…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-3">
              <GitBranch className="w-10 h-10 text-gray-300" />
              <p>Henüz şube kaydı bulunamadı</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((b: any, i: number) => (
                <div key={b.businessId || i} className="flex items-center justify-between px-5 py-4 hover:bg-[#FBF8FF] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <GitBranch className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{b.businessName}</div>
                      <div className="text-xs text-gray-500 mt-0.5">Plan: {b.plan}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      b.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {b.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
