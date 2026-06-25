'use client';

import { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Search,
  Edit2,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  DollarSign,
} from 'lucide-react';
import { FormField, FormSelect, IconButton } from '@/components/FormField';

type PriceListItem = {
  productId: string;
  price: number;
  product: { name: string; unit: string; salePrice: number | null };
};
type PriceList = {
  id: string;
  name: string;
  currency: string;
  isDefault: boolean;
  createdAt: string;
  items: PriceListItem[];
};
type Product = { id: string; name: string; unit: string; salePrice: number | null };

const fmtMoney = (n: number, cur = 'TRY') => {
  const sym = cur === 'USD' ? '$' : cur === 'EUR' ? '€' : '₺';
  return sym + n.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
};

export default function PriceListsPage() {
  const [lists, setLists] = useState<PriceList[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PriceList | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', currency: 'TRY' });
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<{ productId: string; price: string } | null>(null);
  const [addingProduct, setAddingProduct] = useState<{ productId: string; price: string } | null>(
    null,
  );
  const [search, setSearch] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [lr, pr] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/b2b/price-lists`, {
          headers,
        }).then((r) => r.json()),
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/products?limit=200`,
          { headers },
        ).then((r) => r.json()),
      ]);
      const listsArr = Array.isArray(lr) ? lr : [];
      setLists(listsArr);
      if (listsArr.length > 0 && !selected) setSelected(listsArr[0]);
      setProducts(pr.items || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const createList = async () => {
    if (!newForm.name) return;
    setSaving(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/b2b/price-lists`,
        { method: 'POST', headers, body: JSON.stringify(newForm) },
      );
      const data = await res.json();
      setShowNewModal(false);
      setNewForm({ name: '', currency: 'TRY' });
      await fetchAll();
      setSelected(data);
    } catch {}
    setSaving(false);
  };

  const saveItem = async (listId: string, productId: string, price: string) => {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/b2b/price-lists/${listId}/items/${productId}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ price: parseFloat(price) }),
        },
      );
      await fetchAll();
    } catch {}
    setEditingItem(null);
    setAddingProduct(null);
  };

  const selectedItems = selected?.items || [];
  const filteredProducts = products.filter(
    (p) => !search || p.name.toLowerCase().includes(search.toLowerCase()),
  );
  const itemMap = new Map(selectedItems.map((i) => [i.productId, i]));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Tag className="text-indigo-400" />
            Fiyat Listeleri
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            B2B müşterilerinize özel fiyatlandırma listeleri
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          Yeni Liste
        </button>
      </div>

      <div className="flex gap-6 h-[calc(100vh-230px)]">
        {/* Left: lists */}
        <div className="w-64 flex flex-col gap-2">
          <h3 className="text-gray-400 text-xs uppercase tracking-wider px-1">Fiyat Listeleri</h3>
          {loading ? (
            <div className="text-gray-400 text-sm py-4 text-center">Yükleniyor…</div>
          ) : lists.length === 0 ? (
            <div className="text-gray-400 text-sm py-4 text-center">Henüz liste yok</div>
          ) : (
            lists.map((l) => (
              <button
                key={l.id}
                onClick={() => setSelected(l)}
                className={`text-left p-3 rounded-lg border transition-all ${selected?.id === l.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-gray-900 font-medium text-sm">{l.name}</span>
                  {l.isDefault && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-brand-50 text-brand-600">
                      Varsayılan
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-gray-400 text-xs">{l.currency}</span>
                  <span className="text-gray-500 text-xs">·</span>
                  <span className="text-gray-400 text-xs">{l.items.length} ürün</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Right: items */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {!selected ? (
            <div className="card flex-1 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Tag size={40} className="mx-auto mb-3 opacity-20" />
                <p>Bir fiyat listesi seçin</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 h-full">
              {/* Header */}
              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-gray-900 font-bold text-lg">{selected.name}</h2>
                    <p className="text-gray-400 text-sm">
                      Para birimi: {selected.currency} · {selected.items.length} ürün tanımlı
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-xs">Ürün ara:</span>
                    <div className="relative">
                      <Search
                        size={13}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <FormField
                        label="Ürün adı ara"
                        hideLabel
                        className="input pl-8 text-sm w-52"
                        placeholder="Ürün adı…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Add product row */}
              <div className="card">
                <div className="flex items-center gap-3">
                  <FormSelect
                    label="Fiyat listesine ürün ekle"
                    hideLabel
                    className="input flex-1 text-sm"
                    value={addingProduct?.productId || ''}
                    onChange={(e) =>
                      setAddingProduct({
                        productId: e.target.value,
                        price: String(
                          products.find((p) => p.id === e.target.value)?.salePrice || '',
                        ),
                      })
                    }
                  >
                    <option value="">Fiyat listesine ürün ekle…</option>
                    {filteredProducts
                      .filter((p) => !itemMap.has(p.id))
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Satış: {p.salePrice ? fmtMoney(p.salePrice) : '—'})
                        </option>
                      ))}
                  </FormSelect>
                  {addingProduct?.productId && (
                    <>
                      <div className="relative w-36">
                        <DollarSign
                          size={13}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <FormField
                          label="Fiyat"
                          hideLabel
                          type="number"
                          className="input pl-7 text-sm w-full"
                          placeholder="Fiyat"
                          value={addingProduct.price}
                          onChange={(e) =>
                            setAddingProduct((a) => (a ? { ...a, price: e.target.value } : null))
                          }
                        />
                      </div>
                      <button
                        onClick={() =>
                          saveItem(selected.id, addingProduct.productId, addingProduct.price)
                        }
                        className="btn-primary text-sm px-4"
                      >
                        Ekle
                      </button>
                      <IconButton
                        label="İptal"
                        onClick={() => setAddingProduct(null)}
                        className="btn-secondary text-sm px-3"
                      >
                        <X size={14} />
                      </IconButton>
                    </>
                  )}
                </div>
              </div>

              {/* Items table */}
              <div className="card flex-1 overflow-y-auto">
                {selectedItems.length === 0 ? (
                  <div className="text-center text-gray-400 py-12">
                    <Tag size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Bu listede henüz ürün yok</p>
                    <p className="text-xs mt-1">Yukarıdan ürün ekleyebilirsiniz</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 text-xs border-b border-gray-200">
                        <th className="text-left py-2 pr-4">Ürün</th>
                        <th className="text-left py-2">Birim</th>
                        <th className="text-right py-2">Katalog Fiyatı</th>
                        <th className="text-right py-2">Liste Fiyatı</th>
                        <th className="text-right py-2">İndirim</th>
                        <th className="text-right py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItems
                        .filter(
                          (i) =>
                            !search || i.product.name.toLowerCase().includes(search.toLowerCase()),
                        )
                        .map((item) => {
                          const isEditing = editingItem?.productId === item.productId;
                          const catalogPrice = item.product.salePrice || 0;
                          const discount =
                            catalogPrice > 0
                              ? ((catalogPrice - item.price) / catalogPrice) * 100
                              : 0;
                          return (
                            <tr
                              key={item.productId}
                              className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                            >
                              <td className="py-2 pr-4 text-gray-900">{item.product.name}</td>
                              <td className="py-2 text-gray-400">{item.product.unit}</td>
                              <td className="py-2 text-right text-gray-400">
                                {catalogPrice ? fmtMoney(catalogPrice, selected.currency) : '—'}
                              </td>
                              <td className="py-2 text-right">
                                {isEditing ? (
                                  <FormField
                                    label={`${item.product.name} liste fiyatı`}
                                    hideLabel
                                    type="number"
                                    className="input text-sm w-28 text-right"
                                    value={editingItem.price}
                                    onChange={(e) =>
                                      setEditingItem((ei) =>
                                        ei ? { ...ei, price: e.target.value } : null,
                                      )
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter')
                                        saveItem(selected.id, item.productId, editingItem.price);
                                      if (e.key === 'Escape') setEditingItem(null);
                                    }}
                                    autoFocus
                                  />
                                ) : (
                                  <span className="text-gray-900 font-semibold">
                                    {fmtMoney(item.price, selected.currency)}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 text-right">
                                {discount > 0 ? (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600">
                                    %{discount.toFixed(1)}
                                  </span>
                                ) : discount < 0 ? (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                                    +%{Math.abs(discount).toFixed(1)}
                                  </span>
                                ) : (
                                  <span className="text-gray-600">—</span>
                                )}
                              </td>
                              <td className="py-2 text-right">
                                {isEditing ? (
                                  <div className="flex gap-1 justify-end">
                                    <IconButton
                                      label="Fiyatı kaydet"
                                      onClick={() =>
                                        saveItem(selected.id, item.productId, editingItem.price)
                                      }
                                      className="p-1 rounded bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30"
                                    >
                                      <Save size={12} />
                                    </IconButton>
                                    <IconButton
                                      label="Düzenlemeyi iptal et"
                                      onClick={() => setEditingItem(null)}
                                      className="p-1 rounded bg-gray-100 text-gray-400 hover:bg-gray-200"
                                    >
                                      <X size={12} />
                                    </IconButton>
                                  </div>
                                ) : (
                                  <IconButton
                                    label="Fiyatı düzenle"
                                    onClick={() =>
                                      setEditingItem({
                                        productId: item.productId,
                                        price: String(item.price),
                                      })
                                    }
                                    className="p-1 rounded bg-gray-100 text-gray-400 hover:text-gray-900 hover:bg-gray-200 opacity-0 group-hover:opacity-100"
                                  >
                                    <Edit2 size={12} />
                                  </IconButton>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New List Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-sm">
            <h3 className="text-gray-900 font-semibold mb-4">Yeni Fiyat Listesi</h3>
            <div className="space-y-3">
              <FormField
                label="Liste Adı *"
                className="input w-full"
                placeholder="Örn: VIP Müşteri Listesi"
                value={newForm.name}
                onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
              />
              <FormSelect
                label="Para Birimi"
                className="input w-full"
                value={newForm.currency}
                onChange={(e) => setNewForm((f) => ({ ...f, currency: e.target.value }))}
              >
                <option value="TRY">TRY — Türk Lirası</option>
                <option value="USD">USD — Amerikan Doları</option>
                <option value="EUR">EUR — Euro</option>
              </FormSelect>
            </div>
            <div className="flex gap-3 mt-4">
              <button className="btn-secondary flex-1" onClick={() => setShowNewModal(false)}>
                İptal
              </button>
              <button
                className="btn-primary flex-1"
                onClick={createList}
                disabled={saving || !newForm.name}
              >
                {saving ? 'Oluşturuluyor…' : 'Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
