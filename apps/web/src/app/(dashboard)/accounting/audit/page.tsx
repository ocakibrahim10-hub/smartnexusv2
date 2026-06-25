'use client';

import { useState, useEffect } from 'react';
import { Shield, Filter } from 'lucide-react';
import { api } from '@/lib/api';

export default function AuditLogPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [entity, setEntity] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/ledger/audit-log', {
        params: { entity: entity || undefined, limit: 100 },
      });
      setRows(r.data.data || []);
      setTotal(r.data.total || 0);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [entity]);

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <Shield className="w-6 h-6 text-brand-600" />
          Denetim Kaydı
        </h1>
        <p className="text-sm text-gray-500">{total} kayıt — KVKK uyumlu işlem izi</p>
      </div>

      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Varlık filtresi (invoices, expenses...)"
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          className="input text-sm max-w-xs"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="p-3">Zaman</th>
                <th className="p-3">Kullanıcı</th>
                <th className="p-3">İşlem</th>
                <th className="p-3">Varlık</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="p-3 whitespace-nowrap text-xs text-gray-500">
                    {new Date(r.createdAt).toLocaleString('tr-TR')}
                  </td>
                  <td className="p-3">{r.userEmail || r.userId || '—'}</td>
                  <td className="p-3 font-mono text-xs">{r.action}</td>
                  <td className="p-3 text-gray-600">
                    {r.entity}
                    {r.entityId ? ` #${r.entityId.slice(0, 8)}` : ''}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">
                    Kayıt bulunamadı
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
