'use client';

import { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  Truck,
  Package,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';

type B2BOrder = {
  id: string;
  code: string;
  status: string;
  subtotal: number;
  vatTotal: number;
  total: number;
  notes: string | null;
  requestedAt: string;
  approvedAt: string | null;
  contact: { id: string; name: string; city: string | null; phone: string | null };
  lines: {
    id: string;
    quantity: number;
    unitPrice: number;
    total: number;
    product: { name: string; unit: string };
  }[];
};

type Contact = { id: string; name: string; city: string | null };
type Product = { id: string; name: string; salePrice: number | null; unit: string };

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  DRAFT: { label: 'Taslak', color: 'text-gray-400', bg: 'bg-gray-500/20', icon: AlertCircle },
  PENDING: {
    label: 'Onay Bekliyor',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/20',
    icon: Clock,
  },
  APPROVED: { label: 'Onaylandı', color: 'text-blue-400', bg: 'bg-blue-500/20', icon: CheckCircle },
  PROCESSING: {
    label: 'Hazırlanıyor',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/20',
    icon: Package,
  },
  SHIPPED: { label: 'Kargoda', color: 'text-orange-400', bg: 'bg-orange-500/20', icon: Truck },
  DELIVERED: {
    label: 'Teslim Edildi',
    color: 'text-emerald-600',
    bg: 'bg-emerald-500/20',
    icon: CheckCircle,
  },
  CANCELLED: { label: 'İptal', color: 'text-red-400', bg: 'bg-red-500/20', icon: XCircle },
};

const ACTIONS: Record<string, { next: string; label: string; api: string }[]> = {
  DRAFT: [{ next: 'PENDING', label: 'Onayla İçin Gönder', api: 'submit' }],
  PENDING: [
    { next: 'APPROVED', label: 'Onayla', api: 'approve' },
    { next: 'CANCELLED', label: 'Reddet', api: 'cancel' },
  ],
  APPROVED: [{ next: 'PROCESSING', label: 'İşleme Al', api: 'process' }],
  PROCESSING: [{ next: 'SHIPPED', label: 'Kargoya Ver', api: 'ship' }],
  SHIPPED: [{ next: 'DELIVERED', label: 'Teslim Edildi', api: 'deliver' }],
};

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('tr-TR') : '—');
const fmtMoney = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺';

