'use client';

import { toast } from '@/lib/toast';
import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Package,
  Tag,
  Barcode,
  Edit2,
  Trash2,
  AlertTriangle,
  X,
  ChevronDown,
  Filter,
  TrendingDown,
  Check,
} from 'lucide-react';
import { api, uploadProductImage } from '@/lib/api';
import { ProductImage } from '@/components/ProductImage';
import { FormField, FormSelect, FormTextarea, IconButton } from '@/components/FormField';
import { CardSkeleton } from '@/components/ui/TableSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface ProductUnit {
  unit: string;
  factorToBase: number;
  isPurchaseUnit?: boolean;
  isSaleUnit?: boolean;
}

interface Product {
  id: string;
  code: string;
  name: string;
  barcode?: string;
  imageUrl?: string;
  unit: string;
  saleUnit?: string;
  salePrice: number;
  purchasePrice: number;
  vatRate: number;
  isActive: boolean;
  type: string;
  totalStock: number;
  minQuantity: number;
  productUnits?: ProductUnit[];
  category?: { id: string; name: string };
}

interface Category {
  id: string;
  name: string;
}

const emptyForm = {
  name: '',
  code: '',
  barcode: '',
  imageUrl: '',
  unit: 'ADET',
  saleUnit: 'ADET',
  type: 'PRODUCT',
  salePrice: '',
  purchasePrice: '',
  vatRate: '20',
  categoryId: '',
  minQuantity: '0',
  description: '',
  isActive: true,
  purchaseUnits: [] as { unit: string; factorToBase: string }[],
};

