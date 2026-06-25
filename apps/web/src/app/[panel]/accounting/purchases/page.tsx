'use client';

import { useState, useEffect, useCallback } from 'react';
import { Package, RefreshCw, Download, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { FormField } from '@/components/FormField';

const fmt = (n: number) => `₺${n.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString('tr-TR');

type PurchaseInvoice = {
  id: string;
  series: string;
  number: number;
  invoiceNo?: string;
  status: string;
  total: number;
  paidAmount?: number;
  date: string;
  externalNumber?: string | null;
  contact: { name: string; taxNo?: string | null };
};

export default function PurchasesPage() {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/invoices', {
        params: { type: 'PURCHASE', limit: 100, search: search || undefined },
      });
      setInvoices(r.data.data || []);
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const syncInbox = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const r = await api.post('/invoices/einvoice/sync-inbox', { autoApprove: false });
      setSyncResult(r.data);
      toast.info(
        `${r.data.imported || 0} fatura içe aktarıldı, ${r.data.skipped || 0} atlandı`,
      );
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gelen e-fatura senkronu başarısız');
    } finally {
      setSyncing(false);
    }
  };

  const approve = async (id: string) => {
    try {
      await api.patch(`/invoices/${id}/approve`);
      toast.info('Alış faturası onaylandı, stok girişi yapıldı');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Onay başarısız');
    }
  };

  const summary = {
    total: invoices.length,
    draft: invoices.filter((i) => i.status === 'DRAFT').length,
    approved: invoices.filter((i) => i.status === 'APPROVED').length,
    amount: invoices.reduce((s, i) => s + i.total, 0),
  };

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Package className="text-indigo-400" />
            Malzeme Alış
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Alış faturaları · Uyumsoft gelen e-fatura · stok girişi
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} />
            Yenile
          </button>
          <button
            type="button"
            onClick={syncInbox}
            disabled={syncing}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Download size={14} />
            {syncing ? 'Çekiliyor…' : 'Gelen E-Faturaları Çek'}
          </button>
        </div>
      </div>

      {syncResult && (
        <div className="card p-4 border-indigo-200 bg-indigo-50 text-indigo-900 text-sm">
          <strong>Son senkron:</strong> {syncResult.imported} içe aktarıldı · {syncResult.skipped}{' '}
          atlandı
          {(syncResult.errors?.length || 0) > 0 && (
            <span className="text-red-700"> · {syncResult.errors.length} hata</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="kpi-card">
          <div className="text-sm text-gray-500 mb-1">Toplam Alış</div>
          <div className="text-2xl font-bold">{summary.total}</div>
        </div>
        <div className="kpi-card">
          <div className="text-sm text-gray-500 mb-1">Taslak</div>
          <div className="text-2xl font-bold text-amber-600">{summary.draft}</div>
        </div>
        <div className="kpi-card">
          <div className="text-sm text-gray-500 mb-1">Onaylı</div>
          <div className="text-2xl font-bold text-emerald-600">{summary.approved}</div>
        </div>
        <div className="kpi-card">
          <div className="text-sm text-gray-500 mb-1">Toplam Tutar</div>
          <div className="text-2xl font-bold">{fmt(summary.amount)}</div>
        </div>
      </div>

      <div className="flex gap-3">
        <FormField
          label="Tedarikçi ara"
          hideLabel
          className="input max-w-sm"
          placeholder="Tedarikçi ara…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Fatura</th>
              <th className="text-left px-4 py-3">Tedarikçi</th>
              <th className="text-left px-4 py-3">Tarih</th>
              <th className="text-left px-4 py-3">Durum</th>
              <th className="text-right px-4 py-3">Tutar</th>
              <th className="text-right px-4 py-3">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Yükleniyor…
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Alış faturası yok. Uyumsoft gelen kutusundan çekebilirsiniz.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    {inv.invoiceNo || `${inv.series}${inv.number}`}
                    {inv.externalNumber && (
                      <div className="text-xs text-gray-400">E-Fatura: {inv.externalNumber}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {inv.contact?.name}
                    {inv.contact?.taxNo && (
                      <div className="text-xs text-gray-400">VKN: {inv.contact.taxNo}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">{fmtDate(inv.date)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        inv.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : inv.status === 'DRAFT'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{fmt(inv.total)}</td>
                  <td className="px-4 py-3 text-right">
                    {inv.status === 'DRAFT' && (
                      <button
                        type="button"
                        onClick={() => approve(inv.id)}
                        className="btn-primary text-xs px-3 py-1 inline-flex items-center gap-1"
                      >
                        <CheckCircle size={12} />
                        Onayla
                      </button>
                    )}
                    {inv.status === 'APPROVED' && (
                      <span className="text-emerald-600 inline-flex items-center gap-1 text-xs">
                        <CheckCircle size={12} /> Stok girişi OK
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="card p-4 flex gap-3 text-sm text-gray-600">
        <AlertCircle className="w-5 h-5 shrink-0 text-indigo-500" />
        <div>
          Uyumsoft entegrasyonu için <code className="text-xs bg-gray-100 px-1 rounded">UYUMSOFT_USERNAME</code>{' '}
          ve <code className="text-xs bg-gray-100 px-1 rounded">UYUMSOFT_PASSWORD</code> ortam değişkenlerini
          tanımlayın. Test: <code className="text-xs bg-gray-100 px-1 rounded">efatura-test.uyumsoft.com.tr</code>
        </div>
      </div>
    </div>
  );
}
