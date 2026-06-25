'use client';

import { toast } from '@/lib/toast';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { ClipboardList, Package, MapPin, User, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export default function WmsPickListPage() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [pickItems, setPickItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());

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
    api.get(`/wms/pick-list/${selectedWarehouse}`).then(res => {
      setPickItems(res.data.items || []);
    }).catch(() => setPickItems([]))
      .finally(() => setIsLoading(false));
  }, [selectedWarehouse]);

  const togglePicked = (idx: number) => {
    const key = String(idx);
    setPicked(prev => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  };

  const totalItems = pickItems.length;
  const pickedCount = picked.size;
  const progress = totalItems > 0 ? Math.round((pickedCount / totalItems) * 100) : 0;

  return (
    <div className="p-4 lg:p-8 max-w-[1200px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-brand-600" />
            Sipariş Toplama (Picking)
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-1">Bekleyen siparişlere göre ürün toplama listesi</p>
        </div>
        <select
          value={selectedWarehouse}
          onChange={e => setSelectedWarehouse(e.target.value)}
          className="w-full sm:w-56 text-sm border-gray-200 rounded-xl p-2.5 bg-gray-50 focus:ring-brand-500 font-bold"
        >
          {warehouses.map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>

      {/* İlerleme */}
      {totalItems > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-gray-700">İlerleme</span>
            <span className="text-xs font-black text-brand-600">{pickedCount}/{totalItems} ({progress}%)</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Liste */}
      {isLoading ? (
        <div className="text-center text-gray-500 text-sm py-12">Yükleniyor...</div>
      ) : pickItems.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">Bekleyen sipariş yok, tüm ürünler toplandı!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pickItems.map((item, idx) => {
            const isPicked = picked.has(String(idx));
            const isLowStock = item.currentStock < item.quantity;
            return (
              <div
                key={idx}
                onClick={() => togglePicked(idx)}
                className={`bg-white rounded-xl border p-3 sm:p-4 flex items-center gap-3 cursor-pointer transition-all ${
                  isPicked
                    ? 'border-emerald-200 bg-emerald-50/50 opacity-60'
                    : isLowStock
                    ? 'border-red-200 bg-red-50/30'
                    : 'border-gray-100 hover:border-brand-200'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isPicked ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                  {isPicked ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Package className="w-4 h-4 text-gray-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-black ${isPicked ? 'line-through text-gray-400' : 'text-gray-900'}`}>{item.productName}</span>
                    {isLowStock && !isPicked && (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-gray-500 font-medium mt-0.5">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{item.customer}</span>
                    <span>{item.invoiceNumber}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-right shrink-0">
                  <div className="hidden sm:flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-lg font-bold">
                    <MapPin className="w-3 h-3" />
                    {item.locationCode}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-brand-600">{item.quantity} {item.unit}</div>
                    <div className="text-[10px] text-gray-400">Stok: {item.currentStock}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