const UNIT_OPTIONS = ['ADET', 'KOLI', 'KUTU', 'KG', 'GR', 'TON', 'LT', 'MT', 'PAKET'];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [showLowStock, setShowLowStock] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [showStockIn, setShowStockIn] = useState(false);
  const [stockInForm, setStockInForm] = useState({
    quantity: '',
    inputUnit: 'ADET',
    warehouseId: '',
  });
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeScope, setBarcodeScope] = useState<'missing' | 'category' | 'all'>('missing');
  const [barcodeLabelPreset, setBarcodeLabelPreset] = useState<'a4' | 'thermal'>('a4');
  const [barcodeBusy, setBarcodeBusy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/products', {
        params: {
          search: search || undefined,
          type: typeFilter || undefined,
          categoryId: catFilter || undefined,
          page,
          limit: 48,
        },
      });
      setProducts(r.data.data || []);
      setTotal(r.data.total || 0);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, catFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api
      .get('/products/categories')
      .then((r) => setCategories(r.data))
      .catch(() => {});
    api
      .get('/products/low-stock')
      .then((r) => setLowStock(r.data))
      .catch(() => {});
    api
      .get('/inventory/warehouses')
      .then((r) => setWarehouses(r.data || []))
      .catch(() => {});
  }, []);

  const openNew = () => {
    setForm({ ...emptyForm });
    setEditMode(false);
    setShowForm(true);
  };
  const openEdit = (p: Product) => {
    const purchaseUnits = (p.productUnits || [])
      .filter((u) => u.isPurchaseUnit)
      .map((u) => ({ unit: u.unit, factorToBase: String(u.factorToBase) }));
    setForm({
      name: p.name,
      code: p.code,
      barcode: p.barcode || '',
      imageUrl: p.imageUrl || '',
      unit: p.unit,
      saleUnit: p.saleUnit || p.unit,
      type: p.type,
      salePrice: String(p.salePrice),
      purchasePrice: String(p.purchasePrice),
      vatRate: String(p.vatRate),
      categoryId: p.category?.id || '',
      minQuantity: String(p.minQuantity),
      description: '',
      isActive: p.isActive,
      purchaseUnits,
    });
    setEditMode(true);
    setSelected(p);
    setShowForm(true);
  };

  const addPurchaseUnit = () =>
    setForm((f) => ({
      ...f,
      purchaseUnits: [...f.purchaseUnits, { unit: 'KOLI', factorToBase: '1' }],
    }));
  const removePurchaseUnit = (i: number) =>
    setForm((f) => ({ ...f, purchaseUnits: f.purchaseUnits.filter((_, j) => j !== i) }));

  const getUnitOptions = (product?: Product | null) => {
    const base = product?.unit || form.unit;
    const opts = new Set([base, form.saleUnit, ...form.purchaseUnits.map((u) => u.unit)]);
    (product?.productUnits || []).forEach((u) => opts.add(u.unit));
    UNIT_OPTIONS.forEach((u) => opts.add(u));
    return [...opts];
  };

  const handleStockIn = async () => {
    if (!selected || !stockInForm.quantity) return;
    const wh = stockInForm.warehouseId || warehouses.find((w) => w.isDefault)?.id;
    if (!wh) {
      toast.error('Depo bulunamadı');
      return;
    }
    try {
      await api.post('/inventory/movements', {
        productId: selected.id,
        warehouseId: wh,
        type: 'IN',
        quantity: parseFloat(stockInForm.quantity),
        inputUnit: stockInForm.inputUnit,
        description: `Stok girişi (${stockInForm.quantity} ${stockInForm.inputUnit})`,
      });
      setShowStockIn(false);
      setStockInForm({ quantity: '', inputUnit: 'ADET', warehouseId: '' });
      load();
      const r = await api.get(`/products/${selected.id}`);
      setSelected(r.data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Stok girişi başarısız');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const units: {
        unit: string;
        factorToBase: number;
        isPurchaseUnit?: boolean;
        isSaleUnit?: boolean;
      }[] = form.purchaseUnits
        .filter((u) => u.unit && parseFloat(u.factorToBase) > 0)
        .map((u) => ({
          unit: u.unit,
          factorToBase: parseFloat(u.factorToBase),
          isPurchaseUnit: true,
        }));
      if (form.saleUnit && form.saleUnit !== form.unit) {
        units.push({ unit: form.saleUnit, factorToBase: 1, isSaleUnit: true });
      }
      const dto = {
        ...form,
        imageUrl: form.imageUrl?.trim() || undefined,
        salePrice: parseFloat(form.salePrice) || 0,
        purchasePrice: parseFloat(form.purchasePrice) || 0,
        vatRate: parseFloat(form.vatRate) || 20,
        minQuantity: parseFloat(form.minQuantity) || 0,
        minStock: parseFloat(form.minQuantity) || 0,
        saleUnit: form.saleUnit || form.unit,
        units: units.length ? units : undefined,
      };
      delete (dto as any).purchaseUnits;
      delete (dto as any).minQuantity;
      if (editMode && selected) await api.patch(`/products/${selected.id}`, dto);
      else await api.post('/products', dto);
      setShowForm(false);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Hata');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/products/${deleteConfirm}`);
      toast.success('Ürün silindi');
      setSelected(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Silme başarısız');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    const r = await api.post('/products/categories', { name: newCatName });
    setCategories((c) => [...c, r.data]);
    setNewCatName('');
  };

  const runBulkBarcodes = async (printAfter: boolean) => {
    setBarcodeBusy(true);
    try {
      const genBody: any = { all: true };
      if (barcodeScope === 'category') {
        if (!catFilter) {
          toast.info('Önce sol panelden kategori filtresi seçin');
          setBarcodeBusy(false);
          return;
        }
        genBody.all = undefined;
        genBody.categoryId = catFilter;
      }

      const gen = await api.post('/products/barcodes/generate', genBody);
      if ((gen.data.count || 0) === 0 && barcodeScope === 'missing') {
        toast.error('Barkodsuz ürün bulunamadı.');
      } else if (!printAfter) {
        toast.info(`${gen.data.count || 0} ürüne barkod atandı.`);
      }

      if (printAfter) {
        const labelBody: any = { onlyMissing: false };
        if (barcodeScope === 'all') labelBody.all = true;
        else if (barcodeScope === 'category') labelBody.categoryId = catFilter;
        else labelBody.all = true;

        const labels = await api.post('/products/barcodes/labels', labelBody);
        const items = labels.data || [];
        const isThermal = barcodeLabelPreset === 'thermal';
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(`<!DOCTYPE html><html><head><title>Barkod Etiketleri</title>
            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
            <style>
              body{font-family:sans-serif;padding:12px}
              .grid{display:grid;grid-template-columns:${isThermal ? 'repeat(2,58mm)' : 'repeat(3,1fr)'};gap:${isThermal ? '4mm' : '12px'}}
              .label{border:1px solid #ccc;padding:${isThermal ? '4mm' : '12px'};text-align:center;page-break-inside:avoid;width:${isThermal ? '58mm' : 'auto'};min-height:${isThermal ? '40mm' : 'auto'}}
              .name{font-size:${isThermal ? '10px' : '12px'};font-weight:600;margin-bottom:4px}
              .meta{font-size:10px;color:#666;margin-top:4px}
              svg.barcode{margin:6px auto;display:block;max-width:100%}
            </style></head><body>
            <div class="grid">${items
              .map(
                (p: any, i: number) =>
                  `<div class="label"><div class="name">${p.name}</div><svg class="barcode" id="bc${i}"></svg><div class="meta">${p.code}${p.unit ? ' · ' + p.unit : ''}</div></div>`,
              )
              .join('')}</div>
            <script>
              const items = ${JSON.stringify(items.map((p: any) => p.barcode || ''))};
              items.forEach((code, i) => {
                if (code) JsBarcode("#bc"+i, code, { format: "CODE128", width: ${isThermal ? 1.2 : 1.5}, height: ${isThermal ? 32 : 40}, displayValue: true, fontSize: ${isThermal ? 10 : 12}, margin: 2 });
              });
              window.onload = () => setTimeout(() => window.print(), 400);
            <\/script></body></html>`);
          win.document.close();
        }
      }
      setShowBarcodeModal(false);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Barkod işlemi başarısız');
    } finally {
      setBarcodeBusy(false);
    }
  };

  const margin = selected
    ? ((selected.salePrice - selected.purchasePrice) / selected.salePrice) * 100
    : 0;

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Sol Panel: Liste ───────────────────────────────────── */}
      <div className="w-[420px] flex-shrink-0 flex flex-col border-r border-gray-100 bg-white">
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900">Ürün Yönetimi</h1>
            <div className="flex gap-2">
              {lowStock.length > 0 && (
                <button
                  onClick={() => setShowLowStock(true)}
                  className="relative px-2.5 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-red-100 transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Kritik Stok ({lowStock.length})
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowBarcodeModal(true)}
                className="btn-secondary text-sm px-3 py-1.5 flex items-center gap-1.5"
              >
                <Barcode className="w-4 h-4" /> Barkod
              </button>
              <button
                onClick={openNew}
                className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Yeni
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <FormField
              label="Ürün ara"
              hideLabel
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Ürün adı, kod, barkod..."
              className="input pl-9 text-sm"
            />
            {search && (
              <IconButton
                label="Aramayı temizle"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                <X className="w-3.5 h-3.5" />
              </IconButton>
            )}
          </div>

          <div className="flex gap-2">
            <FormSelect
              label="Tür filtresi"
              hideLabel
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="input text-xs flex-1"
            >
              <option value="">Tür: Tümü</option>
              <option value="PRODUCT">Ürün</option>
              <option value="SERVICE">Hizmet</option>
            </FormSelect>
            <FormSelect
              label="Kategori filtresi"
              hideLabel
              value={catFilter}
              onChange={(e) => {
                setCatFilter(e.target.value);
                setPage(1);
              }}
              className="input text-xs flex-1"
            >
              <option value="">Kategori: Tümü</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </FormSelect>
          </div>

          <div className="text-xs text-gray-400">{total} ürün</div>
        </div>

        {/* Ürün listesi */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {loading ? (
            <div className="p-4">
              <CardSkeleton count={6} />
            </div>
          ) : products.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Ürün bulunamadı"
              description="Arama kriterlerinizi değiştirin veya yeni bir ürün ekleyin."
              action={{ label: '+ Yeni Ürün', onClick: openNew }}
            />
          ) : (
            products.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${selected?.id === p.id ? 'bg-indigo-50' : ''}`}
              >
                <ProductImage src={p.imageUrl} alt={p.name} size="sm" rounded="xl" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-gray-900 truncate">{p.name}</span>
                    {!p.isActive && (
                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                        Pasif
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">{p.code}</span>
                    {p.category && (
                      <span className="text-xs px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded">
                        {p.category.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold text-gray-900">
                    ₺{p.salePrice?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </div>
                  {p.type !== 'SERVICE' && (
                    <div
                      className={`text-xs ${p.totalStock > 0 ? (p.totalStock <= (p.minQuantity || 0) && p.minQuantity > 0 ? 'text-amber-500' : 'text-emerald-600') : 'text-red-500'}`}
                    >
                      {p.totalStock} {p.unit}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Sayfalama */}
        {total > 48 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
            >
              ← Önceki
            </button>
            <span className="text-xs text-gray-400">
              Sayfa {page} / {Math.ceil(total / 48)}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * 48 >= total}
              className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
            >
              Sonraki →
            </button>
          </div>
        )}
      </div>

      {/* ── Sağ Panel: Detay ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600">
            <Package className="w-16 h-16 mb-4" />
            <p className="text-lg font-medium">Ürün seçin</p>
            <p className="text-sm mt-1">Detayları görmek için listeden ürün seçin</p>
          </div>
        ) : (
          <div className="max-w-2xl space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 min-w-0">
                <ProductImage src={selected.imageUrl} alt={selected.name} size="lg" rounded="xl" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-gray-900">{selected.name}</h2>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-lg ${selected.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {selected.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-400">{selected.code}</span>
                    {selected.barcode && (
                      <span className="text-xs flex items-center gap-1 text-gray-400">
                        <Barcode className="w-3 h-3" />
                        {selected.barcode}
                      </span>
                    )}
                    {selected.category && (
                      <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-lg">
                        {selected.category.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {selected.type !== 'SERVICE' && (
                  <button
                    onClick={() => {
                      setStockInForm({
                        quantity: '',
                        inputUnit: selected.saleUnit || selected.unit,
                        warehouseId: warehouses.find((w) => w.isDefault)?.id || '',
                      });
                      setShowStockIn(true);
                    }}
                    className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Stok Girişi
                  </button>
                )}
                <button
                  onClick={() => openEdit(selected)}
                  className="btn-secondary text-sm px-3 py-1.5 flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Düzenle
                </button>
                <button
                  onClick={() => handleDelete(selected.id)}
                  className="text-red-500 hover:bg-red-50 border border-red-100 rounded-xl px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Sil
                </button>
              </div>
            </div>

            {/* Fiyat kartları */}
            <div className="grid grid-cols-3 gap-4">
              <div className="kpi-card">
                <div className="text-xs text-gray-500 mb-1">Satış Fiyatı</div>
                <div className="text-xl font-bold text-brand-600">
                  ₺{selected.salePrice?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">KDV %{selected.vatRate}</div>
              </div>
              <div className="kpi-card">
                <div className="text-xs text-gray-500 mb-1">Alış Fiyatı</div>
                <div className="text-xl font-bold text-gray-700">
                  ₺{selected.purchasePrice?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="kpi-card">
                <div className="text-xs text-gray-500 mb-1">Kar Marjı</div>
                <div
                  className={`text-xl font-bold ${margin >= 20 ? 'text-emerald-600' : margin >= 10 ? 'text-amber-500' : 'text-red-500'}`}
                >
                  %{isNaN(margin) ? '0' : margin.toFixed(1)}
                </div>
              </div>
            </div>

            {/* Stok bilgisi */}
            {selected.type !== 'SERVICE' && (
              <div className="card p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Stok Durumu</h3>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div
                      className={`text-3xl font-bold ${selected.totalStock <= 0 ? 'text-red-500' : selected.minQuantity > 0 && selected.totalStock <= selected.minQuantity ? 'text-amber-500' : 'text-emerald-600'}`}
                    >
                      {selected.totalStock}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{selected.unit}</div>
                  </div>
                  {selected.minQuantity > 0 && (
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-500">
                        {selected.minQuantity}
                      </div>
                      <div className="text-xs text-gray-400">Min. Stok</div>
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${selected.totalStock <= 0 ? 'bg-red-500' : selected.minQuantity > 0 && selected.totalStock <= selected.minQuantity ? 'bg-amber-400' : 'bg-emerald-500'}`}
                        style={{
                          width: `${Math.min(100, selected.minQuantity > 0 ? (selected.totalStock / (selected.minQuantity * 3)) * 100 : Math.min(100, selected.totalStock > 0 ? 100 : 0))}%`,
                        }}
                      />
                    </div>
                    {selected.minQuantity > 0 && selected.totalStock <= selected.minQuantity && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Kritik stok seviyesinde!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Ürün bilgileri */}
            <div className="card p-5 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Stok Birimi:</span>{' '}
                <span className="font-medium ml-1">{selected.unit}</span>
              </div>
              <div>
                <span className="text-gray-400">Satış Birimi:</span>{' '}
                <span className="font-medium ml-1">{selected.saleUnit || selected.unit}</span>
              </div>
              <div>
                <span className="text-gray-400">Tür:</span>{' '}
                <span className="font-medium ml-1">
                  {selected.type === 'SERVICE' ? 'Hizmet' : 'Ürün'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">KDV Oranı:</span>{' '}
                <span className="font-medium ml-1">%{selected.vatRate}</span>
              </div>
              {(selected.productUnits?.length ?? 0) > 0 && (
                <div className="col-span-2">
                  <span className="text-gray-400">Birim Dönüşümleri:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {selected.productUnits!.map((u, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-lg"
                      >
                        1 {u.unit} = {u.factorToBase} {selected.unit}
                        {u.isPurchaseUnit ? ' (giriş)' : u.isSaleUnit ? ' (satış)' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Ürün Formu Modal ──────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {editMode ? 'Ürün Düzenle' : 'Yeni Ürün'}
              </h2>
              <IconButton label="Formu kapat" onClick={() => setShowForm(false)} className="text-gray-400">
                <X className="w-5 h-5" />
              </IconButton>
            </div>
            <div className="p-6 space-y-4">
              {/* Tür seçimi */}
              <div className="flex gap-2">
                {['PRODUCT', 'SERVICE'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setForm((f) => ({ ...f, type: t }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${form.type === t ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {t === 'PRODUCT' ? '📦 Ürün' : '⚙️ Hizmet'}
                  </button>
                ))}
              </div>

              <FormField
                label="Ürün Adı *"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="input"
                placeholder="Ürün adı"
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label="Ürün Kodu"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  className="input"
                  placeholder="Otomatik"
                />
                <FormField
                  label="Barkod"
                  value={form.barcode}
                  onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                  className="input"
                  placeholder="Barkod"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Ürün Görseli</label>
                <div className="flex gap-3 items-start">
                  <ProductImage
                    src={form.imageUrl || null}
                    alt={form.name || 'Önizleme'}
                    size="md"
                  />
                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      aria-label="Ürün görseli yükle"
                      className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const { url } = await uploadProductImage(file);
                          setForm((f) => ({ ...f, imageUrl: url }));
                        } catch {
                          toast.info('Görsel yüklenemedi');
                        }
                      }}
                    />
                    <p className="text-xs text-gray-400">Bilgisayarınızdan JPG veya PNG seçin (max 5 MB)</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label="Satış Fiyatı *"
                  type="number"
                  value={form.salePrice}
                  onChange={(e) => setForm((f) => ({ ...f, salePrice: e.target.value }))}
                  className="input"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                <FormField
                  label="Alış Fiyatı"
                  type="number"
                  value={form.purchasePrice}
                  onChange={(e) => setForm((f) => ({ ...f, purchasePrice: e.target.value }))}
                  className="input"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <FormSelect
                  label="Stok Birimi (temel)"
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  className="input"
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </FormSelect>
                <FormSelect
                  label="Satış Birimi"
                  value={form.saleUnit}
                  onChange={(e) => setForm((f) => ({ ...f, saleUnit: e.target.value }))}
                  className="input"
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </FormSelect>
                <FormSelect
                  label="KDV %"
                  value={form.vatRate}
                  onChange={(e) => setForm((f) => ({ ...f, vatRate: e.target.value }))}
                  className="input"
                >
                  {['0', '1', '10', '20'].map((v) => (
                    <option key={v} value={v}>
                      %{v}
                    </option>
                  ))}
                </FormSelect>
              </div>

              {form.type === 'PRODUCT' && (
                <div className="border border-gray-100 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-600">
                      Giriş Birimleri (koli/kutu/ton → temel birim)
                    </label>
                    <button
                      type="button"
                      onClick={addPurchaseUnit}
                      className="text-xs text-brand-500 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ekle
                    </button>
                  </div>
                  {form.purchaseUnits.length === 0 ? (
                    <p className="text-xs text-gray-400">
                      Örn: 1 KOLI = 24 ADET veya 1 TON = 1000 KG
                    </p>
                  ) : (
                    form.purchaseUnits.map((u, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <span className="text-xs text-gray-400 w-6">1</span>
                        <FormSelect
                          label="Giriş birimi"
                          hideLabel
                          value={u.unit}
                          onChange={(e) =>
                            setForm((f) => {
                              const pu = [...f.purchaseUnits];
                              pu[i] = { ...pu[i], unit: e.target.value };
                              return { ...f, purchaseUnits: pu };
                            })
                          }
                          className="input flex-1 text-sm"
                        >
                          {UNIT_OPTIONS.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </FormSelect>
                        <span className="text-xs text-gray-400">=</span>
                        <FormField
                          label="Dönüşüm katsayısı"
                          hideLabel
                          type="number"
                          value={u.factorToBase}
                          onChange={(e) =>
                            setForm((f) => {
                              const pu = [...f.purchaseUnits];
                              pu[i] = { ...pu[i], factorToBase: e.target.value };
                              return { ...f, purchaseUnits: pu };
                            })
                          }
                          className="input w-20 text-sm"
                          min="0.001"
                          step="any"
                        />
                        <span className="text-xs text-gray-500 w-12">{form.unit}</span>
                        <IconButton
                          label="Giriş birimini kaldır"
                          type="button"
                          onClick={() => removePurchaseUnit(i)}
                          className="text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </IconButton>
                      </div>
                    ))
                  )}
                </div>
              )}

              <FormField
                label={`Min. Stok (${form.unit})`}
                type="number"
                value={form.minQuantity}
                onChange={(e) => setForm((f) => ({ ...f, minQuantity: e.target.value }))}
                className="input"
                min="0"
              />

              <div>
                <FormSelect
                  label="Kategori"
                  value={form.categoryId}
                  onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                  className="input flex-1"
                >
                  <option value="">Kategori seçin...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </FormSelect>
                <div className="flex gap-2 mt-1">
                  <FormField
                    label="Yeni kategori adı"
                    hideLabel
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Yeni kategori ekle..."
                    className="input text-xs flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                  />
                  <button
                    onClick={addCategory}
                    disabled={!newCatName.trim()}
                    className="px-2 py-1 bg-brand-500 text-white rounded-lg text-xs disabled:opacity-40"
                  >
                    Ekle
                  </button>
                </div>
              </div>

              <FormTextarea
                label="Açıklama"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="input resize-none"
                rows={2}
              />

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="w-4 h-4 accent-brand-500"
                />
                <span className="text-sm text-gray-700">Aktif</span>
              </label>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name || !form.salePrice || saving}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {saving ? 'Kaydediliyor...' : editMode ? 'Güncelle' : 'Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stok girişi modal */}
      {showStockIn && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Stok Girişi — {selected.name}</h2>
              <IconButton label="Stok girişini kapat" onClick={() => setShowStockIn(false)} className="text-gray-400">
                <X className="w-5 h-5" />
              </IconButton>
            </div>
            <FormSelect
              label="Depo"
              value={stockInForm.warehouseId}
              onChange={(e) => setStockInForm((f) => ({ ...f, warehouseId: e.target.value }))}
              className="input"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                  {w.isDefault ? ' (Varsayılan)' : ''}
                </option>
              ))}
            </FormSelect>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                label="Miktar"
                type="number"
                value={stockInForm.quantity}
                onChange={(e) => setStockInForm((f) => ({ ...f, quantity: e.target.value }))}
                className="input"
                min="0.001"
                step="any"
              />
              <FormSelect
                label="Birim"
                value={stockInForm.inputUnit}
                onChange={(e) => setStockInForm((f) => ({ ...f, inputUnit: e.target.value }))}
                className="input"
              >
                {getUnitOptions(selected).map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </FormSelect>
            </div>
            <p className="text-xs text-gray-400">
              Stok {selected.unit} biriminde takip edilir. Koli/kutu veya ton/kg dönüşümü otomatik
              yapılır.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowStockIn(false)} className="btn-secondary flex-1">
                İptal
              </button>
              <button
                onClick={handleStockIn}
                disabled={!stockInForm.quantity}
                className="btn-primary flex-1"
              >
                Giriş Yap
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kritik stok modal */}
      {showLowStock && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h2 className="font-bold text-gray-900">Kritik Stok ({lowStock.length})</h2>
              </div>
              <IconButton label="Kritik stok listesini kapat" onClick={() => setShowLowStock(false)} className="text-gray-400">
                <X className="w-5 h-5" />
              </IconButton>
            </div>
            <div className="divide-y divide-gray-50">
              {lowStock.map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${item.quantity === 0 ? 'bg-red-500' : 'bg-amber-400'}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {item.product?.name}
                    </div>
                    <div className="text-xs text-gray-400">{item.warehouse?.name}</div>
                  </div>
                  <div className="text-right text-sm">
                    <div
                      className={`font-bold ${item.quantity === 0 ? 'text-red-500' : 'text-amber-500'}`}
                    >
                      {item.quantity}
                    </div>
                    <div className="text-xs text-gray-400">Min: {item.minQuantity}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showBarcodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="modal-card w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-[#1B1B1F]">Toplu Barkod İşlemleri</h3>
            <p className="text-sm text-gray-500">
              Barkodsuz ürünlere otomatik numara atanır. Seçilen kapsam için etiket basımı yapılabilir.
            </p>
            <FormSelect
              label="Kapsam"
              value={barcodeScope}
              onChange={(e) => setBarcodeScope(e.target.value as any)}
            >
              <option value="missing">Sadece barkodsuz ürünler</option>
              <option value="category">Seçili kategori</option>
              <option value="all">Tüm stok</option>
            </FormSelect>
            <FormSelect
              label="Etiket şablonu"
              value={barcodeLabelPreset}
              onChange={(e) => setBarcodeLabelPreset(e.target.value as 'a4' | 'thermal')}
            >
              <option value="a4">A4 grid (3 sütun)</option>
              <option value="thermal">Termal (58×40 mm)</option>
            </FormSelect>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={barcodeBusy}
                onClick={() => runBulkBarcodes(false)}
                className="btn-primary py-2"
              >
                Barkod Oluştur
              </button>

              <button
                type="button"
                disabled={barcodeBusy}
                onClick={() => runBulkBarcodes(true)}
                className="btn-secondary py-2"
              >
                Barkod Oluştur + Etiket Bas
              </button>
              <button
                type="button"
                onClick={() => setShowBarcodeModal(false)}
                className="text-sm text-gray-500 hover:text-gray-700 text-center"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirm !== null}
        title="Ürünü sil"
        message="Bu ürünü kalıcı olarak silmek istediğinize emin misiniz?"
        confirmLabel="Sil"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
