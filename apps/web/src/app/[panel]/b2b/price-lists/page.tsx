'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { Plus, Search, Tag, X, Loader2 } from 'lucide-react';
import { FormField } from '@/components/FormField';

export default function PriceListsPage() {
  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('TRY');
  const [items, setItems] = useState<{ productId: string; price: string; minQuantity: string }[]>([]);

  // Helpers
  const [products, setProducts] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchLists();
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/invoices/products/match?q=&limit=100');
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLists = async () => {
    try {
      setLoading(true);
      const res = await api.get('/b2b/price-lists');
      setLists(res.data);
    } catch (err: any) {
      toast.error('Fiyat listeleri alınamadı');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return toast.error('Liste adı zorunludur');
    
    setSaving(true);
    try {
      await api.post('/b2b/price-lists', { 
        name, 
        description, 
        currency,
        items: items.map(i => ({ productId: i.productId, price: Number(i.price), minQuantity: Number(i.minQuantity) }))
      });
      toast.success('Fiyat listesi oluşturuldu');
      setShowModal(false);
      fetchLists();
      setName(''); setDescription(''); setCurrency('TRY'); setItems([]);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const filteredLists = lists.filter(l => 
    l.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Fiyat Listeleri</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Liste</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Liste ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Yükleniyor...</div>
        ) : filteredLists.length === 0 ? (
          <div className="p-8 text-center text-gray-500 flex flex-col items-center">
            <Tag className="w-12 h-12 text-gray-300 mb-3" />
            <p>Fiyat listesi bulunamadı.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Liste Adı</th>
                  <th className="py-3 px-4">Açıklama</th>
                  <th className="py-3 px-4">Para Birimi</th>
                  <th className="py-3 px-4">Ürün Sayısı</th>
                  <th className="py-3 px-4">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLists.map((list) => (
                  <React.Fragment key={list.id}>
                  <tr className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setExpandedId(expandedId === list.id ? null : list.id)}>
                    <td className="py-3 px-4 font-medium text-gray-900 flex items-center gap-2">
                      <svg className={`w-4 h-4 transition-transform ${expandedId === list.id ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      {list.name}
                    </td>
                    <td className="py-3 px-4 text-gray-500">{list.description || '-'}</td>
                    <td className="py-3 px-4 font-semibold">{list.currency}</td>
                    <td className="py-3 px-4">{list.items?.length || 0} ürün</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${list.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {list.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                  </tr>
                  {expandedId === list.id && (
                    <tr className="bg-indigo-50/50">
                      <td colSpan={5} className="p-4">
                        <div className="bg-white rounded-lg border border-indigo-100 p-4">
                          <h4 className="font-semibold text-sm mb-3">Fiyat Listesi Ürünleri</h4>
                          <table className="w-full text-sm">
                            <thead className="text-gray-500 border-b border-gray-100">
                              <tr>
                                <th className="text-left pb-2 font-medium">Ürün Adı</th>
                                <th className="text-right pb-2 font-medium">Birim Fiyat</th>
                                <th className="text-right pb-2 font-medium">Min. Sipariş</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {list.items?.map((item: any, idx: number) => (
                                <tr key={idx}>
                                  <td className="py-2 text-gray-700">{item.product?.name || 'Bilinmeyen Ürün'}</td>
                                  <td className="py-2 text-right font-medium text-gray-900">
                                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: list.currency }).format(item.price)}
                                  </td>
                                  <td className="py-2 text-right text-gray-700">{item.minQuantity} {item.product?.unit || 'ADET'}</td>
                                </tr>
                              ))}
                              {(!list.items || list.items.length === 0) && (
                                <tr>
                                  <td colSpan={3} className="py-3 text-center text-gray-500">Bu listede henüz ürün yok.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-semibold text-lg">Yeni Fiyat Listesi</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-4 space-y-4">
              <FormField label="Liste Adı" value={name} onChange={(e) => setName(e.target.value)} required />
              <FormField label="Açıklama" value={description} onChange={(e) => setDescription(e.target.value)} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Para Birimi</label>
                <select 
                  className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="TRY">TRY - Türk Lirası</option>
                  <option value="USD">USD - Amerikan Doları</option>
                  <option value="EUR">EUR - Euro</option>
                </select>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">Listeye Eklenecek Ürünler</h4>
                  <button
                    type="button"
                    onClick={() => setItems([...items, { productId: '', price: '0', minQuantity: '1' }])}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Ürün Ekle
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                      <select
                        className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                        value={item.productId}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[idx].productId = e.target.value;
                          setItems(newItems);
                        }}
                        required
                      >
                        <option value="">Ürün Seçiniz...</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input
                        type="number"
                        className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                        value={item.price}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[idx].price = e.target.value;
                          setItems(newItems);
                        }}
                        min="0" step="0.01" required
                        placeholder="Fiyat"
                      />
                      <input
                        type="number"
                        className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                        value={item.minQuantity}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[idx].minQuantity = e.target.value;
                          setItems(newItems);
                        }}
                        min="1" required
                        placeholder="Min. Miktar"
                      />
                      <button
                        type="button"
                        onClick={() => setItems(items.filter((_, i) => i !== idx))}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {items.length === 0 && <p className="text-sm text-gray-500 text-center py-2">Henüz ürün eklenmedi.</p>}
                </div>
              </div>
            </form>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Oluştur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
