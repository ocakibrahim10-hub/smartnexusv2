'use client';

import { toast } from '@/lib/toast';
import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import {
  ScanLine, Package, MapPin, ArrowDownToLine, ArrowUpFromLine,
  RotateCcw, CheckCircle2, Warehouse, Search, Camera, X, Plus, Minus
} from 'lucide-react';

type ScanResult = {
  type: 'PRODUCT' | 'LOCATION';
  product?: any;
  location?: any;
};

export default function WmsScannerPage() {
  const [barcode, setBarcode] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [mode, setMode] = useState<'RECEIVE' | 'DISPATCH' | 'COUNT'>('RECEIVE');
  const [quantity, setQuantity] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get('/inventory/warehouses').then(res => {
      const whs = res.data || [];
      setWarehouses(whs);
      const def = whs.find((w: any) => w.isDefault);
      if (def) setSelectedWarehouse(def.id);
      else if (whs.length > 0) setSelectedWarehouse(whs[0].id);
    }).catch(() => {});
  }, []);

  const handleScan = async () => {
    if (!barcode.trim()) return;
    try {
      const res = await api.get(`/wms/scan/${encodeURIComponent(barcode.trim())}`);
      setScanResult(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Barkod bulunamadı');
      setScanResult(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScan();
    }
  };

  const handleAction = async () => {
    if (!scanResult?.product || !selectedWarehouse) return;
    setIsProcessing(true);
    try {
      const payload = {
        barcode: scanResult.product.barcode || scanResult.product.code,
        warehouseId: selectedWarehouse,
        quantity,
      };

      let res;
      if (mode === 'RECEIVE') {
        res = await api.post('/wms/receive', payload);
      } else if (mode === 'DISPATCH') {
        res = await api.post('/wms/dispatch', payload);
      } else {
        res = await api.post('/wms/quick-count', {
          warehouseId: selectedWarehouse,
          items: [{ barcode: payload.barcode, countedQty: quantity }],
        });
      }
      toast.success(res.data.message || 'İşlem başarılı');
      setHistory(prev => [{
        time: new Date().toLocaleTimeString('tr-TR'),
        product: scanResult.product.name,
        mode,
        qty: quantity,
      }, ...prev.slice(0, 19)]);

      setBarcode('');
      setScanResult(null);
      setQuantity(1);
      inputRef.current?.focus();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'İşlem başarısız');
    } finally {
      setIsProcessing(false);
    }
  };

  const modeConfig = {
    RECEIVE: { label: 'Mal Kabul', color: 'emerald', icon: ArrowDownToLine },
    DISPATCH: { label: 'Sevkiyat / Çıkış', color: 'red', icon: ArrowUpFromLine },
    COUNT: { label: 'Hızlı Sayım', color: 'blue', icon: RotateCcw },
  };
  const current = modeConfig[mode];

  return (
    <div className="p-3 lg:p-6 max-w-3xl mx-auto space-y-4">
      {/* Başlık */}
      <div className="text-center">
        <h1 className="text-lg font-black text-gray-900 flex items-center justify-center gap-2">
          <ScanLine className="w-5 h-5 text-brand-600" />
          Mobil Barkod Tarayıcı
        </h1>
        <p className="text-[10px] text-gray-500 font-medium">Barkod okutarak hızlı stok işlemi yapın</p>
      </div>

      {/* Mod Seçimi */}
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(modeConfig) as Array<keyof typeof modeConfig>).map(m => {
          const cfg = modeConfig[m];
          const Icon = cfg.icon;
          const isActive = mode === m;
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-bold transition-all ${
                isActive
                  ? `border-${cfg.color}-500 bg-${cfg.color}-50 text-${cfg.color}-700 shadow-sm`
                  : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'
              }`}
              style={isActive ? {
                borderColor: cfg.color === 'emerald' ? '#10b981' : cfg.color === 'red' ? '#ef4444' : '#3b82f6',
                backgroundColor: cfg.color === 'emerald' ? '#ecfdf5' : cfg.color === 'red' ? '#fef2f2' : '#eff6ff',
                color: cfg.color === 'emerald' ? '#047857' : cfg.color === 'red' ? '#b91c1c' : '#1d4ed8',
              } : {}}
            >
              <Icon className="w-5 h-5" />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Depo Seçimi */}
      <select title="Seçim" aria-label="Seçim"
        value={selectedWarehouse}
        onChange={e => setSelectedWarehouse(e.target.value)}
        className="w-full text-sm border-gray-200 rounded-xl p-2.5 bg-gray-50 focus:ring-brand-500 font-bold"
      >
        <option value="">Depo Seçin</option>
        {warehouses.map(w => (
          <option key={w.id} value={w.id}>{w.name} {w.isDefault ? '(Varsayılan)' : ''}</option>
        ))}
      </select>

      {/* Barkod Giriş */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={barcode}
          onChange={e => setBarcode(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Barkod okutun veya yazın..."
          className="w-full text-lg font-mono border-2 border-brand-200 rounded-2xl p-4 pr-24 bg-brand-50/30 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 text-center tracking-widest"
          autoFocus
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
          {barcode && (
            <button title="İşlem" aria-label="İşlem" onClick={() => { setBarcode(''); setScanResult(null); }} className="p-2 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          )}
          <button title="İşlem" aria-label="İşlem"
            onClick={handleScan}
            className="p-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tarama Sonucu */}
      {scanResult?.type === 'PRODUCT' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-50 flex items-center gap-3">
            <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-black text-gray-900 truncate">{scanResult.product.name}</h3>
              <div className="flex items-center gap-3 text-[10px] text-gray-500 font-bold uppercase mt-0.5">
                <span>Kod: {scanResult.product.code}</span>
                <span>Birim: {scanResult.product.unit}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-black text-brand-600">{scanResult.product.totalStock}</div>
              <div className="text-[10px] text-gray-500 font-bold">{scanResult.product.unit} toplam</div>
            </div>
          </div>

          {/* Stok Dağılımı */}
          {scanResult.product.stock.length > 0 && (
            <div className="px-4 py-2 bg-gray-50/50">
              {scanResult.product.stock.map((s: any, i: number) => (
                <div key={i} className="flex justify-between text-xs text-gray-600 py-1 border-b border-gray-50 last:border-0">
                  <span className="font-medium">{s.warehouseName} {s.locationCode ? `(${s.locationCode})` : ''}</span>
                  <span className="font-bold">{s.quantity} {scanResult.product.unit}</span>
                </div>
              ))}
            </div>
          )}

          {/* Miktar ve İşlem */}
          <div className="p-4 flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-200 px-2">
              <button title="İşlem" aria-label="İşlem" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2 text-gray-500 hover:text-gray-900">
                <Minus className="w-4 h-4" />
              </button>
              <input title="Veri Girişi" aria-label="Veri Girişi" placeholder="Değer"
                type="number"
                value={quantity}
                onChange={e => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-16 text-center text-lg font-black bg-transparent border-0 focus:ring-0 p-0"
                min={1}
              />
              <button title="İşlem" aria-label="İşlem" onClick={() => setQuantity(quantity + 1)} className="p-2 text-gray-500 hover:text-gray-900">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={handleAction}
              disabled={isProcessing || !selectedWarehouse}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black text-white transition-colors disabled:opacity-50"
              style={{
                backgroundColor: mode === 'RECEIVE' ? '#10b981' : mode === 'DISPATCH' ? '#ef4444' : '#3b82f6',
              }}
            >
              {isProcessing ? (
                <span className="animate-pulse">İşleniyor...</span>
              ) : (
                <>
                  <current.icon className="w-5 h-5" />
                  {current.label} Yap
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {scanResult?.type === 'LOCATION' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900">{scanResult.location.code}</h3>
              <p className="text-[10px] text-gray-500">{scanResult.location.label} — {scanResult.location.warehouse.name}</p>
            </div>
          </div>
          {scanResult.location.items.length > 0 ? (
            <div className="space-y-1">
              {scanResult.location.items.map((item: any, i: number) => (
                <div key={i} className="flex justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                  <span className="font-medium text-gray-700">{item.productName}</span>
                  <span className="font-bold text-brand-600">{item.quantity} {item.unit}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-4">Bu lokasyonda ürün bulunmuyor</p>
          )}
        </div>
      )}

      {/* İşlem Geçmişi */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-xs font-black text-gray-700 uppercase mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Son İşlemler
          </h3>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {history.map((h, i) => (
              <div key={i} className="flex items-center justify-between text-[11px] py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-gray-400 font-mono">{h.time}</span>
                <span className="font-medium text-gray-700 flex-1 mx-3 truncate">{h.product}</span>
                <span className={`font-black ${
                  h.mode === 'RECEIVE' ? 'text-emerald-600' : h.mode === 'DISPATCH' ? 'text-red-600' : 'text-blue-600'
                }`}>
                  {h.mode === 'RECEIVE' ? '+' : h.mode === 'DISPATCH' ? '-' : '='}{h.qty}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
