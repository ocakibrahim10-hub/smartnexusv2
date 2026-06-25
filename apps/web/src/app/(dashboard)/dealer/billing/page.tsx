'use client';

import { useEffect, useState } from 'react';
import { Receipt, AlertCircle, CheckCircle } from 'lucide-react';
import { fmtMoney } from '@/lib/format';
import { api } from '@/lib/api';

type BillingData = {
  summary: { totalDue: number; paid: number; pending: number };
  invoices: Array<{
    id: string;
    type: string;
    description: string;
    amount: number;
    status: string;
    dueDate: string;
    paidAt: string | null;
  }>;
};

export default function DealerBillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/reports/dealer/billing')
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-gray-400">Yükleniyor…</div>;
  if (!data) return <div className="p-6 text-gray-400">Veri yüklenemedi.</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Receipt className="text-indigo-400" /> Platform Faturaları
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          SmartNexus platform abonelik ve komisyon faturalarınız
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="kpi-card">
          <div className="text-gray-400 text-sm mb-1">Ödenen</div>
          <div className="text-2xl font-bold text-emerald-600">{fmtMoney(data.summary.paid)}</div>
        </div>
        <div className="kpi-card">
          <div className="text-gray-400 text-sm mb-1">Bekleyen Tutar</div>
          <div className="text-2xl font-bold text-amber-400">{fmtMoney(data.summary.totalDue)}</div>
        </div>
        <div className="kpi-card">
          <div className="text-gray-400 text-sm mb-1">Bekleyen Fatura</div>
          <div className="page-title">{data.summary.pending}</div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs border-b border-gray-200">
              <th className="text-left py-2">Açıklama</th>
              <th className="text-left py-2">Tür</th>
              <th className="text-left py-2">Vade</th>
              <th className="text-right py-2">Tutar</th>
              <th className="text-right py-2">Durum</th>
            </tr>
          </thead>
          <tbody>
            {data.invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-gray-100">
                <td className="py-3 text-gray-900">{inv.description}</td>
                <td className="py-3 text-gray-400">
                  {inv.type === 'PLATFORM' ? 'Platform' : 'Komisyon'}
                </td>
                <td className="py-3 text-gray-400">
                  {new Date(inv.dueDate).toLocaleDateString('tr-TR')}
                </td>
                <td className="py-3 text-right text-gray-900 font-medium">
                  {fmtMoney(inv.amount)}
                </td>
                <td className="py-3 text-right">
                  {inv.status === 'PAID' ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 text-xs">
                      <CheckCircle size={12} /> Ödendi
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-400 text-xs">
                      <AlertCircle size={12} /> Bekliyor
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
