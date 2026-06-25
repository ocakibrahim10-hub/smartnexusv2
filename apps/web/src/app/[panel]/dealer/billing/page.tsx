'use client';

import { toast } from '@/lib/toast';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import TopBar from '@/components/layout/TopBar';
import {
  Receipt,
  Send,
  Plus,
  Wallet,
  Clock,
  CheckCircle,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { FormField } from '@/components/FormField';
import { fmtMoney } from '@/lib/format';
import { api, platformApi } from '@/lib/api';
import { getUser } from '@/lib/auth';

const COMMISSION_STATUS: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Taslak', className: 'bg-gray-100 text-gray-600' },
  SENT: { label: 'Gönderildi', className: 'bg-blue-50 text-blue-700' },
  APPROVED: { label: 'Onaylandı', className: 'bg-indigo-50 text-indigo-700' },
  PAID: { label: 'Ödendi', className: 'bg-emerald-50 text-emerald-700' },
  REJECTED: { label: 'Reddedildi', className: 'bg-red-50 text-red-700' },
};

export default function DealerBillingPage() {
  const params = useParams();
  const panel = (params?.panel as string) || 'bayi';
  const [billing, setBilling] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    periodStart: '',
    periodEnd: '',
    amount: '',
    integratorName: 'Uyumsoft',
    invoiceNo: '',
    description: '',
  });
  const user = getUser();
  const isDealer = user?.tenantType === 'DEALER';

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/reports/dealer/billing').then((r) => r.data),
      platformApi.getCommissionInvoices(),
    ])
      .then(([b, inv]) => {
        setBilling(b);
        setInvoices(Array.isArray(inv) ? inv : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const createAndSend = async () => {
    if (!form.periodStart || !form.periodEnd || !form.amount || !form.invoiceNo) {
      toast.info('Dönem, tutar ve fatura numarası zorunludur');
      return;
    }
    setSubmitting(true);
    try {
      const inv = await platformApi.createCommissionInvoice({
        ...form,
        amount: parseFloat(form.amount),
      });
      await platformApi.sendCommissionInvoice(inv.id);
      setForm({
        periodStart: '',
        periodEnd: '',
        amount: '',
        integratorName: 'Uyumsoft',
        invoiceNo: '',
        description: '',
      });
      load();
      toast.success('Hakediş faturası platform yöneticisine gönderildi.');
    } catch {
      toast.info('Fatura gönderilemedi');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-full">
        <TopBar title="Hakediş Faturası" subtitle="Yükleniyor…" />
        <div className="p-6 text-gray-400">Yükleniyor…</div>
      </div>
    );
  }

  const statusBadge = (status: string) => {
    const cfg = COMMISSION_STATUS[status] || { label: status, className: 'bg-gray-100 text-gray-600' };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.className}`}>
        {cfg.label}
      </span>
    );
  };

  return (
    <div className="flex flex-col min-h-full">
      <TopBar
        title="Hakediş Faturası"
        subtitle="Entegratör üzerinden kesilen faturaları platforma bildirin — e-fatura entegrasyonu"
      />

      <div className="p-6 space-y-6 flex-1">
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/${panel}/dealer/commission`}
            className="btn-secondary text-sm inline-flex items-center gap-1"
          >
            <Wallet size={14} /> Hakediş Raporu
            <ArrowRight size={14} />
          </Link>
        </div>

        {billing && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="kpi-card">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400 text-sm">Tahsil Edilen</span>
                <CheckCircle size={18} className="text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-emerald-600">{fmtMoney(billing.summary?.paid)}</div>
            </div>
            <div className="kpi-card">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400 text-sm">Bekleyen</span>
                <Clock size={18} className="text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-amber-600">{fmtMoney(billing.summary?.totalDue)}</div>
            </div>
            <div className="kpi-card">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400 text-sm">Açık Kalem</span>
                <FileText size={18} className="text-indigo-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{billing.summary?.pending ?? 0}</div>
            </div>
          </div>
        )}

        {isDealer && (
          <div className="modal-card p-5">
            <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <Plus size={18} className="text-[#606BDF]" />
              Yeni Hakediş Faturası
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              E-fatura entegratörünüzde kestiğiniz hakediş faturasını buradan platforma iletin.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              <FormField
                label="Dönem başlangıç *"
                type="date"
                className="input w-full"
                value={form.periodStart}
                onChange={(e) => setForm({ ...form, periodStart: e.target.value })}
              />
              <FormField
                label="Dönem bitiş *"
                type="date"
                className="input w-full"
                value={form.periodEnd}
                onChange={(e) => setForm({ ...form, periodEnd: e.target.value })}
              />
              <FormField
                label="Tutar (₺) *"
                type="number"
                className="input w-full"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
              <FormField
                label="Entegratör"
                className="input w-full"
                value={form.integratorName}
                onChange={(e) => setForm({ ...form, integratorName: e.target.value })}
              />
              <FormField
                label="Fatura No *"
                className="input w-full"
                value={form.invoiceNo}
                onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })}
              />
              <FormField
                label="Açıklama"
                className="input w-full sm:col-span-2 lg:col-span-1"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Opsiyonel not"
              />
            </div>
            <button
              type="button"
              onClick={createAndSend}
              disabled={submitting}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Send size={16} />
              {submitting ? 'Gönderiliyor…' : 'Platforma Gönder'}
            </button>
          </div>
        )}

        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-900 flex items-center gap-2">
            <Receipt size={16} className="text-[#606BDF]" />
            Sistem Hakediş Faturaları
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs border-b border-gray-100 bg-[#FBF8FF]">
                  <th className="text-left p-3 font-medium">Dönem</th>
                  <th className="text-left p-3 font-medium">Entegratör</th>
                  <th className="text-left p-3 font-medium">Fatura No</th>
                  <th className="text-right p-3 font-medium">Tutar</th>
                  <th className="text-left p-3 font-medium">Durum</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400">
                      Henüz hakediş faturası gönderilmedi
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="border-t border-gray-50 hover:bg-[#FBF8FF]">
                      <td className="p-3">
                        {new Date(inv.periodStart).toLocaleDateString('tr-TR')} —{' '}
                        {new Date(inv.periodEnd).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="p-3 text-gray-600">{inv.integratorName || '—'}</td>
                      <td className="p-3 text-gray-600">{inv.invoiceNo || '—'}</td>
                      <td className="p-3 text-right font-semibold text-gray-900">
                        {fmtMoney(inv.amount)}
                      </td>
                      <td className="p-3">{statusBadge(inv.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {billing?.invoices?.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-900">
              Platform & Komisyon Kalemleri
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-xs border-b border-gray-100">
                    <th className="text-left p-3">Açıklama</th>
                    <th className="text-left p-3">Tür</th>
                    <th className="text-right p-3">Tutar</th>
                    <th className="text-left p-3">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {billing.invoices.map((inv: any) => (
                    <tr key={inv.id} className="border-t border-gray-50">
                      <td className="p-3 text-gray-900">{inv.description}</td>
                      <td className="p-3 text-gray-500 text-xs">
                        {inv.type === 'PLATFORM' ? 'Platform' : 'Komisyon'}
                      </td>
                      <td className="p-3 text-right font-medium">{fmtMoney(inv.amount)}</td>
                      <td className="p-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-800'
                          }`}
                        >
                          {inv.status === 'PAID' ? 'Ödendi' : 'Bekliyor'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
