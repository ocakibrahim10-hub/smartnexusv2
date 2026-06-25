'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { api } from '@/lib/api';
import { ClipboardList, Search, User, Calendar } from 'lucide-react';

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/accounting/audit')
      .then((r) => setLogs(Array.isArray(r.data) ? r.data : []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter((l: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (l.action?.toLowerCase().includes(q) || l.entity?.toLowerCase().includes(q) || l.userEmail?.toLowerCase().includes(q));
  });

  return (
    <>
      <TopBar title="Platform Denetim Kaydı" subtitle="Tüm sistem geneli işlem logları" />
      <div className="p-6 space-y-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="İşlem, kullanıcı veya entity ara..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#606BDF]"
          />
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Yükleniyor…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-3">
              <ClipboardList className="w-10 h-10 text-gray-300" />
              <p>Henüz denetim kaydı yok</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-xs border-b border-gray-200 bg-gray-50/50">
                    <th className="text-left py-3 px-4">Tarih</th>
                    <th className="text-left py-3 px-4">Kullanıcı</th>
                    <th className="text-left py-3 px-4">İşlem</th>
                    <th className="text-left py-3 px-4">Entity</th>
                    <th className="text-left py-3 px-4">ID</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 100).map((log: any) => (
                    <tr key={log.id} className="border-b border-gray-50 hover:bg-[#FBF8FF] transition-colors">
                      <td className="py-2.5 px-4 text-gray-500 text-xs whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" />
                          {new Date(log.createdAt).toLocaleString('tr-TR')}
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-gray-400" />
                          <span className="text-gray-700">{log.userEmail || '—'}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          log.action === 'CREATE' ? 'bg-emerald-50 text-emerald-700' :
                          log.action === 'UPDATE' ? 'bg-blue-50 text-blue-700' :
                          log.action === 'DELETE' ? 'bg-red-50 text-red-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-gray-600">{log.entity || '—'}</td>
                      <td className="py-2.5 px-4 text-gray-400 font-mono text-xs">{log.entityId?.slice(0, 8) || '—'}</td>
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
