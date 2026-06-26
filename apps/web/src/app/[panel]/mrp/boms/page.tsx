'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { Plus, Search, Layers, X, Loader2 } from 'lucide-react';
import { FormField } from '@/components/FormField';

export default function BomsPage() {
  const [boms, setBoms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [items, setItems] = useState<{ productId: string; quantity: string; unit: string }[]>([]);

  // Helpers
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    fetchBoms();
    fetchProducts();
  }, []);

  const fetchBoms = async () => {
    try {
      setLoading(true);
      const res = await api.get('/mrp/boms');
      setBoms(res.data);
    } catch (err: any) {
      toast.error('Reçeteler alınamadı');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/invoices/products/match?q=&limit=100');
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !productId || items.length === 0) {
      return toast.error('Lütfen zorunlu alanları ve en az bir malzeme doldurun');
    }
    setSaving(true);
    try {
      await api.post('/mrp/boms', {
        code: code || `BOM-${Date.now().toString().slice(-6)}`,
        name,
        productId,
        quantity: Number(quantity),
        items: items.map(i => ({ ...i, quantity: Number(i.quantity) }))
      });
      toast.success('Reçete oluşturuldu');
      setShowModal(false);
      fetchBoms();
      // Reset
      setCode(''); setName(''); setProductId(''); setQuantity('1'); setItems([]);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const filteredBoms = boms.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase()) || 
    b.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Reçeteler (BOM)</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Reçete</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Reçete ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Yükleniyor...</div>
        ) : filteredBoms.length === 0 ? (
          <div className="p-8 text-center text-gray-500 flex flex-col items-center">
            <Layers className="w-12 h-12 text-gray-300 mb-3" />
            <p>Reçete bulunamadı.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Kod</th>
                  <th className="py-3 px-4">Reçete Adı</th>
                  <th className="py-3 px-4">Üretilecek Mamul</th>
                  <th className="py-3 px-4">Miktar</th>
                  <th className="py-3 px-4 text-right">Bileşen Sayısı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBoms.map((bom) => (
                  <tr key={bom.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-gray-900">{bom.code}</td>
                    <td className="py-3 px-4">{bom.name}</td>
                    <td className="py-3 px-4 text-indigo-600">{bom.product?.name || 'Bilinmiyor'}</td>
                    <td className="py-3 px-4">{bom.quantity} {bom.product?.unit}</td>
                    <td className="py-3 px-4 text-right text-gray-500">{bom.items?.length || 0} kalem</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-semibold text-lg">Yeni Reçete (BOM)</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Reçete Kodu" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Oto oluşturulur" />
                <FormField label="Reçete Adı" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Üretilecek Mamul *</label>
                  <select 
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    required
                  >
                    <option value="">Seçiniz...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                  </select>
                </div>
                <FormField label="Üretim Miktarı" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="0.01" step="0.01" required />
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">Kullanılacak Malzemeler</h4>
                  <button
                    type="button"
                    onClick={() => setItems([...items, { productId: '', quantity: '1', unit: 'ADET' }])}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Malzeme Ekle
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                      <select
                        className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                        value={item.productId}
                        onChange={(e) => {
                          const val = e.target.value;
                          const prd = products.find(p => p.id === val);
                          const newItems = [...items];
                          newItems[idx].productId = val;
                          if (prd) newItems[idx].unit = prd.unit || 'ADET';
                          setItems(newItems);
                        }}
                        required
                      >
                        <option value="">Ürün/Hammadde Seç...</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input
                        type="number"
                        className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[idx].quantity = e.target.value;
                          setItems(newItems);
                        }}
                        min="0.01" step="0.01" required
                        placeholder="Miktar"
                      />
                      <input
                        type="text"
                        className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-gray-100 text-gray-500"
                        value={item.unit}
                        readOnly
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
                  {items.length === 0 && <p className="text-sm text-gray-500 text-center py-2">Henüz malzeme eklenmedi.</p>}
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
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
