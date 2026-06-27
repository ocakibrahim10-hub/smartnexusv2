'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart2, 
  FileText, 
  X, 
  Search, 
  HelpCircle, 
  MoreHorizontal,
  LogOut,
  RefreshCcw,
  Check
} from 'lucide-react';
import { toast } from '@/lib/toast';

interface Product {
  id: string;
  name: string;
  code: string;
  salePrice: number;
  vatRate: number;
  unit: string;
  stock: number;
}

interface CartItem extends Product {
  cartId: string;
  quantity: number;
  discountPct: number;
}

interface TerminalUIProps {
  onLogout: () => void;
}

export function TerminalUI({ onLogout }: TerminalUIProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcode, setBarcode] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [description, setDescription] = useState('');
  
  // Hızlı Tuşlar (Örnek Veriler)
  const categories = ['HIŞIR POŞET', 'KÖPÜK TABAK', 'KASE SIZDIRMAZ', 'AYPE TORBA', 'POŞET BEYAZ'];
  const [activeCategory, setActiveCategory] = useState(categories[0]);
  
  const quickItems = [
    { id: '1', code: 'HSR-01', name: 'HIŞIR P. ŞEFFAF MİNİ BOY(1KG/400 ADET)', salePrice: 45.0, vatRate: 20, unit: 'KG', stock: 150 },
    { id: '2', code: 'HSR-02', name: 'HIŞIR P. ŞEFFAF KÜÇÜK BOY(1KG/220ADET)', salePrice: 45.0, vatRate: 20, unit: 'KG', stock: 120 },
    { id: '3', code: 'HSR-03', name: 'HIŞIR P. ŞEFFAF ORTA BOY(1KG/150ADET)', salePrice: 45.0, vatRate: 20, unit: 'KG', stock: 133 },
    { id: '4', code: 'HSR-04', name: 'HIŞIR P. ŞEFFAF BÜYÜK BOY(1KG/100ADET)', salePrice: 45.0, vatRate: 20, unit: 'KG', stock: 80 },
    { id: '5', code: 'HSR-05', name: 'HIŞIR P. ŞEFFAF BATTAL BOY(1KG/60ADET)', salePrice: 45.0, vatRate: 20, unit: 'KG', stock: 65 },
    { id: '6', code: 'HSR-06', name: 'HIŞIR P. ŞEFFAF JUMBO BOY(1KG/30ADET)', salePrice: 45.0, vatRate: 20, unit: 'KG', stock: 40 },
    { id: '7', code: 'HSR-07', name: 'HIŞIR P. SİYAH MİNİ BOY(1KG/400ADET)', salePrice: 40.0, vatRate: 20, unit: 'KG', stock: 200 },
    { id: '8', code: 'HSR-08', name: 'HIŞIR P. SİYAH KÜÇÜK BOY(1KG/220ADET)', salePrice: 40.0, vatRate: 20, unit: 'KG', stock: 150 },
  ];

  const addToCart = (product: Product) => {
    const qty = parseFloat(quantity) || 1;
    setCart((prev) => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + qty } : item);
      }
      return [{ ...product, cartId: Math.random().toString(), quantity: qty, discountPct: 0 }, ...prev];
    });
    setQuantity('1');
    setBarcode('');
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode) return;
    toast.error('Barkod bulunamadı (Demo)');
    setBarcode('');
  };

  const removeRow = (cartId: string) => {
    setCart(cart.filter(c => c.cartId !== cartId));
  };

  const calcTotals = () => {
    let total = 0;
    let vatTotal = 0;
    cart.forEach(item => {
      const lineTotal = item.quantity * item.salePrice;
      const lineVat = lineTotal * (item.vatRate / 100);
      total += lineTotal;
      vatTotal += lineVat;
    });
    return { subtotal: total, vat: vatTotal, grandTotal: total + vatTotal };
  };

  const totals = calcTotals();

  const completeSale = (type: string) => {
    if (cart.length === 0) {
      toast.error('Sepet boş');
      return;
    }
    toast.success(`${type} işlemi başarıyla kaydedildi!`);
    setCart([]);
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#F0F4F8] font-sans overflow-hidden text-sm">
      {/* Top Toolbar */}
      <div className="bg-[#E4ECF4] border-b border-gray-300 px-2 py-1 flex items-center gap-1 shadow-sm h-14">
        <button className="flex flex-col items-center justify-center p-1 w-16 hover:bg-white/50 rounded text-xs text-gray-700">
          <BarChart2 className="w-5 h-5 text-blue-600 mb-1" />
          <span>Satış</span>
        </button>
        <button className="flex flex-col items-center justify-center p-1 w-16 hover:bg-white/50 rounded text-xs text-gray-700">
          <FileText className="w-5 h-5 text-orange-500 mb-1" />
          <span>Faturalar</span>
        </button>
        <div className="w-px h-8 bg-gray-300 mx-1"></div>
        <button onClick={onLogout} className="flex flex-col items-center justify-center p-1 w-16 hover:bg-red-50 rounded text-xs text-gray-700">
          <X className="w-5 h-5 text-red-600 mb-1" />
          <span>Kapat</span>
        </button>
      </div>

      {/* Tabs Row */}
      <div className="bg-white border-b border-gray-300 flex items-end px-2 pt-1 h-8">
        <div className="bg-[#F0F4F8] border border-b-0 border-gray-300 rounded-t px-3 py-1 flex items-center gap-2 text-xs font-semibold text-gray-700 shadow-[0_-2px_4px_rgba(0,0,0,0.02)]">
          Satış <X className="w-3 h-3 hover:text-red-500 cursor-pointer" />
        </div>
      </div>

      {/* Main Content Split */}
      <div className="flex-1 flex overflow-hidden p-1 gap-1">
        
        {/* LEFT PANEL: Sales Form */}
        <div className="flex-[0.6] flex flex-col gap-1 border border-blue-200 bg-white rounded shadow-sm overflow-hidden">
          {/* Header of Left Panel */}
          <div className="bg-[#E8F0F8] border-b border-blue-200 px-2 py-1 text-xs font-bold text-blue-900">
            Liste
          </div>
          
          <div className="p-2 flex flex-col gap-2 flex-1">
            {/* Top controls */}
            <div className="flex items-center gap-2">
              <button className="bg-gray-100 hover:bg-gray-200 border border-gray-300 px-4 py-1 text-xs rounded">Askıya Al</button>
              <button className="bg-gray-100 hover:bg-gray-200 border border-gray-300 px-4 py-1 text-xs rounded">Askıdakiler</button>
              <div className="flex-1"></div>
              <label className="text-xs text-gray-600 whitespace-nowrap">Açıklama</label>
              <input 
                type="text" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="border border-gray-300 px-2 py-1 text-xs w-48 focus:border-blue-500 outline-none rounded-sm" 
              />
            </div>
            
            <div className="flex items-center gap-2 mt-1">
              <label className="text-xs text-gray-600 w-12">Cari</label>
              <select className="flex-1 border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 outline-none rounded-sm">
                <option>PERAKENDE SATIŞLAR</option>
              </select>
              <button className="bg-gray-100 border border-gray-300 px-2 py-1 rounded-sm">
                <MoreHorizontal className="w-3 h-3" />
              </button>
              <button className="bg-gray-100 border border-gray-300 px-2 py-1 rounded-sm">
                <HelpCircle className="w-3 h-3" />
              </button>
              <label className="text-xs text-gray-600 ml-2">Ödeme</label>
              <select className="w-24 border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 outline-none rounded-sm">
                <option>PEŞİN</option>
                <option>K. KARTI</option>
              </select>
            </div>

            <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-2 mt-1">
              <label className="text-xs text-gray-600 w-12">Miktar</label>
              <input 
                type="number" 
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-16 border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 outline-none rounded-sm" 
              />
              <label className="text-xs text-gray-600 ml-2">Barkod</label>
              <div className="flex-1 flex">
                <input 
                  type="text" 
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 outline-none rounded-l-sm" 
                  autoFocus
                />
                <button type="button" className="bg-gray-100 border border-l-0 border-gray-300 px-2 py-1 rounded-r-sm">
                  <MoreHorizontal className="w-3 h-3" />
                </button>
              </div>
              <button type="button" onClick={() => {setBarcode(''); setQuantity('1')}} className="bg-gray-100 hover:bg-gray-200 border border-gray-300 px-4 py-1 text-xs rounded-sm">Temizle</button>
            </form>

            <div className="flex items-center gap-2 mt-1 mb-2">
              <label className="text-xs text-gray-600 w-12">Malz</label>
              <div className="flex-1 border border-gray-300 px-2 py-1 text-xs bg-gray-50 text-gray-500 rounded-sm truncate">
                {cart.length > 0 ? cart[0].name : '...'}
              </div>
              <label className="text-xs text-gray-600 ml-2">Stok</label>
              <div className="w-24 border border-gray-300 px-2 py-1 text-xs bg-gray-50 text-right rounded-sm">
                {cart.length > 0 ? cart[0].stock : ''}
              </div>
              <button className="bg-gray-100 border border-gray-300 px-2 py-1 rounded-sm">
                <MoreHorizontal className="w-3 h-3" />
              </button>
            </div>

            {/* Main Table */}
            <div className="flex-1 border border-gray-400 bg-gray-50 flex flex-col rounded-sm overflow-hidden min-h-[200px]">
              <table className="w-full text-left text-[11px] whitespace-nowrap">
                <thead className="bg-[#E4ECF4] border-b border-gray-400 sticky top-0">
                  <tr>
                    <th className="px-2 py-1 border-r border-gray-300 font-normal w-6"></th>
                    <th className="px-2 py-1 border-r border-gray-300 font-normal">Stok Kodu</th>
                    <th className="px-2 py-1 border-r border-gray-300 font-normal w-full">Açıklama</th>
                    <th className="px-2 py-1 border-r border-gray-300 font-normal text-right">Miktar</th>
                    <th className="px-2 py-1 border-r border-gray-300 font-normal">Birim</th>
                    <th className="px-2 py-1 border-r border-gray-300 font-normal text-right">Fiyat</th>
                    <th className="px-2 py-1 border-r border-gray-300 font-normal text-right">Tutar</th>
                    <th className="px-2 py-1 border-gray-300 font-normal text-right">Kdv</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, idx) => (
                    <tr key={item.cartId} className="border-b border-gray-200 bg-white hover:bg-blue-50 group">
                      <td className="px-2 py-1 border-r border-gray-300">
                        <button onClick={() => removeRow(item.cartId)} className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100"><X className="w-3 h-3"/></button>
                      </td>
                      <td className="px-2 py-1 border-r border-gray-300">{item.code}</td>
                      <td className="px-2 py-1 border-r border-gray-300 truncate max-w-[200px]">{item.name}</td>
                      <td className="px-2 py-1 border-r border-gray-300 text-right">{item.quantity}</td>
                      <td className="px-2 py-1 border-r border-gray-300">{item.unit}</td>
                      <td className="px-2 py-1 border-r border-gray-300 text-right">{item.salePrice.toFixed(2)}</td>
                      <td className="px-2 py-1 border-r border-gray-300 text-right">{(item.salePrice * item.quantity).toFixed(2)}</td>
                      <td className="px-2 py-1 text-right">{item.vatRate}</td>
                    </tr>
                  ))}
                  {cart.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-4 text-center text-gray-400">Sepet boş. Hızlı tuşlardan ürün ekleyin veya barkod okutun.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Summary Area */}
            <div className="mt-2 flex gap-4 h-24">
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600 w-16">İndirim %</label>
                  <input type="number" defaultValue="0" className="w-16 border border-gray-300 px-2 py-1 text-xs text-right rounded-sm" />
                  <label className="text-xs text-gray-600 ml-2">Satış Elemanı</label>
                  <select className="flex-1 border border-gray-300 px-2 py-1 text-xs rounded-sm">
                    <option>Term1</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600 w-16">İndirim TL</label>
                  <input type="number" defaultValue="0" className="w-16 border border-gray-300 px-2 py-1 text-xs text-right rounded-sm" />
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2 mt-auto">
                  <button onClick={() => completeSale('Perakende Fatura')} className="flex-1 bg-gray-100 hover:bg-gray-200 border border-gray-300 font-bold py-2 text-xs rounded-sm shadow-sm transition-colors active:bg-gray-300">Perakende Fatura</button>
                  <button onClick={() => completeSale('Toptan Fatura')} className="flex-1 bg-gray-100 hover:bg-gray-200 border border-gray-300 font-bold py-2 text-xs rounded-sm shadow-sm transition-colors active:bg-gray-300">Toptan Fatura</button>
                  <button onClick={() => completeSale('İrsaliye')} className="flex-1 bg-gray-100 hover:bg-gray-200 border border-gray-300 font-bold py-2 text-xs rounded-sm shadow-sm transition-colors active:bg-gray-300">İrsaliye</button>
                </div>
              </div>

              {/* Totals Box */}
              <div className="w-48 flex flex-col items-end justify-between">
                <div className="w-full">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-gray-700">Toplam</span>
                    <span className="font-bold">{totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-gray-700">Kdv</span>
                    <span className="font-bold">{totals.vat.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-end w-full">
                  <span className="text-xs font-bold text-gray-700 mb-1">G.Toplam</span>
                  <span className="text-4xl font-bold text-red-600 tracking-tighter">{totals.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
          </div>
        </div>

        {/* RIGHT PANEL: Quick Keys */}
        <div className="flex-[0.4] flex flex-col gap-1 border border-blue-200 bg-white rounded shadow-sm overflow-hidden">
          <div className="bg-[#E8F0F8] border-b border-blue-200 px-2 py-1 text-xs font-bold text-blue-900">
            Hızlı Tuşlar
          </div>
          
          <div className="flex flex-col h-full p-2 gap-2">
            
            {/* Categories Grid (Top half) */}
            <div className="grid grid-cols-4 gap-1 h-32">
              {categories.map((cat, i) => (
                <button 
                  key={cat} 
                  onClick={() => setActiveCategory(cat)}
                  className={`border p-1 text-[10px] font-bold text-center leading-tight transition-colors break-words rounded-sm
                    ${activeCategory === cat ? 'bg-blue-100 border-blue-400 text-blue-900 shadow-inner' : 'bg-[#F4F6F9] hover:bg-gray-200 border-gray-300 text-gray-700 shadow-sm'}
                  `}
                >
                  {cat}
                </button>
              ))}
              {/* Fill empty spots */}
              {Array.from({ length: 12 - categories.length }).map((_, i) => (
                <button key={`empty-c-${i}`} className="border border-gray-200 bg-gray-50/50 rounded-sm" disabled></button>
              ))}
            </div>

            <div className="h-px bg-gray-300 w-full my-1"></div>

            {/* Items Grid (Bottom half) */}
            <div className="flex-1 grid grid-cols-4 gap-1 auto-rows-fr">
              {quickItems.map((item) => (
                <button 
                  key={item.id} 
                  onClick={() => addToCart(item)}
                  className="bg-[#F4F6F9] hover:bg-blue-50 active:bg-blue-100 border border-gray-300 p-1 text-[9px] font-medium text-center flex flex-col items-center justify-center leading-tight shadow-sm rounded-sm transition-colors"
                >
                  <span className="break-words line-clamp-3">{item.name}</span>
                </button>
              ))}
              {/* Fill empty spots */}
              {Array.from({ length: 24 - quickItems.length }).map((_, i) => (
                <button key={`empty-i-${i}`} className="border border-gray-200 bg-gray-50/50 rounded-sm" disabled></button>
              ))}
            </div>

          </div>
        </div>

      </div>
      
      {/* Footer Status Bar */}
      <div className="bg-[#E4ECF4] border-t border-gray-300 px-4 py-0.5 flex items-center justify-between text-[10px] text-gray-600 h-5">
        <div className="flex gap-4">
          <span>Online</span>
          <span className="font-bold">LOGO</span>
        </div>
        <div>
          {new Date().toLocaleDateString('tr-TR')} {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
