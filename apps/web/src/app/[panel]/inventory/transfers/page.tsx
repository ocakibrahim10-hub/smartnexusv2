'use client';

import { toast } from '@/lib/toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useState, useEffect } from 'react';
import {
  ArrowRight,
  Plus,
  Check,
  Truck,
  X,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Building2,
  ShoppingCart,
} from 'lucide-react';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { FormField, FormSelect, FormTextarea, IconButton } from '@/components/FormField';

type TransferStatus = 'PENDING' | 'APPROVED' | 'SHIPPED' | 'RECEIVED' | 'CANCELLED' | 'DRAFT';

const STATUS_CONFIG: Record<
  TransferStatus,
  { label: string; color: string; bg: string; icon: any }
> = {
  DRAFT: { label: 'Taslak', color: 'text-gray-600', bg: 'bg-gray-100', icon: Clock },
  PENDING: { label: 'Bekliyor', color: 'text-amber-700', bg: 'bg-amber-100', icon: Clock },
  APPROVED: { label: 'Onaylı', color: 'text-blue-700', bg: 'bg-blue-100', icon: CheckCircle },
  SHIPPED: { label: 'Yolda', color: 'text-indigo-700', bg: 'bg-indigo-100', icon: Truck },
  RECEIVED: { label: 'Teslim', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: Check },
  CANCELLED: { label: 'İptal', color: 'text-red-700', bg: 'bg-red-100', icon: XCircle },
};

const UNIT_OPTS = ['ADET', 'KOLI', 'KUTU', 'KG', 'GR', 'TON'];

