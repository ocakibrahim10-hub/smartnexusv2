'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { Plus, Search, Hammer, ChevronRight, X, Loader2, CheckCircle2, Calendar, Play, PauseCircle } from 'lucide-react';
import { FormField, FormSelect, FormTextarea } from '@/components/FormField';
import { ModuleGuide } from '@/components/ui/ModuleGuide';

export default function WorkOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [code, setCode] = useState('');
  const [bomId, setBomId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [plannedDate, setPlannedDate] = useState('');
  const [notes, setNotes] = useState('');

  // Helpers
  const [boms, setBoms] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
    fetchBoms();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/mrp/work-orders');
      setOrders(res.data);
    } catch (err: any) {
      toast.error('İş emirleri alınamadı');
    } finally {
      setLoading(false);
    }
  };

  const fetchBoms = async () => {
    try {
      const res = await api.get('/mrp/boms');
      setBoms(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bomId || !quantity) {
      return toast.error('Reçete ve miktar seçilmelidir');
    }
    setSaving(true);
    try {
      await api.post('/mrp/work-orders', {
        code: code || `WO-${Date.now().toString().slice(-6)}`,
        bomId,
        quantity: Number(quantity),
        plannedDate,
        notes
      });
      toast.success('İş emri oluşturuldu');
      setShowModal(false);
      fetchOrders();
      setCode(''); setBomId(''); setQuantity('1'); setPlannedDate(''); setNotes('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/mrp/work-orders/${id}/status`, { status });
      toast.success('Durum güncellendi');
      fetchOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Güncelleme başarısız');
    }
  };

  const filteredOrders = orders.filter(o => 
    o.code.toLowerCase().includes(search.toLowerCase()) || 
    o.bom?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <ModuleGuide
        moduleKey="mrp_work_orders"
        title="İş Emirleri Yönetimi"
        description="Oluşturduğunuz reçeteler (BOM) üzerinden üretime başlama talimatlarını buradan verirsiniz. Üretimi başlattığınızda sistem otomatik olarak kullanılacak hammaddeleri hesaplar."
        features={[
          "Mevcut reçetelerden iş emri oluşturma",
          "İş emri durum takibi (Bekliyor, Üretimde, Tamamlandı)",
          "Planlanan tarih ve hedef miktar belirleme",
          "Tahmini hammadde tüketimi önizleme"
        ]}
      />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">İş Emirleri</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni İş Emri</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="İş emri ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Yükleniyor...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-500 flex flex-col items-center">
            <Hammer className="w-12 h-12 text-gray-300 mb-3" />
            <p>İş emri bulunamadı.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Kod</th>
                  <th className="py-3 px-4">Reçete (BOM)</th>
                  <th className="py-3 px-4">Üretilecek Miktar</th>
                  <th className="py-3 px-4">Planlanan Tarih</th>
                  <th className="py-3 px-4">Durum</th>
                  <th className="py-3 px-4 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((wo) => (
                  <React.Fragment key={wo.id}>
                  <tr className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setExpandedId(expandedId === wo.id ? null : wo.id)}>
                    <td className="py-3 px-4 font-medium text-gray-900 flex items-center gap-2">
                      <ChevronRight className={`w-4 h-4 transition-transform ${expandedId === wo.id ? 'rotate-90' : ''}`} />
                      {wo.code}
                    </td>
                    <td className="py-3 px-4">{wo.bom?.name}</td>
                    <td className="py-3 px-4">{wo.quantity}</td>
                    <td className="py-3 px-4">{wo.plannedDate ? new Date(wo.plannedDate).toLocaleDateString() : '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        wo.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        wo.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {wo.status === 'COMPLETED' ? 'Tamamlandı' : wo.status === 'IN_PROGRESS' ? 'Üretimde' : 'Planlandı'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {wo.status !== 'COMPLETED' && (
                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {wo.status === 'PLANNED' && (
                            <button onClick={() => updateStatus(wo.id, 'IN_PROGRESS')} className="text-blue-600 hover:underline">
                              Başlat
                            </button>
                          )}
                          {(wo.status === 'PLANNED' || wo.status === 'IN_PROGRESS') && (
                            <button onClick={() => updateStatus(wo.id, 'COMPLETED')} className="text-green-600 hover:underline">
                              Tamamla
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                  {expandedId === wo.id && (
                    <tr className="bg-indigo-50/50">
                      <td colSpan={6} className="p-4">
                        <div className="bg-white rounded-lg border border-indigo-100 p-4">
                          <h4 className="font-semibold text-sm mb-3">Tüketilecek Malzemeler Listesi</h4>
                          <table className="w-full text-sm">
                            <thead className="text-gray-500 border-b border-gray-100">
                              <tr>
                                <th className="text-left pb-2 font-medium">Malzeme</th>
                                <th className="text-right pb-2 font-medium">Gereken Miktar</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {wo.items?.filter((i: any) => i.type === 'MATERIAL').map((item: any, idx: number) => (
                                <tr key={idx}>
                                  <td className="py-2 text-gray-700">{item.product?.name || 'Bilinmeyen Malzeme'}</td>
                                  <td className="py-2 text-right font-medium text-gray-900">{item.quantity} {item.product?.unit || 'ADET'}</td>
                                </tr>
                              ))}
                              {(!wo.items || wo.items.length === 0) && (
                                <tr>
                                  <td colSpan={2} className="py-3 text-center text-gray-500">Malzeme listesi bulunamadı</td>
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-semibold text-lg">Yeni İş Emri</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-4 space-y-4">
              <FormField label="İş Emri Kodu" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Oto oluşturulur" />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reçete (BOM) *</label>
                <select 
                  className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  value={bomId}
                  onChange={(e) => setBomId(e.target.value)}
                  required
                >
                  <option value="">Seçiniz...</option>
                  {boms.map(b => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Miktar" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="1" required />
                <FormField label="Planlanan Tarih" type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} />
              </div>

              {bomId && (
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Tüketilecek Malzemeler</h4>
                  <ul className="space-y-1">
                    {boms.find(b => b.id === bomId)?.items?.map((item: any, idx: number) => {
                      const qty = Number(quantity) || 1;
                      const ratio = qty / (boms.find(b => b.id === bomId)?.quantity || 1);
                      return (
                        <li key={idx} className="text-sm flex justify-between text-gray-600">
                          <span>{item.product?.name || 'Malzeme'}</span>
                          <span className="font-medium text-gray-900">{(item.quantity * ratio).toFixed(2)} {item.product?.unit || 'ADET'}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <FormField label="Notlar" value={notes} onChange={(e) => setNotes(e.target.value)} />
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
