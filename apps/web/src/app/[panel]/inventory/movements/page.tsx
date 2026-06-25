'use client';

import { toast } from '@/lib/toast';
import { useState, useEffect } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  ClipboardList,
  Plus,
  X,
  Filter,
} from 'lucide-react';
import { api } from '@/lib/api';

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  IN: { label: 'Giriş', icon: ArrowDownLeft, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  OUT: { label: 'Çıkış', icon: ArrowUpRight, color: 'text-red-500', bg: 'bg-red-50' },
  ADJUST: { label: 'Düzeltme', icon: RefreshCw, color: 'text-blue-600', bg: 'bg-blue-50' },
  ADJUSTMENT: { label: 'Düzeltme', icon: RefreshCw, color: 'text-blue-600', bg: 'bg-blue-50' },
  COUNT: { label: 'Sayım', icon: ClipboardList, color: 'text-purple-600', bg: 'bg-purple-50' },
  TRANSFER_OUT: {
    label: 'Transfer Çık',
    icon: ArrowUpRight,
    color: 'text-orange-500',
    bg: 'bg-orange-50',
  },
  TRANSFER_IN: {
    label: 'Transfer Gir',
    icon: ArrowDownLeft,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
  },
};

export default function MovementsPage() {
  const [movements, setMovements] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [filters, setFilters] = useState({ warehouseId: '', type: '', startDate: '', endDate: '' });
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [showCount, setShowCount] = useState(false);

  // Manuel hareket formu
  const [moveForm, setMoveForm] = useState({
    productId: '',
    warehouseId: '',
    type: 'IN',
    quantity: '',
    description: '',
    unitCost: '',
  });
  // Sayım formu
  const [countForm, setCountForm] = useState({
    warehouseId: '',
    lines: [{ productId: '', countedQty: '' }],
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/inventory/movements', {
        params: {
          ...filters,
          page,
          limit: 40,
          warehouseId: filters.warehouseId || undefined,
          type: filters.type || undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
        },
      });
      setMovements(r.data.data || []);
      setTotal(r.data.total || 0);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filters, page]);

  useEffect(() => {
    api
      .get('/inventory/warehouses')
      .then((r) => setWarehouses(r.data))
      .catch(() => {});
    api
      .get('/products', { params: { limit: 200 } })
      .then((r) => setProducts(r.data.data || []))
      .catch(() => {});
  }, []);

  const handleAddMovement = async () => {
    setSaving(true);
    try {
      await api.post('/inventory/movements', {
        ...moveForm,
        quantity: parseFloat(moveForm.quantity),
        unitCost: moveForm.unitCost ? parseFloat(moveForm.unitCost) : undefined,
      });
      setShowAdd(false);
      setMoveForm({
        productId: '',
        warehouseId: '',
        type: 'IN',
        quantity: '',
        description: '',
        unitCost: '',
      });
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Hata');
    } finally {
      setSaving(false);
    }
  };

  const handleStockCount = async () => {
    setSaving(true);
    try {
      await api.post('/inventory/count', {
        warehouseId: countForm.warehouseId,
        lines: countForm.lines
          .filter((l) => l.productId && l.countedQty !== '')
          .map((l) => ({ productId: l.productId, countedQty: parseFloat(l.countedQty) || 0 })),
      });
      setShowCount(false);
      setCountForm({ warehouseId: '', lines: [{ productId: '', countedQty: '' }] });
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Hata');
    } finally {
      setSaving(false);
    }
  };

  const addCountLine = () =>
    setCountForm((f) => ({ ...f, lines: [...f.lines, { productId: '', countedQty: '' }] }));
  const removeCountLine = (i: number) =>
    setCountForm((f) => ({ ...f, lines: f.lines.filter((_, j) => j !== i) }));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-white flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Stok Hareketleri</h1>
          <p className="text-xs text-gray-400 mt-0.5">{total} hareket</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCount(true)}
            className="btn-secondary text-sm px-3 py-2 flex items-center gap-1.5"
          >
            <ClipboardList className="w-4 h-4" /> Stok Sayımı
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="btn-primary text-sm px-3 py-2 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Manuel Hareket
          </button>
        </div>
      </div>

      {/* Filtreler */}
      <div className="px-6 py-3 border-b border-gray-50 bg-gray-50/50 flex items-center gap-3 flex-shrink-0 flex-wrap">
        <select
          value={filters.warehouseId}
          onChange={(e) => {
            setFilters((f) => ({ ...f, warehouseId: e.target.value }));
            setPage(1);
          }}
          className="input text-sm py-1.5 w-44"
        >
          <option value="">Tüm Depolar</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <select
          value={filters.type}
          onChange={(e) => {
            setFilters((f) => ({ ...f, type: e.target.value }));
            setPage(1);
          }}
          className="input text-sm py-1.5 w-36"
        >
          <option value="">Tüm Türler</option>
          {Object.entries(TYPE_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => {
              setFilters((f) => ({ ...f, startDate: e.target.value }));
              setPage(1);
            }}
            className="input text-sm py-1.5 w-36"
          />
          <span className="text-gray-400 text-sm">—</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => {
              setFilters((f) => ({ ...f, endDate: e.target.value }));
              setPage(1);
            }}
            className="input text-sm py-1.5 w-36"
          />
        </div>
        {(filters.warehouseId || filters.type || filters.startDate || filters.endDate) && (
          <button
            onClick={() => {
              setFilters({ warehouseId: '', type: '', startDate: '', endDate: '' });
              setPage(1);
            }}
            className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" /> Temizle
          </button>
        )}
      </div>

      {/* Tablo */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : movements.length === 0 ? (
          <div className="p-12 text-center text-gray-400">Hareket bulunamadı</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Tür</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Ürün</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Depo</th>
                <th className="text-right text-xs font-medium text-gray-500 px-5 py-3">Miktar</th>
                <th className="text-right text-xs font-medium text-gray-500 px-5 py-3">
                  Birim Maliyet
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Açıklama</th>
                <th className="text-right text-xs font-medium text-gray-500 px-5 py-3">Tarih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {movements.map((m: any) => {
                const cfg = TYPE_CONFIG[m.type] || {
                  label: m.type,
                  icon: ArrowDownLeft,
                  color: 'text-gray-600',
                  bg: 'bg-gray-50',
                };
                const Icon = cfg.icon;
                return (
                  <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${cfg.bg} ${cfg.color}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {cfg.label}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900">{m.product?.name}</div>
                      <div className="text-xs text-gray-400">{m.product?.code}</div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{m.warehouse?.name}</td>
                    <td className="px-5 py-3 text-right font-bold">
                      <span className={cfg.color}>
                        {['OUT', 'TRANSFER_OUT'].includes(m.type) ? '-' : '+'}
                        {m.quantity}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">{m.product?.unit}</span>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-500">
                      {m.unitCost
                        ? `₺${m.unitCost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`
                        : '-'}
                    </td>
                    <td className="px-5 py-3 text-gray-500 max-w-48 truncate">
                      {m.description || m.reference || '-'}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-400 text-xs whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleDateString('tr-TR')}
                      <div>
                        {new Date(m.createdAt).toLocaleTimeString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Sayfalama */}
      {total > 40 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-white flex-shrink-0">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
          >
            ← Önceki
          </button>
          <span className="text-xs text-gray-400">
            Sayfa {page} / {Math.ceil(total / 40)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page * 40 >= total}
            className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
          >
            Sonraki →
          </button>
        </div>
      )}

      {/* Manuel Hareket Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Manuel Stok Hareketi</h2>
            <div className="space-y-3">
              <div className="flex gap-2">
                {['IN', 'OUT', 'ADJUST'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setMoveForm((f) => ({ ...f, type: t }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${moveForm.type === t ? (t === 'IN' ? 'bg-emerald-500 text-white' : t === 'OUT' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white') : 'bg-gray-100 text-gray-500'}`}
                  >
                    {t === 'IN' ? 'Giriş' : t === 'OUT' ? 'Çıkış' : 'Düzelt'}
                  </button>
                ))}
              </div>
              <select
                value={moveForm.productId}
                onChange={(e) => setMoveForm((f) => ({ ...f, productId: e.target.value }))}
                className="input"
              >
                <option value="">Ürün seçin *</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
              <select
                value={moveForm.warehouseId}
                onChange={(e) => setMoveForm((f) => ({ ...f, warehouseId: e.target.value }))}
                className="input"
              >
                <option value="">Depo seçin *</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-gray-400 mb-1 block">Miktar *</label>
                  <input
                    type="number"
                    value={moveForm.quantity}
                    onChange={(e) => setMoveForm((f) => ({ ...f, quantity: e.target.value }))}
                    className="input"
                    min="0.001"
                    step="0.001"
                    placeholder="0"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-400 mb-1 block">Birim Maliyet</label>
                  <input
                    type="number"
                    value={moveForm.unitCost}
                    onChange={(e) => setMoveForm((f) => ({ ...f, unitCost: e.target.value }))}
                    className="input"
                    min="0"
                    step="0.01"
                    placeholder="₺0.00"
                  />
                </div>
              </div>
              <input
                value={moveForm.description}
                onChange={(e) => setMoveForm((f) => ({ ...f, description: e.target.value }))}
                className="input"
                placeholder="Açıklama"
              />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1">
                İptal
              </button>
              <button
                onClick={handleAddMovement}
                disabled={
                  !moveForm.productId || !moveForm.warehouseId || !moveForm.quantity || saving
                }
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {saving ? '...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stok Sayım Modal */}
      {showCount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Stok Sayımı</h2>
              <button onClick={() => setShowCount(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Depo *</label>
                <select
                  value={countForm.warehouseId}
                  onChange={(e) => setCountForm((f) => ({ ...f, warehouseId: e.target.value }))}
                  className="input"
                >
                  <option value="">Depo seçin</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-500">Sayım Satırları</label>
                  <button
                    onClick={addCountLine}
                    className="text-xs text-brand-500 flex items-center gap-1 hover:text-brand-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Satır Ekle
                  </button>
                </div>
                <div className="space-y-2">
                  {countForm.lines.map((l, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <select
                        value={l.productId}
                        onChange={(e) =>
                          setCountForm((f) => {
                            const lines = [...f.lines];
                            lines[i] = { ...lines[i], productId: e.target.value };
                            return { ...f, lines };
                          })
                        }
                        className="input flex-1 text-sm"
                      >
                        <option value="">Ürün seçin</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={l.countedQty}
                        onChange={(e) =>
                          setCountForm((f) => {
                            const lines = [...f.lines];
                            lines[i] = { ...lines[i], countedQty: e.target.value };
                            return { ...f, lines };
                          })
                        }
                        className="input w-24 text-sm"
                        placeholder="Miktar"
                        min="0"
                      />
                      {countForm.lines.length > 1 && (
                        <button
                          onClick={() => removeCountLine(i)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowCount(false)} className="btn-secondary flex-1">
                İptal
              </button>
              <button
                onClick={handleStockCount}
                disabled={
                  !countForm.warehouseId || countForm.lines.every((l) => !l.productId) || saving
                }
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {saving ? 'İşleniyor...' : 'Sayımı Uygula'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