export default function TransfersPage() {
  const user = getUser();
  const isBranch = user?.tenantType === 'BRANCH';
  const isBusiness = user?.tenantType === 'BUSINESS';

  const [tab, setTab] = useState<'transfers' | 'parent' | 'request'>('transfers');
  const [transfers, setTransfers] = useState<any[]>([]);
  const [parentStock, setParentStock] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [showNew, setShowNew] = useState(false);
  const [showRequest, setShowRequest] = useState(false);

  const [products, setProducts] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [form, setForm] = useState({
    toTenantId: '',
    notes: '',
    expectedDate: '',
    lines: [{ productId: '', quantity: '', inputUnit: 'ADET' }],
  });
  const [requestForm, setRequestForm] = useState({
    notes: '',
    expectedDate: '',
    lines: [{ productId: '', quantity: '', inputUnit: 'ADET' }],
  });
  const [requestCart, setRequestCart] = useState<
    {
      productId: string;
      name: string;
      quantity: string;
      inputUnit: string;
      parentStock: number;
      unit: string;
    }[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [actioning, setActioning] = useState(false);
  const [cancelTransferId, setCancelTransferId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/inventory/transfers', {
        params: { status: statusFilter || undefined },
      });
      setTransfers(r.data.data || []);
      setTotal(r.data.total || 0);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const loadParentStock = async () => {
    try {
      const r = await api.get('/inventory/parent-stock', { params: { limit: 200 } });
      setParentStock(r.data.data || []);
    } catch {
      setParentStock([]);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter]);
  useEffect(() => {
    if (isBranch) loadParentStock();
    if (isBusiness) {
      api
        .get('/products', { params: { limit: 200 } })
        .then((r) => setProducts(r.data.data || []))
        .catch(() => {});
      api
        .get('/tenants/branches', { params: { limit: 200 } })
        .then((r) => setBranches(r.data.data || []))
        .catch(() => {});
    }
  }, [isBranch, isBusiness]);

  const action = async (id: string, type: 'approve' | 'ship' | 'receive' | 'cancel') => {
    if (type === 'cancel') { setCancelTransferId(id); return; }
    setActioning(true);
    try {
      await api.patch(`/inventory/transfers/${id}/${type}`);
      load();
      if (selected?.id === id) {
        const r = await api.get('/inventory/transfers');
        const updated = (r.data.data || []).find((t: any) => t.id === id);
        setSelected(updated || null);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Hata');
    } finally {
      setActioning(false);
    }
  };

  const doCancel = async (id: string) => {
    setActioning(true);
    try {
      await api.patch(`/inventory/transfers/${id}/cancel`);
      toast.success('Transfer iptal edildi');
      load();
      if (selected?.id === id) setSelected(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Hata');
    } finally {
      setActioning(false);
      setCancelTransferId(null);
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      await api.post('/inventory/transfers', {
        ...form,
        lines: form.lines
          .filter((l) => l.productId && l.quantity)
          .map((l) => ({
            productId: l.productId,
            quantity: parseFloat(l.quantity),
            inputUnit: l.inputUnit || undefined,
          })),
      });
      setShowNew(false);
      setForm({
        toTenantId: '',
        notes: '',
        expectedDate: '',
        lines: [{ productId: '', quantity: '', inputUnit: 'ADET' }],
      });
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Hata');
    } finally {
      setSaving(false);
    }
  };

  const handleStockRequest = async () => {
    const lines = requestCart.length
      ? requestCart
      : requestForm.lines.filter((l) => l.productId && l.quantity);
    if (!lines.length) {
      toast.info('En az bir ürün seçin');
      return;
    }
    setSaving(true);
    try {
      await api.post('/inventory/stock-requests', {
        notes: requestForm.notes,
        expectedDate: requestForm.expectedDate || undefined,
        lines: lines.map((l) => ({
          productId: l.productId,
          quantity: parseFloat(l.quantity),
          inputUnit: l.inputUnit || undefined,
        })),
      });
      setShowRequest(false);
      setRequestCart([]);
      setRequestForm({
        notes: '',
        expectedDate: '',
        lines: [{ productId: '', quantity: '', inputUnit: 'ADET' }],
      });
      setTab('transfers');
      load();
      toast.success('Stok talebi gönderildi. Ana işletme onayından sonra sevkiyat yapılacak.');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Hata');
    } finally {
      setSaving(false);
    }
  };

  const addToRequestCart = (item: any, qty: string, inputUnit: string) => {
    if (!qty || parseFloat(qty) <= 0) return;
    setRequestCart((c) => {
      const existing = c.find((x) => x.productId === item.id);
      if (existing)
        return c.map((x) => (x.productId === item.id ? { ...x, quantity: qty, inputUnit } : x));
      return [
        ...c,
        {
          productId: item.id,
          name: item.name,
          quantity: qty,
          inputUnit,
          parentStock: item.parentStock,
          unit: item.unit,
        },
      ];
    });
  };

  const addLine = () =>
    setForm((f) => ({
      ...f,
      lines: [...f.lines, { productId: '', quantity: '', inputUnit: 'ADET' }],
    }));
  const removeLine = (i: number) =>
    setForm((f) => ({ ...f, lines: f.lines.filter((_, j) => j !== i) }));

  const getUnitOptions = (product?: any) => {
    const opts = new Set<string>([
      product?.unit || 'ADET',
      product?.saleUnit,
      'ADET',
      'KOLI',
      'KUTU',
      'KG',
      'GR',
      'TON',
    ]);
    (product?.productUnits || []).forEach((u: any) => opts.add(u.unit));
    return [...opts].filter(Boolean);
  };

  return (
    <div className="flex h-full overflow-hidden flex-col">
      {/* Şube sekmeleri */}
      {isBranch && (
        <div className="flex gap-1 p-3 border-b border-gray-100 bg-white">
          {[
            { id: 'transfers' as const, label: 'Taleplerim', icon: Truck },
            { id: 'parent' as const, label: 'Ana İşletme Stoğu', icon: Building2 },
            { id: 'request' as const, label: 'Stok Talebi Oluştur', icon: ShoppingCart },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t.id ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Ana işletme stok görünümü / talep oluştur — şube */}
      {isBranch && tab === 'parent' && (
        <div className="flex-1 overflow-y-auto p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Ana İşletme Stok Durumu</h2>
          <p className="text-sm text-gray-500 mb-4">
            Bağlı olduğunuz işletmenin deposundaki stokları görüntüleyin. Talep oluşturmak için
            miktar girin.
          </p>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2 text-xs text-gray-400">Ürün</th>
                  <th className="text-right px-4 py-2 text-xs text-gray-400">Ana Stok</th>
                  <th className="text-right px-4 py-2 text-xs text-gray-400">Şube Stok</th>
                  <th className="text-right px-4 py-2 text-xs text-gray-400">Talep</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {parentStock.map((item) => (
                  <ParentStockRow
                    key={item.id}
                    item={item}
                    onAdd={addToRequestCart}
                    unitOptions={getUnitOptions(item)}
                  />
                ))}
              </tbody>
            </table>
            {parentStock.length === 0 && (
              <div className="p-8 text-center text-gray-400 text-sm">
                Ana işletme stok verisi bulunamadı
              </div>
            )}
          </div>
          {requestCart.length > 0 && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowRequest(true)}
                className="btn-primary flex items-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                {requestCart.length} ürünlü talebi gönder
              </button>
            </div>
          )}
        </div>
      )}

      {isBranch && tab === 'request' && (
        <div className="flex-1 overflow-y-auto p-6 max-w-2xl">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Stok Talebi</h2>
          <p className="text-sm text-gray-500 mb-4">
            Ana işletmeden kendi deponuza stok talep edin. Teslim aldıktan sonra ürünler satışa
            açılır.
          </p>
          <div className="card p-5 space-y-4">
            <FormTextarea
              label="Not"
              value={requestForm.notes}
              onChange={(e) => setRequestForm((f) => ({ ...f, notes: e.target.value }))}
              className="input resize-none"
              rows={2}
            />
            <FormField
              label="Beklenen Tarih"
              type="date"
              value={requestForm.expectedDate}
              onChange={(e) => setRequestForm((f) => ({ ...f, expectedDate: e.target.value }))}
              className="input"
            />
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs text-gray-500">Ürünler (ana işletme stoğundan)</label>
                <button onClick={() => setTab('parent')} className="text-xs text-brand-500">
                  Stok listesinden seç →
                </button>
              </div>
              {requestCart.map((l, i) => (
                <div
                  key={i}
                  className="flex gap-2 items-center text-sm bg-gray-50 rounded-lg px-3 py-2"
                >
                  <span className="flex-1 font-medium">{l.name}</span>
                  <span>
                    {l.quantity} {l.inputUnit}
                  </span>
                  <IconButton
                    label="Ürünü listeden kaldır"
                    onClick={() => setRequestCart((c) => c.filter((_, j) => j !== i))}
                    className="text-red-400"
                  >
                    <X className="w-4 h-4" />
                  </IconButton>
                </div>
              ))}
              {requestCart.length === 0 && (
                <p className="text-xs text-gray-400">
                  Ana Stok sekmesinden ürün ekleyin veya aşağıdan manuel seçin.
                </p>
              )}
            </div>
            <button
              onClick={handleStockRequest}
              disabled={requestCart.length === 0 || saving}
              className="btn-primary w-full disabled:opacity-50"
            >
              {saving ? 'Gönderiliyor...' : 'Stok Talebini Gönder'}
            </button>
          </div>
        </div>
      )}

      {/* Transfer listesi (işletme + şube transfers tab) */}
      {(!isBranch || tab === 'transfers') && (
        <div className="flex flex-1 overflow-hidden">
          <div className="w-[380px] flex-shrink-0 flex flex-col border-r border-gray-100 bg-white">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-lg font-bold text-gray-900">
                  {isBranch ? 'Stok Talepleri' : 'Transfer Emirleri'}
                </h1>
                {isBusiness && (
                  <button
                    onClick={() => setShowNew(true)}
                    className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Yeni Transfer
                  </button>
                )}
              </div>
              <div className="flex gap-1 flex-wrap">
                {['', 'PENDING', 'APPROVED', 'SHIPPED', 'RECEIVED', 'CANCELLED'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {s ? STATUS_CONFIG[s as TransferStatus]?.label : 'Tümü'}
                  </button>
                ))}
              </div>
              <div className="mt-2 text-xs text-gray-400">{total} kayıt</div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : transfers.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">Kayıt bulunamadı</div>
              ) : (
                transfers.map((t) => {
                  const cfg = STATUS_CONFIG[t.status as TransferStatus];
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelected(t)}
                      className={`w-full flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left ${selected?.id === t.id ? 'bg-indigo-50' : ''}`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}
                      >
                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900 truncate">
                            {t.fromTenantName}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="text-sm font-semibold text-gray-900 truncate">
                            {t.toTenantName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${cfg.bg} ${cfg.color}`}
                          >
                            {cfg.label}
                          </span>
                          {t.isRequest && (
                            <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-md">
                              Stok Talebi
                            </span>
                          )}
                          <span className="text-xs text-gray-400">{t.lines?.length} kalem</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {new Date(t.requestedAt).toLocaleDateString('tr-TR')}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {!selected ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-600">
                <ArrowRight className="w-16 h-16 mb-4" />
                <p className="text-lg font-medium">
                  {isBranch ? 'Talep seçin' : 'Transfer emri seçin'}
                </p>
              </div>
            ) : (
              <div className="max-w-2xl space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 text-lg font-bold text-gray-900">
                      <span>{selected.fromTenantName}</span>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                      <span>{selected.toTenantName}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {(() => {
                        const cfg = STATUS_CONFIG[selected.status as TransferStatus];
                        const Icon = cfg.icon;
                        return (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-lg font-medium flex items-center gap-1 ${cfg.bg} ${cfg.color}`}
                          >
                            <Icon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                        );
                      })()}
                      {selected.isRequest && (
                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-lg">
                          Stok Talebi
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {selected.status === 'PENDING' && selected.direction === 'OUT' && (
                      <>
                        <button
                          onClick={() => action(selected.id, 'approve')}
                          disabled={actioning}
                          className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          Onayla
                        </button>
                        <button
                          onClick={() => action(selected.id, 'cancel')}
                          disabled={actioning}
                          className="btn-secondary text-sm px-3 py-1.5 text-red-600"
                        >
                          İptal
                        </button>
                      </>
                    )}
                    {selected.status === 'APPROVED' && selected.direction === 'OUT' && (
                      <button
                        onClick={() => action(selected.id, 'ship')}
                        disabled={actioning}
                        className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1.5"
                      >
                        <Send className="w-4 h-4" />
                        Sevk Et
                      </button>
                    )}
                    {selected.status === 'SHIPPED' && selected.direction === 'IN' && (
                      <button
                        onClick={() => action(selected.id, 'receive')}
                        disabled={actioning}
                        className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        Teslim Al (Satışa Aç)
                      </button>
                    )}
                  </div>
                </div>

                {selected.notes && (
                  <div className="card p-4 text-sm text-gray-600 bg-amber-50 border-amber-100">
                    {selected.notes}
                  </div>
                )}

                <div className="card overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 text-sm font-bold">
                    Kalemler ({selected.lines?.length || 0})
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-5 py-2 text-xs text-gray-400">Ürün</th>
                        <th className="text-right px-5 py-2 text-xs text-gray-400">Miktar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(selected.lines || []).map((line: any, i: number) => (
                        <tr key={i}>
                          <td className="px-5 py-3">
                            <div className="font-medium">{line.product?.name}</div>
                            <div className="text-xs text-gray-400">{line.product?.code}</div>
                          </td>
                          <td className="px-5 py-3 text-right">
                            {line.inputQuantity && line.inputUnit ? (
                              <span>
                                {line.inputQuantity} {line.inputUnit}{' '}
                                <span className="text-xs text-gray-400">
                                  ({line.quantity} {line.product?.unit})
                                </span>
                              </span>
                            ) : (
                              <span>
                                {line.quantity} {line.product?.unit}
                              </span>
                            )}
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
      )}

      {/* İşletme: yeni transfer modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b flex justify-between">
              <h2 className="text-lg font-bold">Yeni Transfer Emri</h2>
              <IconButton label="Transfer formunu kapat" onClick={() => setShowNew(false)} className="text-gray-400">
                <X className="w-5 h-5" />
              </IconButton>
            </div>
            <div className="p-6 space-y-4">
              <FormSelect
                label="Alıcı Şube *"
                value={form.toTenantId}
                onChange={(e) => setForm((f) => ({ ...f, toTenantId: e.target.value }))}
                className="input"
              >
                <option value="">Şube Seçin</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </FormSelect>
              <div className="space-y-2">
                {form.lines.map((l, i) => {
                  const prod = products.find((p) => p.id === l.productId);
                  return (
                    <div key={i} className="flex gap-2 items-center flex-wrap">
                      <FormSelect
                        label="Ürün"
                        hideLabel
                        value={l.productId}
                        onChange={(e) =>
                          setForm((f) => {
                            const lines = [...f.lines];
                            lines[i] = { ...lines[i], productId: e.target.value };
                            return { ...f, lines };
                          })
                        }
                        className="input flex-1 text-sm min-w-[140px]"
                      >
                        <option value="">Ürün</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </FormSelect>
                      <FormField
                        label="Miktar"
                        hideLabel
                        type="number"
                        value={l.quantity}
                        onChange={(e) =>
                          setForm((f) => {
                            const lines = [...f.lines];
                            lines[i] = { ...lines[i], quantity: e.target.value };
                            return { ...f, lines };
                          })
                        }
                        className="input w-20 text-sm"
                        placeholder="Miktar"
                      />
                      <FormSelect
                        label="Birim"
                        hideLabel
                        value={l.inputUnit}
                        onChange={(e) =>
                          setForm((f) => {
                            const lines = [...f.lines];
                            lines[i] = { ...lines[i], inputUnit: e.target.value };
                            return { ...f, lines };
                          })
                        }
                        className="input w-24 text-sm"
                      >
                        {getUnitOptions(prod).map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </FormSelect>
                      {form.lines.length > 1 && (
                        <IconButton label="Kalemi kaldır" onClick={() => removeLine(i)} className="text-red-400">
                          <X className="w-4 h-4" />
                        </IconButton>
                      )}
                    </div>
                  );
                })}
                <button
                  onClick={addLine}
                  className="text-xs text-brand-500 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Kalem ekle
                </button>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowNew(false)} className="btn-secondary flex-1">
                İptal
              </button>
              <button
                onClick={handleCreate}
                disabled={!form.toTenantId || saving}
                className="btn-primary flex-1"
              >
                {saving ? '...' : 'Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Şube: talep onay modal */}
      {showRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-bold">Stok Talebini Onayla</h2>
            {requestCart.map((l, i) => (
              <div key={i} className="text-sm flex justify-between">
                <span>{l.name}</span>
                <span>
                  {l.quantity} {l.inputUnit}
                </span>
              </div>
            ))}
            <FormTextarea
              label="Not"
              hideLabel
              value={requestForm.notes}
              onChange={(e) => setRequestForm((f) => ({ ...f, notes: e.target.value }))}
              className="input"
              rows={2}
              placeholder="Not (opsiyonel)"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowRequest(false)} className="btn-secondary flex-1">
                İptal
              </button>
              <button onClick={handleStockRequest} disabled={saving} className="btn-primary flex-1">
                Gönder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ParentStockRow({
  item,
  onAdd,
  unitOptions,
}: {
  item: any;
  onAdd: (item: any, qty: string, unit: string) => void;
  unitOptions: string[];
}) {
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState(item.saleUnit || item.unit || 'ADET');
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <div className="font-medium text-gray-900">{item.name}</div>
        <div className="text-xs text-gray-400">{item.code}</div>
      </td>
      <td className="px-4 py-3 text-right text-emerald-600 font-medium">
        {item.parentStock} {item.unit}
      </td>
      <td className="px-4 py-3 text-right">
        {item.branchStock ?? 0} {item.unit}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1 justify-end items-center">
          <FormField
            label="Miktar"
            hideLabel
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="input w-16 text-xs py-1"
            min="0.001"
            placeholder="0"
          />
          <FormSelect
            label="Birim"
            hideLabel
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="input w-20 text-xs py-1"
          >
            {unitOptions.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </FormSelect>
          <button
            onClick={() => {
              onAdd(item, qty, unit);
              setQty('');
            }}
            disabled={!qty}
            className="text-xs px-2 py-1 bg-brand-500 text-white rounded-lg disabled:opacity-40"
          >
            +
          </button>
        </div>
      </td>
    </tr>
  );
}
