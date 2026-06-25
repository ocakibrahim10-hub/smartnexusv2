'use client';

import { useState, useEffect } from 'react';
import { BookOpen, FileText, TrendingUp, Download } from 'lucide-react';
import { api } from '@/lib/api';
import { FormField } from '@/components/FormField';
import { fmtMoney } from '@/lib/format';

type LedgerTab = 'trial' | 'journal' | 'income';

const fmt = (n: number) => fmtMoney(n);

export default function LedgerPage() {
  const [tab, setTab] = useState<LedgerTab>('trial');
  const [asOf, setAsOf] = useState(new Date().toISOString().split('T')[0]);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [trial, setTrial] = useState<any>(null);
  const [journal, setJournal] = useState<any>(null);
  const [income, setIncome] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      if (tab === 'trial') {
        const r = await api.get('/ledger/trial-balance', { params: { asOf } });
        setTrial(r.data);
      } else if (tab === 'journal') {
        const r = await api.get('/ledger/journal', { params: { limit: 50 } });
        setJournal(r.data);
      } else {
        const r = await api.get('/ledger/income-statement', {
          params: { startDate: dateRange.start, endDate: dateRange.end },
        });
        setIncome(r.data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tab, asOf, dateRange]);

  const exportCsv = async () => {
    try {
      const res = await api.get('/export/invoices.csv', {
        params: { startDate: dateRange.start, endDate: dateRange.end },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'faturalar.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
    }
  };

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      <div className="page-header">
        <h1 className="page-title">Genel Muhasebe</h1>
        <button type="button" onClick={exportCsv} className="btn-secondary text-sm flex items-center gap-2">
          <Download className="w-4 h-4" />
          Fatura CSV
        </button>
      </div>

      <div className="tab-group">
        {[
          { key: 'trial', label: 'Mizan', icon: BookOpen },
          { key: 'journal', label: 'Yevmiye', icon: FileText },
          { key: 'income', label: 'Gelir Tablosu', icon: TrendingUp },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key as LedgerTab)}
            className={`tab-pill ${tab === key ? 'tab-pill-active' : ''}`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'trial' && (
        <FormField
          label="Tarih itibarıyla"
          type="date"
          value={asOf}
          onChange={(e) => setAsOf(e.target.value)}
          className="input text-sm py-1.5 px-3 w-36"
        />
      )}

      {tab === 'income' && (
        <div className="flex items-center gap-3">
          <FormField
            label="Başlangıç tarihi"
            hideLabel
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="input text-sm py-1.5 px-3 w-36"
          />
          <span className="text-gray-400">—</span>
          <FormField
            label="Bitiş tarihi"
            hideLabel
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="input text-sm py-1.5 px-3 w-36"
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {tab === 'trial' && trial && (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="p-3">Hesap</th>
                    <th className="p-3">Ad</th>
                    <th className="p-3 text-right">Borç</th>
                    <th className="p-3 text-right">Alacak</th>
                    <th className="p-3 text-right">Bakiye</th>
                  </tr>
                </thead>
                <tbody>
                  {(trial.rows || []).map((r: any) => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="p-3 font-mono">{r.code}</td>
                      <td className="p-3">{r.name}</td>
                      <td className="p-3 text-right">{fmt(r.debit)}</td>
                      <td className="p-3 text-right">{fmt(r.credit)}</td>
                      <td className="p-3 text-right font-medium">{fmt(r.balance)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={2} className="p-3">
                      Toplam
                    </td>
                    <td className="p-3 text-right">{fmt(trial.totalDebit)}</td>
                    <td className="p-3 text-right">{fmt(trial.totalCredit)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {tab === 'journal' && journal && (
            <div className="space-y-4">
              {(journal.data || []).map((entry: any) => (
                <div key={entry.id} className="card p-4">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">{entry.description}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(entry.date).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                  <table className="w-full text-xs">
                    <tbody>
                      {(entry.lines || []).map((l: any) => (
                        <tr key={l.id} className="border-t border-gray-50">
                          <td className="py-1.5">
                            {l.account?.code} — {l.account?.name}
                          </td>
                          <td className="py-1.5 text-right">{l.debit > 0 ? fmt(l.debit) : ''}</td>
                          <td className="py-1.5 text-right">{l.credit > 0 ? fmt(l.credit) : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {tab === 'income' && income && (
            <div className="grid grid-cols-3 gap-4">
              <div className="kpi-card">
                <p className="text-sm text-gray-500">Gelirler</p>
                <p className="text-2xl font-bold text-emerald-600">{fmt(income.revenue)}</p>
              </div>
              <div className="kpi-card">
                <p className="text-sm text-gray-500">Giderler</p>
                <p className="text-2xl font-bold text-red-600">{fmt(income.expenses)}</p>
              </div>
              <div className="kpi-card">
                <p className="text-sm text-gray-500">Net Kar</p>
                <p
                  className={`text-2xl font-bold ${income.netIncome >= 0 ? 'text-brand-600' : 'text-red-600'}`}
                >
                  {fmt(income.netIncome)}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
