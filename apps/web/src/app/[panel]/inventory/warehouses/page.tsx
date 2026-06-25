'use client';

import { toast } from '@/lib/toast';
import { useState, useEffect } from 'react';
import {
  Warehouse,
  Plus,
  Package,
  TrendingUp,
  Search,
  X,
  Edit2,
  AlertTriangle,
  BarChart2,
} from 'lucide-react';
import { api } from '@/lib/api';

interface WarehouseData {
  id: string;
  name: string;
  city?: string;
  address?: string;
  isDefault: boolean;
  isActive: boolean;
  stockValue: number;
  totalQty: number;
  _count: { stockItems: number };
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<WarehouseData | null>(null);
  const [stock, setStock] = useState<any[]>([]);
  const [stockSearch, setStockSearch] = useState('');
  const [stockTotal, setStockTotal] = useState(0);
  const [stockPage, setStockPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: '', city: '', address: '', isDefault: false });
  const [saving, setSaving] = useState(false);

  const loadWarehouses = async () => {
    setLoading(true);
    try {
      const r = await api.get('/inventory/warehouses');
      setWarehouses(r.data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  const selectWarehouse = async (w: WarehouseData) => {
    setSelected(w);
    setStockSearch('');
    setStockPage(1);
    loadStock(w.id, '', 1);
  };

  const loadStock = async (warehouseId: string, search: string, page: number) => {
    const r = await api.get(`/inventory/warehouses/${warehouseId}/stock`, {
      params: { search: search || undefined, page, limit: 30 },
    });
    setStock(r.data.data || []);
    setStockTotal(r.data.total || 0);
  };

  useEffect(() => {
    if (!selected) return;
    const t = setTimeout(() => loadStock(selected.id, stockSearch, stockPage), 300);
    return () => clearTimeout(t);
  }, [stockSearch, stockPage, selected]);

  const openNew = () => {
    setForm({ name: '', city: '', address: '', isDefault: false });
    setEditMode(false);
    setShowForm(true);
  };
  const openEdit = (w: WarehouseData) => {
    setForm({ name: w.name, city: w.city || '', address: w.address || '', isDefault: w.isDefault });
    setEditMode(true);
    setSelected(w);
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editMode && selected) await api.patch(`/inventory/warehouses/${selected.id}`, form);
      else await api.post('/inventory/warehouses', form);
      setShowForm(false);
      loadWarehouses();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Hata');
    } finally {
      setSaving(false);
    }
  };

  const totalStockValue = warehouses.reduce((s, w) => s + w.stockValue, 0);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sol: Depo listesi */}
      <div className="w-[340px] flex-shrink-0 flex flex-col border-r border-gray-100 bg-white">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-gray-900">Depolar</h1>
            <button
              onClick={openNew}
              className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Yeni Depo
            </button>
          </div>
          {/* Özet */}
          <div className="bg-indigo-50 rounded-xl p-3">
            <div className="text-xs text-indigo-600 mb-1">Toplam Stok Değeri</div>
            <div className="text-xl font-bold text-indigo-700">
              ₺{totalStockValue.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}
            </div>
            <div className="text-xs text-indigo-500 mt-0.5">{warehouses.length} depo</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="space-y-0">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 animate-pulse" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="w-9 h-9 rounded-xl bg-gray-100 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                    <div className="h-2 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            warehouses.map((w) => (
              <button
                key={w.id}
                onClick={() => selectWarehouse(w)}
                className={`w-full rounded-xl border p-4 text-left transition-all hover:shadow-sm ${selected?.id === w.id ? 'border-brand-300 bg-indigo-50' : 'bg-white border-gray-100 hover:border-gray-200'}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Warehouse className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{w.name}</div>
                      {w.city && <div className="text-xs text-gray-400">{w.city}</div>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {w.isDefault && (
                      <span className="text-xs px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-md">
                        Varsayılan
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(w);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-gray-400">Ürün Çeşidi</div>
                    <div className="font-semibold text-gray-900">{w._count.stockItems}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Stok Değeri</div>
                    <div className="font-semibold text-emerald-600">
                      ₺{w.stockValue.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Sağ: Stok detayı */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600">
            <Warehouse className="w-16 h-16 mb-4" />
            <p className="text-lg font-medium">Depo seçin</p>
            <p className="text-sm mt-1">Stok listesini görmek için depo seçin</p>
          </div>
        ) : (
          <>
            {/* Depo başlık */}
            <div className="px-6 py-4 border-b border-gray-100 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selected.name}</h2>
                  {selected.address && (
                    <div className="text-sm text-gray-400 mt-0.5">{selected.address}</div>
                  )}
                </div>
                <div className="flex gap-6 text-center">
                  <div>
                    <div className="text-xs text-gray-400">Ürün Çeşidi</div>
                    <div className="text-lg font-bold text-gray-900">{stockTotal}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Toplam Stok Değeri</div>
                    <div className="text-lg font-bold text-emerald-600">
                      ₺{selected.stockValue.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Arama */}
            <div className="px-4 py-3 border-b border-gray-50 bg-white">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={stockSearch}
                  onChange={(e) => {
                    setStockSearch(e.target.value);
                    setStockPage(1);
                  }}
                  placeholder="Ürün ara..."
                  className="input pl-9 text-sm"
                />
                {stockSearch && (
                  <button
                    onClick={() => setStockSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Stok tablosu */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Ürün</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-5 py-3">
                      Mevcut Stok
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 px-5 py-3">
                      Min. Stok
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 px-5 py-3">
                      Alış Fiyatı
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 px-5 py-3">
                      Stok Değeri
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 px-5 py-3">
                      Satış Değeri
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stock.map((item: any, i: number) => {
                    const low = item.minQuantity > 0 && item.quantity <= item.minQuantity;
                    const empty = item.quantity <= 0;
                    return (
                      <tr key={i} className={`hover:bg-gray-50 ${empty ? 'opacity-60' : ''}`}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            {(low || empty) && (
                              <AlertTriangle
                                className={`w-3.5 h-3.5 flex-shrink-0 ${empty ? 'text-red-400' : 'text-amber-400'}`}
                              />
                            )}
                            <div>
                              <div className="font-medium text-gray-900">{item.product?.name}</div>
                              <div className="text-xs text-gray-400">
                                {item.product?.code}{' '}
                                {item.product?.barcode ? `· ${item.product.barcode}` : ''}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span
                            className={`font-bold ${empty ? 'text-red-500' : low ? 'text-amber-500' : 'text-emerald-600'}`}
                          >
                            {item.quantity}
                          </span>
                          <span className="text-xs text-gray-400 ml-1">{item.product?.unit}</span>
                        </td>
                        <td className="px-5 py-3 text-right text-gray-400 text-xs">
                          {item.minQuantity || '-'}
                        </td>
                        <td className="px-5 py-3 text-right">
                          ₺
                          {(item.product?.purchasePrice || 0).toLocaleString('tr-TR', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-5 py-3 text-right font-medium">
                          ₺
                          {(item.quantity * (item.product?.purchasePrice || 0)).toLocaleString(
                            'tr-TR',
                            { minimumFractionDigits: 0 },
                          )}
                        </td>
                        <td className="px-5 py-3 text-right text-blue-600">
                          ₺
                          {(item.quantity * (item.product?.salePrice || 0)).toLocaleString(
                            'tr-TR',
                            { minimumFractionDigits: 0 },
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {stock.length === 0 && !loading && (
                <div className="p-8 text-center text-gray-400 text-sm">
                  Bu depoda ürün bulunamadı
                </div>
              )}
            </div>

            {/* Sayfalama */}
            {stockTotal > 30 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-white">
                <button
                  onClick={() => setStockPage((p) => Math.max(1, p - 1))}
                  disabled={stockPage === 1}
                  className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
                >
                  ← Önceki
                </button>
                <span className="text-xs text-gray-400">
                  {stockPage} / {Math.ceil(stockTotal / 30)} · {stockTotal} ürün
                </span>
                <button
                  onClick={() => setStockPage((p) => p + 1)}
                  disabled={stockPage * 30 >= stockTotal}
                  className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
                >
                  Sonraki →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Depo formu */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {editMode ? 'Depo Düzenle' : 'Yeni Depo'}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Depo Adı *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="input"
                  placeholder="Ana Depo"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Şehir</label>
                <input
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  className="input"
                  placeholder="İstanbul"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Adres</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className="input resize-none"
                  rows={2}
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                  className="w-4 h-4 accent-brand-500"
                />
                <span className="text-sm text-gray-700">Varsayılan depo olarak ayarla</span>
              </label>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name || saving}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
