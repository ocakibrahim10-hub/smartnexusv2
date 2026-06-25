'use client';

import { toast } from '@/lib/toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Filter,
  FileText,
  Check,
  X,
  CreditCard,
  ChevronDown,
  Eye,
} from 'lucide-react';
import { api } from '@/lib/api';

type InvoiceType = 'SALES' | 'PURCHASE' | 'RETURN_SALES' | 'RETURN_PURCHASE';
type InvoiceStatus = 'DRAFT' | 'APPROVED' | 'PAID' | 'PARTIAL' | 'CANCELLED';

interface Invoice {
  id: string;
  invoiceNo: string;
  type: InvoiceType;
  status: InvoiceStatus;
  date: string;
  dueDate?: string;
  contact?: { id: string; name: string };
  subtotal: number;
  vatTotal: number;
  total: number;
  paidAmount: number;
}

const TYPE_LABELS: Record<InvoiceType, string> = {
  SALES: 'Satış',
  PURCHASE: 'Alış',
  RETURN_SALES: 'Satış İade',
  RETURN_PURCHASE: 'Alış İade',
};
const TYPE_COLORS: Record<InvoiceType, string> = {
  SALES: 'bg-blue-100 text-blue-700',
  PURCHASE: 'bg-purple-100 text-purple-700',
  RETURN_SALES: 'bg-orange-100 text-orange-700',
  RETURN_PURCHASE: 'bg-pink-100 text-pink-700',
};
const STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'Taslak',
  APPROVED: 'Onaylı',
  PAID: 'Ödendi',
  PARTIAL: 'Kısmi',
  CANCELLED: 'İptal',
};
const STATUS_COLORS: Record<InvoiceStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  APPROVED: 'bg-blue-100 text-blue-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  PARTIAL: 'bg-amber-100 text-amber-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

