'use client';

import { toast } from '@/lib/toast';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { MapPin, Plus, Warehouse, Layers, Grid3x3, ChevronDown } from 'lucide-react';

export default function WmsLocationsPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [form, setForm] = useState({ code: '', label: '', type: 'SHELF', aisle: '', rack: '', level: '' });
  const [bulkForm, setBulkForm] = useState({ aisles: 3, racks: 5, levels: 3 });

  useEffect(() => {
    api.get('/inventory/warehouses').then(res => {
      const whs = res.data || [];
      setWarehouses(whs);
      const def = whs.find((w: any) => w.isDefault);
      if (def) setSelectedWarehouse(def.id);
      else if (whs.length > 0) setSelectedWarehouse(whs[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedWarehouse) return;
    setIsLoading(true);
    api.get(`/wms/locations?warehouseId=${selectedWarehouse}`).then(res => {
      setLocations(res.data || []);
    }).catch(() => setLocations([]))
      .finally(() => setIsLoading(false));
  }, [selectedWarehouse]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/wms/locations', { ...form, warehouseId: selectedWarehouse });
      toast.success('Lokasyon eklendi');
      setShowAdd(false);
      setForm({ code: '', label: '', type: 'SHELF', aisle: '', rack: '', level: '' });
      // Reload
      const res = await api.get(`/wms/locations?warehouseId=${selectedWarehouse}`);
      setLocations(res.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Eklenemedi');
    }
  };

  const handleBulkCreate = async () => {
    try {
      const res = await api.post('/wms/locations/bulk', { ...bulkForm, warehouseId: selectedWarehouse });
      toast.success(res.data.message);
      setShowBulk(false);
      const locs = await api.get(`/wms/locations?warehouseId=${selectedWarehouse}`);
      setLocations(locs.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Toplu oluşturma başarısız');
    }
  };

  const groupedByAisle = locations.reduce((acc: any, loc: any) => {
    const aisle = loc.aisle || 'Diğer';
    if (!acc[aisle]) acc[aisle] = [];
    acc[aisle].push(loc);
    return acc;
  }, {});

  const typeColors: Record<string, string> = {
    SHELF: 'bg-blue-50 text-blue-700 border-blue-100',
    BIN: 'bg-amber-50 text-amber-700 border-amber-100',
    FLOOR: 'bg-gray-50 text-gray-700 border-gray-100',
    PALLET: 'bg-purple-50 text-purple-700 border-purple-100',
    COLD: 'bg-cyan-50 text-cyan-700 border-cyan-100',
  };

  return (
    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-brand-600" />
            Depo Lokasyonları
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-1">Raf, bölme ve konum tanımları</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowBulk(true)} className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200">
            <Grid3x3 className="w-4 h-4" /> Toplu Oluştur
          </button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-700">
            <Plus className="w-4 h-4" /> Yeni Lokasyon
          </button>
        </div>
      </div>

      {/* Depo Seçimi */}
      <select title="Seçim" aria-label="Seçim"
        value={selectedWarehouse}
        onChange={e => setSelectedWarehouse(e.target.value)}
        className="w-full sm:w-64 text-sm border-gray-200 rounded-xl p-2.5 bg-gray-50 focus:ring-brand-500 font-bold"
      >
        {warehouses.map(w => (
          <option key={w.id} value={w.id}>{w.name}</option>
        ))}
      </select>

      {/* Lokasyon Haritası */}
      {isLoading ? (
        <div className="text-center text-gray-500 text-sm py-12">Yükleniyor...</div>
      ) : locations.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Warehouse className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">Bu depoda henüz lokasyon tanımlanmamış.</p>
          <p className="text-xs text-gray-400 mt-1">&quot;Toplu Oluştur&quot; ile hızlıca raf yapısı oluşturabilirsiniz.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByAisle).map(([aisle, locs]: [string, any]) => (
            <div key={aisle} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-50 flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-600" />
                <span className="text-sm font-black text-gray-900">Koridor {aisle}</span>
                <span className="text-[10px] bg-brand-50 text-brand-600 font-bold px-2 py-0.5 rounded-full ml-auto">{locs.length} konum</span>
              </div>
              <div className="p-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {locs.map((loc: any) => (
                  <div key={loc.id} className={`p-2.5 rounded-xl border text-center text-[10px] font-bold uppercase ${typeColors[loc.type] || typeColors.SHELF}`}>
                    <div className="text-xs font-black">{loc.code}</div>
                    <div className="mt-0.5 opacity-75">{loc._count?.stockItems || 0} ürün</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tekil Ekleme Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
            <h3 className="text-lg font-black text-gray-900 mb-4">Yeni Lokasyon</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Kod *</label>
                  <input required type="text" value={form.code} onChange={e => setForm({...form, code: e.target.value})} className="w-full text-sm border-gray-200 rounded-xl p-2.5 bg-gray-50" placeholder="A-01-03" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Tür</label>
                  <select title="Seçim" aria-label="Seçim" value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full text-sm border-gray-200 rounded-xl p-2.5 bg-gray-50 font-bold">
                    <option value="SHELF">Raf</option>
                    <option value="BIN">Kutu/Bölme</option>
                    <option value="FLOOR">Zemin</option>
                    <option value="PALLET">Palet</option>
                    <option value="COLD">Soğuk Depo</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Açıklama</label>
                <input type="text" value={form.label} onChange={e => setForm({...form, label: e.target.value})} className="w-full text-sm border-gray-200 rounded-xl p-2.5 bg-gray-50" placeholder="A Koridoru Raf 1 Bölme 3" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Koridor</label>
                  <input type="text" value={form.aisle} onChange={e => setForm({...form, aisle: e.target.value})} className="w-full text-sm border-gray-200 rounded-xl p-2.5 bg-gray-50" placeholder="A" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Raf</label>
                  <input type="text" value={form.rack} onChange={e => setForm({...form, rack: e.target.value})} className="w-full text-sm border-gray-200 rounded-xl p-2.5 bg-gray-50" placeholder="01" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Bölme</label>
                  <input type="text" value={form.level} onChange={e => setForm({...form, level: e.target.value})} className="w-full text-sm border-gray-200 rounded-xl p-2.5 bg-gray-50" placeholder="03" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm font-bold text-gray-600">İptal</button>
                <button type="submit" className="px-6 py-2 bg-brand-600 text-white rounded-xl text-sm font-bold">Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toplu Oluşturma Modal */}
      {showBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
            <h3 className="text-lg font-black text-gray-900 mb-2">Toplu Lokasyon Oluştur</h3>
            <p className="text-xs text-gray-500 mb-4">Otomatik olarak koridor-raf-bölme yapısında lokasyonlar oluşturulur. Örn: A-01-01, A-01-02, B-03-02...</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Koridor Sayısı (A, B, C...)</label>
                <input title="Veri Girişi" aria-label="Veri Girişi" placeholder="Değer" type="number" min={1} max={26} value={bulkForm.aisles} onChange={e => setBulkForm({...bulkForm, aisles: Number(e.target.value)})} className="w-full text-sm border-gray-200 rounded-xl p-2.5 bg-gray-50" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Her Koridordaki Raf Sayısı</label>
                <input title="Veri Girişi" aria-label="Veri Girişi" placeholder="Değer" type="number" min={1} max={50} value={bulkForm.racks} onChange={e => setBulkForm({...bulkForm, racks: Number(e.target.value)})} className="w-full text-sm border-gray-200 rounded-xl p-2.5 bg-gray-50" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Her Raftaki Bölme/Kat</label>
                <input title="Veri Girişi" aria-label="Veri Girişi" placeholder="Değer" type="number" min={1} max={10} value={bulkForm.levels} onChange={e => setBulkForm({...bulkForm, levels: Number(e.target.value)})} className="w-full text-sm border-gray-200 rounded-xl p-2.5 bg-gray-50" />
              </div>
              <div className="bg-brand-50 rounded-xl p-3 text-center">
                <p className="text-xs font-bold text-brand-700">Toplam {bulkForm.aisles * bulkForm.racks * bulkForm.levels} lokasyon oluşturulacak</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={() => setShowBulk(false)} className="px-4 py-2 text-sm font-bold text-gray-600">İptal</button>
              <button type="button" onClick={handleBulkCreate} className="px-6 py-2 bg-brand-600 text-white rounded-xl text-sm font-bold">Oluştur</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