export default function B2BOrdersPage() {
  const [orders, setOrders] = useState<B2BOrder[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<B2BOrder | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [form, setForm] = useState({
    contactId: '',
    notes: '',
    lines: [{ productId: '', quantity: 1, unitPrice: 0 }],
  });

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page: String(page), limit: '20' });
      if (filterStatus) p.set('status', filterStatus);
      if (search) p.set('search', search);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/b2b/orders?${p}`,
        { headers },
      );
      const data = await res.json();
      setOrders(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setOrders([]);
    }
    setLoading(false);
  };

  const fetchSupport = async () => {
    try {
      const [cr, pr] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/b2b/customers`, {
          headers,
        }).then((r) => r.json()),
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/products?limit=200`,
          { headers },
        ).then((r) => r.json()),
      ]);
      setContacts(Array.isArray(cr) ? cr : []);
      setProducts(pr.items || []);
    } catch {}
  };

  useEffect(() => {
    fetchOrders();
  }, [filterStatus, search, page]);
  useEffect(() => {
    fetchSupport();
  }, []);

  const refreshSelected = async (id: string) => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/b2b/orders/${id}`,
      { headers },
    );
    const data = await res.json();
    setSelected(data);
    fetchOrders();
  };

  const doAction = async (api: string) => {
    if (!selected) return;
    setActionLoading(api);
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/b2b/orders/${selected.id}/${api}`,
        { method: 'PATCH', headers },
      );
      await refreshSelected(selected.id);
    } catch {}
    setActionLoading('');
  };

  const addLine = () =>
    setForm((f) => ({ ...f, lines: [...f.lines, { productId: '', quantity: 1, unitPrice: 0 }] }));
  const removeLine = (i: number) =>
    setForm((f) => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }));
  const updateLine = (i: number, field: string, value: any) => {
    setForm((f) => {
      const lines = [...f.lines];
      (lines[i] as any)[field] = value;
      if (field === 'productId') {
        const p = products.find((p) => p.id === value);
        if (p) lines[i].unitPrice = p.salePrice || 0;
      }
      return { ...f, lines };
    });
  };

  const createOrder = async () => {
    setSaving(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/b2b/orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contactId: form.contactId,
          notes: form.notes || undefined,
          lines: form.lines
            .filter((l) => l.productId)
            .map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice })),
        }),
      });
      setShowModal(false);
      setForm({ contactId: '', notes: '', lines: [{ productId: '', quantity: 1, unitPrice: 0 }] });
      fetchOrders();
    } catch {}
    setSaving(false);
  };

  const lineTotal = form.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

  // status counts
  const counts: Record<string, number> = {};
  for (const o of orders) counts[o.status] = (counts[o.status] || 0) + 1;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ShoppingCart className="text-indigo-400" />
            B2B Siparişler
          </h1>
          <p className="text-gray-500 text-sm mt-1">Kurumsal müşteri siparişlerini yönetin</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Yeni Sipariş
        </button>
      </div>

      {/* Status pills */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => {
            setFilterStatus('');
            setPage(1);
          }}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!filterStatus ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Tümü ({total})
        </button>
        {Object.entries(STATUS_CFG).map(([k, v]) => {
          const Icon = v.icon;
          return (
            <button
              key={k}
              onClick={() => {
                setFilterStatus(k);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 transition-colors ${filterStatus === k ? `${v.bg} ${v.color}` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              <Icon size={10} />
              {v.label} {counts[k] ? `(${counts[k]})` : ''}
            </button>
          );
        })}
      </div>

      <div className="flex gap-4 h-[calc(100vh-330px)]">
        {/* Left list */}
        <div className="w-96 flex flex-col gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9 text-sm w-full"
              placeholder="Sipariş kodu veya müşteri…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {loading ? (
              <div className="text-center text-gray-400 py-8">Yükleniyor…</div>
            ) : orders.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sipariş bulunamadı</p>
              </div>
            ) : (
              orders.map((o) => {
                const cfg = STATUS_CFG[o.status] || STATUS_CFG.DRAFT;
                const Icon = cfg.icon;
                return (
                  <div
                    key={o.id}
                    onClick={() => setSelected(selected?.id === o.id ? null : o)}
                    className={`card cursor-pointer transition-all border-l-4 ${selected?.id === o.id ? 'border-l-indigo-500 bg-indigo-500/10' : 'border-l-transparent hover:border-l-indigo-500/50'}`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <div className="text-gray-900 font-semibold text-sm">{o.code}</div>
                        <div className="text-gray-400 text-xs">{o.contact.name}</div>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${cfg.bg} ${cfg.color}`}
                      >
                        <Icon size={10} />
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-gray-400 text-xs">{fmt(o.requestedAt)}</span>
                      <span className="text-gray-900 font-bold text-sm">{fmtMoney(o.total)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {total > 20 && (
            <div className="flex gap-2 justify-center">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="btn-secondary text-xs px-3 py-1 disabled:opacity-40"
              >
                ←
              </button>
              <span className="text-gray-400 text-xs self-center">
                {page} / {Math.ceil(total / 20)}
              </span>
              <button
                disabled={page >= Math.ceil(total / 20)}
                onClick={() => setPage((p) => p + 1)}
                className="btn-secondary text-xs px-3 py-1 disabled:opacity-40"
              >
                →
              </button>
            </div>
          )}
        </div>

        {/* Right detail */}
        <div className="flex-1 overflow-y-auto">
          {!selected ? (
            <div className="card h-full flex items-center justify-center">
              <div className="text-center text-gray-400">
                <ShoppingCart size={48} className="mx-auto mb-3 opacity-20" />
                <p>Detay için bir sipariş seçin</p>
              </div>
            </div>
          ) : (
            (() => {
              const cfg = STATUS_CFG[selected.status] || STATUS_CFG.DRAFT;
              const Icon = cfg.icon;
              const actions = ACTIONS[selected.status] || [];
              return (
                <div className="space-y-4">
                  {/* Header */}
                  <div className="card">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{selected.code}</h2>
                        <p className="text-gray-400 text-sm">
                          {selected.contact.name} — {selected.contact.city || ''}
                        </p>
                        {selected.contact.phone && (
                          <p className="text-gray-500 text-xs">{selected.contact.phone}</p>
                        )}
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full flex items-center gap-1.5 text-sm font-medium ${cfg.bg} ${cfg.color}`}
                      >
                        <Icon size={14} />
                        {cfg.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-gray-50 rounded p-3">
                        <div className="text-gray-400 text-xs">Sipariş Tarihi</div>
                        <div className="text-gray-900 text-sm font-medium mt-1">
                          {fmt(selected.requestedAt)}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded p-3">
                        <div className="text-gray-400 text-xs">Onay Tarihi</div>
                        <div className="text-gray-900 text-sm font-medium mt-1">
                          {fmt(selected.approvedAt)}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded p-3">
                        <div className="text-gray-400 text-xs">Toplam</div>
                        <div className="text-gray-900 text-sm font-bold mt-1">
                          {fmtMoney(selected.total)}
                        </div>
                      </div>
                    </div>

                    {selected.notes && (
                      <p className="text-gray-400 text-sm bg-gray-50 rounded p-3 mb-4">
                        {selected.notes}
                      </p>
                    )}

                    {/* Actions */}
                    {actions.length > 0 && (
                      <div className="flex gap-2">
                        {actions.map((a) => (
                          <button
                            key={a.api}
                            onClick={() => doAction(a.api)}
                            disabled={!!actionLoading}
                            className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium transition-colors ${a.api === 'cancel' ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'btn-primary'}`}
                          >
                            {actionLoading === a.api ? 'İşleniyor…' : a.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Status pipeline */}
                  <div className="card">
                    <h3 className="text-gray-900 font-semibold mb-3 text-sm">Sipariş Akışı</h3>
                    <div className="flex items-center gap-1">
                      {['DRAFT', 'PENDING', 'APPROVED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].map(
                        (st, i, arr) => {
                          const cfg2 = STATUS_CFG[st];
                          const Icon2 = cfg2.icon;
                          const statusOrder = [
                            'DRAFT',
                            'PENDING',
                            'APPROVED',
                            'PROCESSING',
                            'SHIPPED',
                            'DELIVERED',
                            'CANCELLED',
                          ];
                          const curIdx = statusOrder.indexOf(selected.status);
                          const stIdx = statusOrder.indexOf(st);
                          const isDone = curIdx >= stIdx;
                          const isCurrent = selected.status === st;
                          return (
                            <div key={st} className="flex items-center flex-1">
                              <div className="flex flex-col items-center min-w-0">
                                <div
                                  className={`w-7 h-7 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${isCurrent ? `${cfg2.bg} border-current` : isDone ? 'bg-emerald-500/20 border-emerald-500' : 'bg-gray-700 border-gray-600'}`}
                                >
                                  <Icon2
                                    size={12}
                                    className={
                                      isDone
                                        ? isCurrent
                                          ? cfg2.color
                                          : 'text-emerald-600'
                                        : 'text-gray-500'
                                    }
                                  />
                                </div>
                                <span
                                  className={`text-[10px] mt-1 text-center leading-tight ${isCurrent ? cfg2.color : isDone ? 'text-gray-600' : 'text-gray-600'}`}
                                >
                                  {cfg2.label}
                                </span>
                              </div>
                              {i < arr.length - 1 && (
                                <div
                                  className={`flex-1 h-0.5 mx-1 mb-4 ${curIdx > stIdx ? 'bg-emerald-500' : 'bg-gray-600'}`}
                                />
                              )}
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>

                  {/* Lines */}
                  <div className="card">
                    <h3 className="text-gray-900 font-semibold mb-3 text-sm">Ürün Kalemleri</h3>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-400 text-xs border-b border-gray-200">
                          <th className="text-left py-2">Ürün</th>
                          <th className="text-right py-2">Miktar</th>
                          <th className="text-right py-2">Birim Fiyat</th>
                          <th className="text-right py-2">Toplam</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.lines.map((l) => (
                          <tr key={l.id} className="border-b border-gray-100">
                            <td className="py-2 text-gray-900">{l.product.name}</td>
                            <td className="text-right text-gray-600">
                              {l.quantity} {l.product.unit}
                            </td>
                            <td className="text-right text-gray-600">{fmtMoney(l.unitPrice)}</td>
                            <td className="text-right text-gray-900 font-medium">
                              {fmtMoney(l.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="text-gray-400 text-xs">
                          <td colSpan={3} className="text-right pt-2">
                            Ara Toplam
                          </td>
                          <td className="text-right pt-2">{fmtMoney(selected.subtotal)}</td>
                        </tr>
                        <tr className="text-gray-400 text-xs">
                          <td colSpan={3} className="text-right">
                            KDV
                          </td>
                          <td className="text-right">{fmtMoney(selected.vatTotal)}</td>
                        </tr>
                        <tr className="text-gray-900 font-bold">
                          <td colSpan={3} className="text-right pt-2">
                            TOPLAM
                          </td>
                          <td className="text-right pt-2">{fmtMoney(selected.total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 overflow-auto py-8">
          <div className="card w-full max-w-2xl">
            <h3 className="text-gray-900 font-semibold mb-4">Yeni B2B Sipariş</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Müşteri *</label>
                <select
                  className="input w-full"
                  value={form.contactId}
                  onChange={(e) => setForm((f) => ({ ...f, contactId: e.target.value }))}
                >
                  <option value="">Müşteri seçin…</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.city ? `— ${c.city}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lines */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-400">Ürün Kalemleri *</label>
                  <button
                    onClick={addLine}
                    className="text-xs text-indigo-400 hover:text-brand-600 flex items-center gap-1"
                  >
                    <Plus size={12} />
                    Kalem Ekle
                  </button>
                </div>
                <div className="space-y-2">
                  {form.lines.map((l, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <select
                        className="input flex-1 text-sm"
                        value={l.productId}
                        onChange={(e) => updateLine(i, 'productId', e.target.value)}
                      >
                        <option value="">Ürün seçin…</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        className="input w-20 text-sm"
                        placeholder="Adet"
                        min={1}
                        value={l.quantity}
                        onChange={(e) => updateLine(i, 'quantity', parseInt(e.target.value) || 1)}
                      />
                      <input
                        type="number"
                        className="input w-28 text-sm"
                        placeholder="Fiyat"
                        value={l.unitPrice}
                        onChange={(e) =>
                          updateLine(i, 'unitPrice', parseFloat(e.target.value) || 0)
                        }
                      />
                      <span className="text-gray-400 text-xs w-28 text-right flex-shrink-0">
                        {fmtMoney(l.quantity * l.unitPrice)}
                      </span>
                      {form.lines.length > 1 && (
                        <button
                          onClick={() => removeLine(i)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <XCircle size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="text-right mt-2 text-gray-900 font-bold">
                  Toplam: {fmtMoney(lineTotal * 1.2)}
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Notlar</label>
                <textarea
                  className="input w-full"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-secondary flex-1" onClick={() => setShowModal(false)}>
                İptal
              </button>
              <button
                className="btn-primary flex-1"
                onClick={createOrder}
                disabled={saving || !form.contactId || !form.lines.some((l) => l.productId)}
              >
                {saving ? 'Oluşturuluyor…' : 'Sipariş Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
