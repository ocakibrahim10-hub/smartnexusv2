'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { platformApi } from '@/lib/api';
import { fmtMoney } from '@/lib/format';
import { getUser } from '@/lib/auth';

export default function CommissionInvoicesAdminPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const user = getUser();
  const isAdmin = user?.tenantType === 'SUPERADMIN';

  const load = () => platformApi.getCommissionInvoices().then(setInvoices).catch(() => {});
  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    await platformApi.updateCommissionInvoiceStatus(id, { status });
    load();
  };

  return (
    <>
      <TopBar title="Hakediş Faturaları" subtitle="Bayilerin platforma kestiği hakediş faturaları" />
      <div className="p-6">
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Bayi</th>
                <th className="text-left p-3">Dönem</th>
                <th className="text-left p-3">Entegratör</th>
                <th className="text-right p-3">Tutar</th>
                <th className="text-left p-3">Durum</th>
                {isAdmin && <th className="p-3">İşlem</th>}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-gray-100">
                  <td className="p-3">{inv.dealer?.name}</td>
                  <td className="p-3 text-gray-500">
                    {new Date(inv.periodStart).toLocaleDateString('tr-TR')} — {new Date(inv.periodEnd).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="p-3">{inv.integratorName}</td>
                  <td className="p-3 text-right font-medium">{fmtMoney(inv.amount)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                      inv.status === 'SENT' ? 'bg-blue-100 text-blue-700' :
                      inv.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{inv.status}</span>
                  </td>
                  {isAdmin && (
                    <td className="p-3 space-x-1">
                      {inv.status === 'SENT' && (
                        <>
                          <button onClick={() => updateStatus(inv.id, 'APPROVED')} className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg">Onayla</button>
                          <button onClick={() => updateStatus(inv.id, 'REJECTED')} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-lg">Reddet</button>
                        </>
                      )}
                      {inv.status === 'APPROVED' && (
                        <button onClick={() => updateStatus(inv.id, 'PAID')} className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg">Ödendi</button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {invoices.length === 0 && (
            <div className="p-8 text-center text-gray-400">Henüz hakediş faturası yok</div>
          )}
        </div>
      </div>
    </>
  );
}