type ConfirmAction = { type: 'approve' | 'cancel'; id: string };

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [showNew, setShowNew] = useState(false);
  const [payModal, setPayModal] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('CASH');
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactSearch, setContactSearch] = useState('');

  // Yeni fatura form
  const [form, setForm] = useState({
    type: 'SALES',
    contactId: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    series: 'VD',
    lines: [
      { productId: '', description: '', quantity: 1, unitPrice: 0, discount: 0, vatRate: 20 },
    ],
  });
  const [products, setProducts] = useState<any[]>([]);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/invoices', {
        params: {
          search: search || undefined,
          type: typeFilter || undefined,
          status: statusFilter || undefined,
        },
      });
      setInvoices(r.data.data || []);
      setSummary(r.data.summary || {});
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [search, typeFilter, statusFilter]);
  useEffect(() => {
    api
      .get('/pos/products/grid')
      .then((r) => setProducts(r.data))
      .catch(() => {});
  }, []);

  const selectInvoice = async (inv: Invoice) => {
    const r = await api.get(`/invoices/${inv.id}`);
    setSelected(r.data);
  };

  const approve = (id: string) => { setConfirmAction({ type: 'approve', id }); };
  const doApprove = async (id: string) => {
    await api.patch(`/invoices/${id}/approve`);
    load();
    selectInvoice({ ...selected, id });
  };

  const cancel = (id: string) => { setConfirmAction({ type: 'cancel', id }); };
  const doCancel = async (id: string) => {
    await api.patch(`/invoices/${id}/cancel`);
    load();
    setSelected(null);
  };

  const addPayment = async () => {
    if (!payModal || !payAmount) return;
    await api.post(`/invoices/${payModal.id}/payments`, {
      amount: parseFloat(payAmount),
      method: payMethod,
    });
    setPayModal(null);
    setPayAmount('');
    load();
  };

  const handleContactSearch = async (q: string) => {
    setContactSearch(q);
    if (q.length < 2) {
      setContacts([]);
      return;
    }
    const r = await api.get('/contacts/quick-search', { params: { q } });
    setContacts(r.data);
  };

  const addLine = () =>
    setForm((f) => ({
      ...f,
      lines: [
        ...f.lines,
        { productId: '', description: '', quantity: 1, unitPrice: 0, discount: 0, vatRate: 20 },
      ],
    }));
  const removeLine = (i: number) =>
    setForm((f) => ({ ...f, lines: f.lines.filter((_, j) => j !== i) }));
  const updateLine = (i: number, field: string, value: any) => {
    setForm((f) => {
      const lines = [...f.lines];
      lines[i] = { ...lines[i], [field]: value };
      if (field === 'productId') {
        const p = products.find((p) => p.id === value);
        if (p)
          lines[i] = {
            ...lines[i],
            description: p.name,
            unitPrice: p.salePrice,
            vatRate: p.vatRate,
          };
      }
      return { ...f, lines };
    });
  };

  const formLines = form.lines;
  const formSubtotal = formLines.reduce(
    (s, l) => s + l.quantity * l.unitPrice * (1 - l.discount / 100),
    0,
  );
  const formVat = formLines.reduce(
    (s, l) => s + l.quantity * l.unitPrice * (1 - l.discount / 100) * (l.vatRate / 100),
    0,
  );
  const formTotal = formSubtotal + formVat;

  const saveInvoice = async () => {
    try {
      await api.post('/invoices', {
        ...form,
        lines: form.lines.map((l) => ({
          ...l,
          unitPrice: parseFloat(String(l.unitPrice)) || 0,
          quantity: parseFloat(String(l.quantity)) || 0,
        })),
      });
      setShowNew(false);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Kayıt başarısız');
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sol liste */}
      <div className="w-[400px] flex-shrink-0 flex flex-col border-r border-gray-100 bg-white">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-gray-900">Faturalar</h1>
            <button
              onClick={() => setShowNew(true)}
              className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Yeni Fatura
            </button>
          </div>

          {/* Özet kartları */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: 'Toplam Satış', value: summary.totalSales || 0 },
              { label: 'Bekleyen', value: summary.pending || 0 },
              { label: 'Tahsil', value: summary.collected || 0 },
            ].map((s) => (
              <div key={s.label} className="bg-gray-50 rounded-xl p-2 text-center">
                <div className="text-xs text-gray-500">{s.label}</div>
                <div className="text-sm font-bold text-gray-900">
                  ₺{(s.value / 1000).toFixed(1)}K
                </div>
              </div>
            ))}
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Fatura no, cari ara..."
            className="input text-sm mb-2"
          />
          <div className="flex gap-1">
            {['', 'SALES', 'PURCHASE'].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`flex-1 py-1 rounded-lg text-xs font-medium transition-colors ${typeFilter === t ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                {t ? TYPE_LABELS[t as InvoiceType] : 'Tümü'}
              </button>
            ))}
            {['', 'DRAFT', 'APPROVED', 'PAID'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`flex-1 py-1 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                {s ? STATUS_LABELS[s as InvoiceStatus] : '↕️'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 animate-pulse" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="w-9 h-9 rounded-xl bg-gray-100 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                    <div className="h-2 bg-gray-100 rounded w-1/2" />
                  </div>
                  <div className="h-4 bg-gray-100 rounded w-16" />
                </div>
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-blue-300" strokeWidth={1.5} />
              </div>
              <p className="text-gray-700 font-medium text-sm">Fatura bulunamadı</p>
              <p className="text-gray-400 text-xs mt-1">Filtrelerinizi değiştirin veya yeni fatura oluşturun.</p>
            </div>
          ) : (
            invoices.map((inv) => (
              <button
                key={inv.id}
                onClick={() => selectInvoice(inv)}
                className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${selected?.id === inv.id ? 'bg-indigo-50' : ''}`}
              >
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{inv.invoiceNo}</span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-md ${STATUS_COLORS[inv.status]}`}
                    >
                      {STATUS_LABELS[inv.status]}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">
                    {inv.contact?.name || 'Genel'}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(inv.date).toLocaleDateString('tr-TR')}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold text-gray-900">
                    ₺{inv.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </div>
                  {inv.paidAmount > 0 && inv.paidAmount < inv.total && (
                    <div className="text-xs text-amber-600">
                      ₺
                      {(inv.total - inv.paidAmount).toLocaleString('tr-TR', {
                        minimumFractionDigits: 0,
                      })}{' '}
                      kalan
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Sağ detay */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600">
            <FileText className="w-16 h-16 mb-4" />
            <p className="text-lg font-medium">Fatura seçin</p>
            <p className="text-sm mt-1">Detayları görmek için soldan fatura seçin</p>
          </div>
        ) : (
          <div className="max-w-3xl space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selected.invoiceNo}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-lg ${TYPE_COLORS[selected.type as InvoiceType]}`}
                  >
                    {TYPE_LABELS[selected.type]}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-lg ${STATUS_COLORS[selected.status as InvoiceStatus]}`}
                  >
                    {STATUS_LABELS[selected.status]}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(selected.date).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                {selected.status === 'DRAFT' && (
                  <>
                    <button
                      onClick={() => approve(selected.id)}
                      className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1"
                    >
                      <Check className="w-4 h-4" />
                      Onayla
                    </button>
                    <button
                      onClick={() => cancel(selected.id)}
                      className="btn-secondary text-sm px-3 py-1.5 flex items-center gap-1 text-red-600 border-red-200"
                    >
                      <X className="w-4 h-4" />
                      İptal
                    </button>
                  </>
                )}
                {(selected.status === 'APPROVED' || selected.status === 'PARTIAL') && (
                  <button
                    onClick={() => setPayModal(selected)}
                    className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1"
                  >
                    <CreditCard className="w-4 h-4" />
                    Tahsil Et
                  </button>
                )}
              </div>
            </div>

            {selected.contact && (
              <div className="card p-4">
                <div className="text-xs text-gray-400 mb-1">Cari</div>
                <div className="font-semibold">{selected.contact.name}</div>
              </div>
            )}

            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">
                      Ürün / Açıklama
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">
                      Miktar
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">
                      Birim Fiyat
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">
                      İndirim
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">KDV</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">
                      Tutar
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(selected.lines || []).map((l: any, i: number) => (
                    <tr key={i}>
                      <td className="px-4 py-3 text-sm">{l.description || l.product?.name}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        {l.quantity} {l.unit}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        ₺{l.unitPrice?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">{l.discount || 0}%</td>
                      <td className="px-4 py-3 text-sm text-right">%{l.vatRate}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-right">
                        ₺{l.lineTotal?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={5} className="px-4 py-2 text-right text-xs text-gray-500">
                      Ara Toplam
                    </td>
                    <td className="px-4 py-2 text-right text-sm">
                      ₺{selected.subtotal?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="px-4 py-2 text-right text-xs text-gray-500">
                      KDV
                    </td>
                    <td className="px-4 py-2 text-right text-sm">
                      ₺{selected.vatTotal?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="px-4 py-2 text-right text-sm font-bold">
                      TOPLAM
                    </td>
                    <td className="px-4 py-2 text-right text-base font-bold text-brand-600">
                      ₺{selected.total?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  {selected.paidAmount > 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-2 text-right text-xs text-emerald-600">
                        Ödenen
                      </td>
                      <td className="px-4 py-2 text-right text-sm text-emerald-600">
                        ₺
                        {selected.paidAmount?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                  {selected.paidAmount < selected.total && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-2 text-right text-xs text-red-600 font-bold"
                      >
                        Kalan
                      </td>
                      <td className="px-4 py-2 text-right text-sm font-bold text-red-600">
                        ₺
                        {(selected.total - selected.paidAmount)?.toLocaleString('tr-TR', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>

            {/* Ödemeler */}
            {selected.payments?.length > 0 && (
              <div className="card p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Ödeme Geçmişi</h3>
                <div className="space-y-2">
                  {selected.payments.map((p: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center">
                        <Check className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="flex-1">
                        {new Date(p.paidAt).toLocaleDateString('tr-TR')} · {p.method}
                      </div>
                      <div className="font-semibold text-emerald-600">
                        ₺{p.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tahsilat modal */}
      {payModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Tahsilat</h2>
            <p className="text-sm text-gray-500 mb-4">
              {payModal.invoiceNo} · Kalan: ₺
              {(payModal.total - payModal.paidAmount).toLocaleString('tr-TR', {
                minimumFractionDigits: 2,
              })}
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Tutar</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="input"
                  placeholder={`₺${(payModal.total - payModal.paidAmount).toFixed(2)}`}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Ödeme Yöntemi</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="input"
                  aria-label="Ödeme yöntemi"
                >
                  <option value="CASH">Nakit</option>
                  <option value="CARD">Kredi Kartı</option>
                  <option value="WIRE">Havale/EFT</option>
                  <option value="CHECK">Çek</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setPayModal(null)} className="btn-secondary flex-1">
                İptal
              </button>
              <button
                onClick={addPayment}
                disabled={!payAmount}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                Tahsil Et
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Yeni fatura modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Yeni Fatura</h2>
              <button
                onClick={() => setShowNew(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Modalı kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Tür</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="input"
                    aria-label="Fatura türü"
                  >
                    <option value="SALES">Satış</option>
                    <option value="PURCHASE">Alış</option>
                    <option value="RETURN_SALES">Satış İade</option>
                    <option value="RETURN_PURCHASE">Alış İade</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Tarih</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="input"
                    aria-label="Fatura tarihi"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Vade</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="input"
                    aria-label="Vade tarihi"
                  />
                </div>
              </div>
              <div className="relative">
                <label className="text-xs text-gray-500 mb-1 block">Cari</label>
                <input
                  value={contactSearch}
                  onChange={(e) => handleContactSearch(e.target.value)}
                  placeholder="Cari arayın..."
                  className="input"
                />
                {contacts.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                    {contacts.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setForm({ ...form, contactId: c.id });
                          setContactSearch(c.name);
                          setContacts([]);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0"
                      >
                        {c.name} <span className="text-xs text-gray-400">{c.taxNo}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Ürün satırları */}
              <div>
                <label className="text-xs text-gray-500 mb-2 block">Ürünler / Hizmetler</label>
                <div className="space-y-2">
                  {form.lines.map((l, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <select
                        value={l.productId}
                        onChange={(e) => updateLine(i, 'productId', e.target.value)}
                        className="input flex-1 text-sm"
                        aria-label="Ürün seçin"
                      >
                        <option value="">Ürün seçin...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={l.quantity}
                        onChange={(e) => updateLine(i, 'quantity', parseFloat(e.target.value) || 0)}
                        className="input w-20 text-sm"
                        placeholder="Adet"
                      />
                      <input
                        type="number"
                        value={l.unitPrice}
                        onChange={(e) =>
                          updateLine(i, 'unitPrice', parseFloat(e.target.value) || 0)
                        }
                        className="input w-24 text-sm"
                        placeholder="Fiyat"
                      />
                      <input
                        type="number"
                        value={l.discount}
                        onChange={(e) => updateLine(i, 'discount', parseFloat(e.target.value) || 0)}
                        className="input w-16 text-sm"
                        placeholder="İndirim%"
                      />
                      <select
                        value={l.vatRate}
                        onChange={(e) => updateLine(i, 'vatRate', parseInt(e.target.value))}
                        className="input w-20 text-sm"
                        aria-label="KDV oranı"
                      >
                        <option value={0}>%0</option>
                        <option value={1}>%1</option>
                        <option value={10}>%10</option>
                        <option value={20}>%20</option>
                      </select>
                      {form.lines.length > 1 && (
                        <button
                          onClick={() => removeLine(i)}
                          className="text-red-400 hover:text-red-600 mt-2"
                          aria-label="Satırı sil"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={addLine}
                  className="mt-2 text-xs text-brand-500 hover:text-brand-700 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Satır Ekle
                </button>
              </div>

              {/* Toplamlar */}
              <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
                <div className="flex justify-between text-gray-500">
                  <span>Ara Toplam</span>
                  <span>₺{formSubtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>KDV</span>
                  <span>₺{formVat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900">
                  <span>Toplam</span>
                  <span>₺{formTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setShowNew(false)} className="btn-secondary px-4 py-2">
                İptal
              </button>
              <button onClick={saveInvoice} className="btn-primary px-4 py-2">
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction?.type === 'approve' ? 'Faturayı Onayla' : 'Faturayı İptal Et'}
        message={confirmAction?.type === 'approve'
          ? 'Bu faturayı onaylamak istediğinize emin misiniz? Onaylanan fatura düzenlenemez.'
          : 'Bu faturayı iptal etmek istediğinize emin misiniz?'}
        confirmLabel={confirmAction?.type === 'approve' ? 'Onayla' : 'İptal Et'}
        variant={confirmAction?.type === 'cancel' ? 'danger' : 'default'}
        onConfirm={async () => {
          if (!confirmAction) return;
          if (confirmAction.type === 'approve') await doApprove(confirmAction.id);
          else await doCancel(confirmAction.id);
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
