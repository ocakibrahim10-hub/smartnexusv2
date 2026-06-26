'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { FormField } from '@/components/FormField';
import { fmtMoney } from '@/lib/format';

export function BalanceSheetTab() {
  const [balanceSheet, setBalanceSheet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [asOf, setAsOf] = useState(new Date().toISOString().split('T')[0]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ledger/balance-sheet', { params: { asOf } });
      setBalanceSheet(res.data);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [asOf]);

  if (loading && !balanceSheet) return <div className="text-sm text-gray-500">Yükleniyor...</div>;
  if (!balanceSheet) return null;

  const fmt = (n: number) => fmtMoney(n);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Bilanço (Balance Sheet)</h2>
        <FormField
          label="Tarih itibarıyla"
          type="date"
          hideLabel
          value={asOf}
          onChange={(e) => setAsOf(e.target.value)}
          className="input text-sm py-1.5 px-3 w-36"
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Aktif (Assets) */}
        <div className="card p-0 overflow-hidden">
          <div className="bg-gray-50 p-3 border-b border-gray-100 font-semibold text-gray-700">
            Aktif (Varlıklar)
          </div>
          <table className="w-full text-sm">
            <tbody>
              {balanceSheet.assets.map((a: any) => (
                <tr key={a.id} className="border-b border-gray-50">
                  <td className="p-3 font-mono text-gray-500">{a.code}</td>
                  <td className="p-3">{a.name}</td>
                  <td className="p-3 text-right font-medium">{fmt(a.balance)}</td>
                </tr>
              ))}
              {balanceSheet.assets.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-gray-400">Varlık bulunamadı</td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={2} className="p-3 font-semibold text-right">Aktif Toplamı</td>
                <td className="p-3 text-right font-bold text-brand-600">{fmt(balanceSheet.totalAssets)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Pasif (Liabilities & Equities) */}
        <div className="space-y-6">
          <div className="card p-0 overflow-hidden">
            <div className="bg-gray-50 p-3 border-b border-gray-100 font-semibold text-gray-700">
              Pasif (Borçlar)
            </div>
            <table className="w-full text-sm">
              <tbody>
                {balanceSheet.liabilities.map((l: any) => (
                  <tr key={l.id} className="border-b border-gray-50">
                    <td className="p-3 font-mono text-gray-500">{l.code}</td>
                    <td className="p-3">{l.name}</td>
                    <td className="p-3 text-right font-medium">{fmt(l.balance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={2} className="p-3 font-semibold text-right">Kısa/Uzun Vadeli Yabancı Kaynak</td>
                  <td className="p-3 text-right font-bold text-red-600">{fmt(balanceSheet.totalLiabilities)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="bg-gray-50 p-3 border-b border-gray-100 font-semibold text-gray-700">
              Özkaynaklar
            </div>
            <table className="w-full text-sm">
              <tbody>
                {balanceSheet.equities.map((e: any) => (
                  <tr key={e.id} className="border-b border-gray-50">
                    <td className="p-3 font-mono text-gray-500">{e.code}</td>
                    <td className="p-3">{e.name}</td>
                    <td className="p-3 text-right font-medium">{fmt(e.balance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={2} className="p-3 font-semibold text-right">Özkaynak Toplamı</td>
                  <td className="p-3 text-right font-bold text-blue-600">{fmt(balanceSheet.totalEquities)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          <div className="card bg-gray-900 text-white p-4 flex justify-between items-center">
            <span className="font-semibold">Pasif Toplamı</span>
            <span className="text-xl font-bold">{fmt(balanceSheet.totalLiabilities + balanceSheet.totalEquities)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
