'use client';

import { toast } from '@/lib/toast';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Search,
  ShoppingCart,
  X,
  Plus,
  Minus,
  Trash2,
  User,
  CreditCard,
  Banknote,
  Clock,
  Check,
  Printer,
  ChevronRight,
  Tag,
  Barcode,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  Wifi,
  WifiOff,
  Package,
  ArrowLeft,
  PauseCircle,
  ListOrdered
} from 'lucide-react';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { ProductImage } from '@/components/ProductImage';
import { FormField, IconButton } from '@/components/FormField';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  code: string;
  barcode?: string;
  imageUrl?: string;
  salePrice: number;
  vatRate: number;
  unit: string;
  stockItems?: { quantity: number }[];
  category?: { name: string };
  saleUnit?: string;
}

interface CartLine {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  stock: number;
}

interface Contact {
  id: string;
  name: string;
  taxNo?: string;
  phone?: string;
  balance?: number;
}

interface HeldCart {
  id: string;
  cart: CartLine[];
  customer: Contact | null;
  extraDiscount: number;
  timestamp: number;
}

type PaymentType = 'CASH' | 'CARD' | 'CREDIT' | 'CHECK' | 'WIRE';

const PAYMENT_LABELS: Record<PaymentType, string> = {
  CASH: 'Nakit',
  CARD: 'Kredi Kartı',
  CREDIT: 'Veresiye',
  CHECK: 'Çek',
  WIRE: 'Havale/EFT',
};

const PAYMENT_ICONS: Record<PaymentType, any> = {
  CASH: Banknote,
  CARD: CreditCard,
  CREDIT: Clock,
  CHECK: Tag,
  WIRE: ChevronRight,
};

// ─── Hesaplama Yardımcısı ─────────────────────────────────────────────────────

function calcLine(line: Omit<CartLine, 'vatAmount' | 'total'>): CartLine {
  const discounted = line.unitPrice * (1 - line.discount / 100);
  const vatAmount = line.quantity * discounted * (line.vatRate / 100);
  const total = line.quantity * discounted + vatAmount;
  return { ...line, vatAmount, total };
}

// ─── POS Page ─────────────────────────────────────────────────────────────────

export default function POSPage() {
  const router = useRouter();
  const params = useParams();
  const panel = params?.panel as string;
  
  // Ürün state
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Sepet
  const [cart, setCart] = useState<CartLine[]>([]);
  const [extraDiscount, setExtraDiscount] = useState(0);

  // Askıdaki Sepetler
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [showHeldCarts, setShowHeldCarts] = useState(false);

  // Müşteri
  const [customer, setCustomer] = useState<Contact | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<Contact[]>([]);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);

  // Ödeme
  const [paymentType, setPaymentType] = useState<PaymentType>('CASH');
  const [cashGiven, setCashGiven] = useState('');
  const [cardRef, setCardRef] = useState('');
  const [checkNo, setCheckNo] = useState('');
  const [checkDueDate, setCheckDueDate] = useState('');
  const [wireRef, setWireRef] = useState('');
  const [printToHugin, setPrintToHugin] = useState(true);

  // İşlem state
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any>(null);
  const [huginStatus, setHuginStatus] = useState<boolean | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // INIT
  useEffect(() => {
    api.get('/pos/categories').then((r) => setCategories(r.data)).catch(() => {});
    loadProducts();
    api.get('/pos/hugin/status').then((r) => setHuginStatus(r.data.connected)).catch(() => setHuginStatus(false));
    
    // Yüklenen askıdaki sepetleri getir
    const stored = localStorage.getItem('smartnexus_pos_held');
    if (stored) {
      try {
        setHeldCarts(JSON.parse(stored));
      } catch(e) {}
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchQ) loadProducts(searchQ);
      else loadProducts('', selectedCategory || undefined);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQ, selectedCategory]);

  const loadProducts = useCallback(async (q?: string, catId?: string) => {
    setLoadingProducts(true);
    try {
      if (q) {
        const r = await api.get('/pos/products', { params: { q } });
        setProducts(r.data);
      } else {
        const r = await api.get('/pos/products/grid', { params: { categoryId: catId } });
        setProducts(r.data);
      }
    } catch {
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  // Global Barkod Dinleyici
  useEffect(() => {
    let barcode = '';
    let timeout: NodeJS.Timeout;

    const handleKeyDown = async (e: KeyboardEvent) => {
      // Eğer bir input içindeysek ve input barkod inputu değilse barkodu yoksay
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        if (target.id !== 'pos-barcode-input') return;
      }

      if (e.key === 'Enter') {
        if (barcode.length > 2) {
          // Barkodu sepete ekleme mantığı
          const found = products.find(p => p.barcode === barcode || p.code === barcode);
          if (found) {
            addToCart(found as any);
            toast.success(`${found.name} eklendi`);
          } else {
            // Eğer ürün mevcut ürün listesinde yoksa API'den ara
            try {
              const r = await api.get('/pos/products', { params: { q: barcode } });
              if (r.data && r.data.length === 1) {
                addToCart(r.data[0]);
                toast.success(`${r.data[0].name} eklendi`);
              } else {
                toast.error('Barkod bulunamadı');
              }
            } catch(e) {
              toast.error('Barkod araması başarısız');
            }
          }
        }
        barcode = '';
        if (target.id === 'pos-barcode-input') setSearchQ(''); // kutuyu temizle
      } else if (e.key.length === 1) {
        barcode += e.key;
        clearTimeout(timeout);
        timeout = setTimeout(() => { barcode = ''; }, 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products]); // products bağımlılığı eklendi ki mevcut listeyi tanısın

  // Askıya Alma Mantığı
  const saveHeldCarts = (newHeld: HeldCart[]) => {
    setHeldCarts(newHeld);
    localStorage.setItem('smartnexus_pos_held', JSON.stringify(newHeld));
  };

  const handleHoldCart = () => {
    if (cart.length === 0) return;
    const newCart: HeldCart = {
      id: Math.random().toString(36).substr(2, 9),
      cart: [...cart],
      customer,
      extraDiscount,
      timestamp: Date.now()
    };
    saveHeldCarts([newCart, ...heldCarts]);
    clearCart();
    toast.success('Satış askıya alındı');
  };

  const handleRestoreCart = (held: HeldCart) => {
    setCart(held.cart);
    setCustomer(held.customer);
    setExtraDiscount(held.extraDiscount);
    saveHeldCarts(heldCarts.filter(h => h.id !== held.id));
    setShowHeldCarts(false);
    toast.success('Satış geri yüklendi');
  };

  const handleDeleteHeldCart = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    saveHeldCarts(heldCarts.filter(h => h.id !== id));
  };

  // Müşteri arama
  useEffect(() => {
    if (customerSearch.length < 2) {
      setCustomerResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const r = await api.get('/contacts/quick-search', { params: { q: customerSearch } });
      setCustomerResults(r.data);
    }, 300);
    return () => clearTimeout(t);
  }, [customerSearch]);

  // Ürün ekle sepete
  const addToCart = (product: Product & { saleStock?: number; saleUnit?: string; baseStock?: number }) => {
    const stock = product.saleStock ?? product.stockItems?.[0]?.quantity ?? 0;
    const saleUnit = product.saleUnit || product.unit || 'ADET';
    
    if (stock <= 0) {
      toast.info('Bu ürünün stoğu yok. Satış yapılamaz.');
      return;
    }
    setCart((prev) => {
      const existing = prev.findIndex((l) => l.productId === product.id);
      const newQty = existing >= 0 ? prev[existing].quantity + 1 : 1;
      if (newQty > stock) {
        toast.info(`Yetersiz stok. Maksimum: ${stock} ${saleUnit}`);
        return prev;
      }
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = calcLine({ ...updated[existing], quantity: newQty });
        return updated;
      }
      return [
        ...prev,
        calcLine({
          productId: product.id,
          name: product.name,
          quantity: 1,
          unitPrice: product.salePrice || 0,
          discount: 0,
          vatRate: product.vatRate || 20,
          stock,
        }),
      ];
    });
  };

  const updateQty = (idx: number, qty: number) => {
    if (qty <= 0) {
      removeFromCart(idx);
      return;
    }
    setCart((prev) => {
      const u = [...prev];
      if (qty > u[idx].stock) {
        toast.info(`Yetersiz stok. Maksimum: ${u[idx].stock}`);
        return prev;
      }
      u[idx] = calcLine({ ...u[idx], quantity: qty });
      return u;
    });
  };

  const updateDiscount = (idx: number, disc: number) => {
    setCart((prev) => {
      const u = [...prev];
      u[idx] = calcLine({ ...u[idx], discount: Math.min(100, Math.max(0, disc)) });
      return u;
    });
  };

  const updatePrice = (idx: number, price: number) => {
    setCart((prev) => {
      const u = [...prev];
      u[idx] = calcLine({ ...u[idx], unitPrice: Math.max(0, price) });
      return u;
    });
  };

  const removeFromCart = (idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  };

  const clearCart = () => {
    setCart([]);
    setCustomer(null);
    setExtraDiscount(0);
    setCashGiven('');
  };

  // Totaller
  const subtotal = cart.reduce((s, l) => s + l.quantity * l.unitPrice * (1 - l.discount / 100), 0);
  const vatTotal = cart.reduce((s, l) => s + l.vatAmount, 0);
  const total = subtotal + vatTotal - extraDiscount;
  const change = paymentType === 'CASH' && parseFloat(cashGiven) > total ? parseFloat(cashGiven) - total : 0;

  // Ödeme tamamla
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setCheckoutLoading(true);
    try {
      const dto = {
        contactId: customer?.id || null,
        lines: cart.map((l) => {
          const prod = products.find((p) => p.id === l.productId);
          return {
            productId: l.productId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discount: l.discount,
            vatRate: l.vatRate,
            saleUnit: (prod as any)?.saleUnit || prod?.unit,
          };
        }),
        paymentType,
        cashGiven: paymentType === 'CASH' ? parseFloat(cashGiven) || total : undefined,
        cardRef: paymentType === 'CARD' ? cardRef : undefined,
        checkNo: paymentType === 'CHECK' ? checkNo : undefined,
        checkDueDate: paymentType === 'CHECK' ? checkDueDate : undefined,
        wireRef: paymentType === 'WIRE' ? wireRef : undefined,
        discount: extraDiscount,
        printToHugin,
      };
      const r = await api.post('/pos/checkout', dto);
      setLastReceipt(r.data.receipt);
      setShowSuccess(true);
      clearCart();
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Satış işlemi başarısız');
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="pos-shell flex flex-col lg:flex-row h-screen overflow-hidden bg-gray-50/50">
      
      {/* ── Askıdaki Sepetler Modalı ─────────────────────────────────────── */}
      {showHeldCarts && (
        <div className="fixed inset-0 z-[100] bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-300">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <PauseCircle className="w-5 h-5 text-brand-500" />
                Askıdaki Satışlar
              </h2>
              <IconButton onClick={() => setShowHeldCarts(false)} className="text-gray-400 hover:text-gray-600 bg-white shadow-sm border border-gray-200">
                <X className="w-4 h-4" />
              </IconButton>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {heldCarts.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <PauseCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Askıda satış bulunmuyor.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {heldCarts.map((h, i) => {
                    const heldTotal = h.cart.reduce((s,l) => s + l.total, 0) - h.extraDiscount;
                    return (
                      <div key={h.id} onClick={() => handleRestoreCart(h)} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-white hover:border-brand-300 hover:shadow-md cursor-pointer transition-all group relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500/0 group-hover:bg-brand-500 transition-colors" />
                        <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-bold shrink-0">
                          {h.cart.length}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 truncate">
                            {h.customer ? h.customer.name : 'Perakende Müşteri'}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {new Date(h.timestamp).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'})} · {h.cart[0]?.name} {h.cart.length > 1 ? `+ ${h.cart.length-1} ürün` : ''}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-bold text-gray-900">₺{heldTotal.toLocaleString('tr-TR', {minimumFractionDigits:2})}</div>
                          <button 
                            onClick={(e) => handleDeleteHeldCart(h.id, e)}
                            className="text-xs text-red-500 hover:text-red-700 mt-1 inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Sil
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Sol: Ürünler & Navigasyon ────────────────────────────────────── */}
      <div className="flex flex-col flex-1 lg:w-[58%] border-b lg:border-b-0 lg:border-r border-gray-200 bg-white min-h-[50vh] lg:min-h-0 relative">
        
        {/* Header / Top Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white shadow-sm z-10">
          <button
            onClick={() => router.push(panel ? `/${panel}/dashboard` : '/')}
            className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 transition-colors"
            title="Yönetim Paneline Dön"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex-1 relative group">
            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
            <FormField
              id="pos-barcode-input"
              label="Ürün adı veya barkod ile ara"
              hideLabel
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Ürün adı veya barkod ile ara (Enter)..."
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-inner"
            />
            {searchQ && (
              <IconButton
                label="Aramayı temizle"
                onClick={() => setSearchQ('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </IconButton>
            )}
          </div>

          {/* Askıya Alınanlar & Hugin */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowHeldCarts(true)}
              className="relative flex items-center gap-2 px-3 py-2.5 bg-orange-50 border border-orange-100 text-orange-600 rounded-xl hover:bg-orange-100 transition-colors text-xs font-semibold"
            >
              <PauseCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Askıdakiler</span>
              {heldCarts.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold ring-2 ring-white">
                  {heldCarts.length}
                </span>
              )}
            </button>
            <div
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2.5 rounded-xl border ${huginStatus ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
              title="Hugin Yazarkasa Bağlantısı"
            >
              {huginStatus ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Hugin S1</span>
            </div>
          </div>
        </div>

        {/* Kategoriler */}
        {categories.length > 0 && (
          <div className="flex gap-2 px-4 py-2.5 overflow-x-auto border-b border-gray-50 bg-gray-50/50 scrollbar-hide">
            <button
              onClick={() => {
                setSelectedCategory(null);
                setSearchQ('');
              }}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${!selectedCategory ? 'bg-brand-500 text-white shadow-brand-500/30' : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-300'}`}
            >
              Tümü
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedCategory(c.id);
                  setSearchQ('');
                }}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${selectedCategory === c.id ? 'bg-brand-500 text-white shadow-brand-500/30' : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-300'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Ürün Grid */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-100/30">
          {loadingProducts ? (
            <div className="flex items-center justify-center h-32 text-brand-500">
              <div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 animate-fade-in-up">
              <Package className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm font-medium">Ürün bulunamadı</p>
              <p className="text-xs mt-1">Arama kriterlerinizi değiştirin.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 pb-20">
              {products.map((p) => {
                const stock = (p as any).saleStock ?? p.stockItems?.[0]?.quantity ?? 0;
                const saleUnit = (p as any).saleUnit || p.unit || 'ADET';
                const hasStock = stock > 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p as any)}
                    disabled={!hasStock}
                    className={`relative bg-white border border-gray-200/60 rounded-2xl p-3 text-left transition-all duration-300 group flex flex-col h-full ${hasStock ? 'hover:border-brand-400 hover:shadow-lg hover:shadow-brand-500/5 active:scale-95' : 'opacity-60 cursor-not-allowed grayscale'}`}
                  >
                    <div className="relative w-full aspect-square mb-3 bg-gray-50 rounded-xl overflow-hidden">
                      <ProductImage
                        src={p.imageUrl}
                        alt={p.name}
                        size="full"
                        rounded="none"
                        className="object-contain w-full h-full p-2 group-hover:scale-105 transition-transform duration-500"
                      />
                      {!hasStock && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
                          <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Tükendi</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 flex flex-col">
                      <div className="text-xs font-bold text-gray-800 line-clamp-2 leading-tight group-hover:text-brand-600 transition-colors">
                        {p.name}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-medium">{p.code}</div>
                    </div>

                    <div className="mt-3 flex items-end justify-between pt-2 border-t border-gray-50">
                      <span className="text-sm font-black text-gray-900 group-hover:text-brand-600 transition-colors">
                        ₺{(p.salePrice || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${hasStock ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                        {hasStock ? `${stock} ${saleUnit}` : '0'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Sağ: Sepet + Ödeme ───────────────────────────────────────────── */}
      <div className="flex flex-col w-full lg:w-[42%] max-w-xl bg-white min-h-[50vh] lg:min-h-0 flex-shrink-0 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)] z-20">
        
        {/* Modern Müşteri (Cari) Seçimi */}
        <div className="px-4 py-4 bg-white border-b border-gray-100 relative z-30">
          {customer ? (
            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-brand-50 to-indigo-50 border border-brand-200/60 rounded-2xl animate-fade-in-up">
              <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-brand-600 font-bold shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-gray-900 truncate">{customer.name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  {customer.taxNo && <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-gray-200 text-gray-500">VN: {customer.taxNo}</span>}
                  {customer.balance !== undefined && customer.balance > 0 && (
                     <span className="text-[10px] font-bold text-red-600 flex items-center gap-0.5 bg-red-50 px-1.5 py-0.5 rounded-md">
                       <AlertCircle className="w-3 h-3" /> Bakiye: ₺{customer.balance.toLocaleString('tr-TR')}
                     </span>
                  )}
                </div>
              </div>
              <IconButton
                label="Müşteriyi kaldır"
                onClick={() => setCustomer(null)}
                className="w-8 h-8 bg-white text-gray-400 hover:text-red-500 rounded-full shadow-sm"
              >
                <X className="w-4 h-4" />
              </IconButton>
            </div>
          ) : (
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-500" />
              <FormField
                label="Cari ara"
                hideLabel
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setShowCustomerSearch(true);
                }}
                onFocus={() => setShowCustomerSearch(true)}
                placeholder="Müşteri (Cari) seçin veya arayın..."
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-brand-500 rounded-2xl text-sm font-medium focus:outline-none transition-all shadow-inner focus:shadow-md"
              />
              {showCustomerSearch && customerResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-100 rounded-2xl shadow-xl mt-2 overflow-hidden max-h-64 overflow-y-auto animate-fade-in-up">
                  {customerResults.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setCustomer(c);
                        setCustomerSearch('');
                        setShowCustomerSearch(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-50 transition-colors border-b border-gray-50 last:border-0 group"
                    >
                      <div className="w-8 h-8 bg-gray-100 group-hover:bg-brand-100 rounded-full flex items-center justify-center text-gray-500 group-hover:text-brand-600 text-xs font-bold shrink-0 transition-colors">
                        {c.name.charAt(0)}
                      </div>
                      <div className="text-left min-w-0 flex-1">
                        <div className="text-sm font-bold text-gray-900 truncate group-hover:text-brand-700 transition-colors">{c.name}</div>
                        <div className="text-[10px] text-gray-500">{c.taxNo || c.phone || 'Detay yok'}</div>
                      </div>
                      {c.balance && c.balance > 0 ? (
                        <div className="text-right shrink-0">
                          <div className="text-[10px] text-gray-400">Mevcut Bakiye</div>
                          <div className="text-xs text-red-600 font-bold">₺{c.balance.toLocaleString('tr-TR')}</div>
                        </div>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sepet Çizgileri */}
        <div className="flex-1 overflow-y-auto bg-white relative">
          {cart.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <ShoppingCart className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-base font-bold text-gray-600">Sepetiniz Boş</p>
              <p className="text-sm mt-1">Barkod okutun veya ürün seçin</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 p-2">
              {cart.map((line, idx) => (
                <div
                  key={line.productId + idx}
                  className="p-3 bg-white hover:bg-gray-50 rounded-xl transition-colors group relative animate-fade-in-up"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-900 truncate pr-8">{line.name}</div>
                      
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {/* Adet Kontrolü */}
                        <div className="flex items-center bg-gray-100 rounded-lg p-0.5 border border-gray-200">
                          <button
                            onClick={() => updateQty(idx, line.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-white rounded-md transition-all shadow-sm"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            value={line.quantity}
                            onChange={(e) => updateQty(idx, parseFloat(e.target.value) || 0)}
                            className="w-10 text-center text-xs font-bold bg-transparent outline-none border-none focus:ring-0 p-0"
                            min="0.001"
                            step="1"
                          />
                          <button
                            onClick={() => updateQty(idx, line.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-white rounded-md transition-all shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Fiyat Edit */}
                        <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                          <span className="text-[10px] text-gray-400 font-bold">₺</span>
                          <input
                            type="number"
                            value={line.unitPrice}
                            onChange={(e) => updatePrice(idx, parseFloat(e.target.value) || 0)}
                            className="w-16 text-xs font-bold text-gray-800 bg-transparent outline-none border-none p-0 focus:ring-0 text-right"
                            step="0.01"
                          />
                        </div>

                        {/* İndirim Edit */}
                        <div className="flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-lg border border-orange-100">
                          <Tag className="w-3 h-3 text-orange-400" />
                          <input
                            type="number"
                            value={line.discount}
                            onChange={(e) => updateDiscount(idx, parseFloat(e.target.value) || 0)}
                            className="w-10 text-xs font-bold text-orange-700 bg-transparent outline-none border-none p-0 focus:ring-0 text-right"
                            min="0"
                            max="100"
                          />
                          <span className="text-[10px] text-orange-500 font-bold">%</span>
                        </div>
                      </div>
                    </div>

                    {/* Tutar & Sil */}
                    <div className="flex flex-col items-end shrink-0 gap-2">
                      <div className="text-right">
                        <div className="text-base font-black text-gray-900">
                          ₺{line.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </div>
                        {line.discount > 0 && (
                          <div className="text-[10px] text-orange-500 font-medium line-through">
                            ₺{((line.quantity * line.unitPrice) * (1 + line.vatRate/100)).toLocaleString('tr-TR', {minimumFractionDigits: 2})}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <button
                        onClick={() => removeFromCart(idx)}
                        className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                        title="Ürünü Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                    </button>

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Ödeme Paneli (Checkout) ──────────────────────────────────────── */}
        <div className="bg-white border-t border-gray-100 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] relative z-40">
          
          {/* Askıya Al Butonu (Sepet Doluysa) */}
          {cart.length > 0 && (
            <div className="absolute -top-5 left-1/2 -translate-x-1/2">
              <button 
                onClick={handleHoldCart}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-900 text-white rounded-full text-xs font-bold shadow-lg hover:-translate-y-1 transition-all"
              >
                <PauseCircle className="w-3.5 h-3.5" /> Satışı Askıya Al
              </button>
            </div>
          )}

          {/* Toplam Detayları */}
          <div className="px-5 py-4 space-y-2 mt-2">
            <div className="flex justify-between text-xs font-medium text-gray-500">
              <span>Ara Toplam</span>
              <span>₺{subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center text-xs font-medium">
              <span className="text-gray-500">Ek İndirim (₺)</span>
              <input
                type="number"
                value={extraDiscount || ''}
                onChange={(e) => setExtraDiscount(parseFloat(e.target.value) || 0)}
                className="w-20 text-right text-orange-600 bg-orange-50 rounded px-2 py-1 outline-none font-bold"
                placeholder="0"
                min="0"
              />
            </div>
            <div className="flex justify-between text-xs font-medium text-gray-500 border-b border-dashed border-gray-200 pb-2">
              <span>KDV Toplamı</span>
              <span>₺{vatTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
            </div>
            
            <div className="flex justify-between items-end pt-1">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Genel Toplam</span>
              <span className="text-3xl font-black text-brand-600 tracking-tight">
                ₺{Math.max(0, total).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Ödeme Tipi Seçimi */}
          <div className="px-4 pb-3">
            <div className="grid grid-cols-5 gap-2 bg-gray-50 p-1.5 rounded-2xl">
              {(Object.keys(PAYMENT_LABELS) as PaymentType[]).map((pt) => {
                const Icon = PAYMENT_ICONS[pt];
                const isActive = paymentType === pt;
                return (
                  <button
                    key={pt}
                    onClick={() => setPaymentType(pt)}
                    className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-[10px] font-bold transition-all ${isActive ? 'bg-white text-brand-600 shadow-sm border border-brand-100 scale-105' : 'bg-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'}`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-brand-500' : ''}`} />
                    <span className="text-center leading-none">{PAYMENT_LABELS[pt]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ödeme Detayları (Dinamik) */}
          <div className="px-5 pb-4">
            <div className="animate-fade-in-up bg-white rounded-xl">
              {paymentType === 'CASH' && (
                <div className="flex gap-4 items-center p-3 border border-gray-100 rounded-2xl bg-gray-50">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Alınan Nakit</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₺</span>
                      <input
                        type="number"
                        value={cashGiven}
                        onChange={(e) => setCashGiven(e.target.value)}
                        placeholder={`${Math.max(0, total).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`}
                        className="w-full pl-7 pr-3 py-2 bg-white border-none rounded-xl text-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
                      />
                    </div>
                  </div>
                  {change > 0 && (
                    <div className="text-right border-l border-gray-200 pl-4">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Para Üstü</div>
                      <div className="text-xl font-black text-emerald-500">
                        ₺{change.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {paymentType === 'CARD' && (
                <input
                  type="text"
                  value={cardRef}
                  onChange={(e) => setCardRef(e.target.value)}
                  placeholder="Kredi Kartı Referans / Slip No (Opsiyonel)"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                />
              )}
              
              {paymentType === 'CHECK' && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={checkNo}
                    onChange={(e) => setCheckNo(e.target.value)}
                    placeholder="Çek Numarası"
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                  />
                  <input
                    type="date"
                    value={checkDueDate}
                    onChange={(e) => setCheckDueDate(e.target.value)}
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                  />
                </div>
              )}
              
              {paymentType === 'WIRE' && (
                <input
                  type="text"
                  value={wireRef}
                  onChange={(e) => setWireRef(e.target.value)}
                  placeholder="Havale / EFT Referans No"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              )}
              
              {paymentType === 'CREDIT' && !customer && (
                <div className="flex items-center gap-2 text-amber-700 bg-amber-50 rounded-xl px-4 py-3 text-xs font-bold border border-amber-200/50">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  Cari seçilmedi. Bu işlem "Perakende Müşteri" hesabına veresiye yazılacak!
                </div>
              )}
            </div>
          </div>

          {/* Aksiyon Butonları */}
          <div className="px-5 pb-5 flex items-stretch gap-3">
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="w-14 flex items-center justify-center text-gray-400 bg-gray-50 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-colors border border-gray-200 hover:border-red-200"
                title="Sepeti İptal Et (Temizle)"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading || cart.length === 0}
              className={`flex-1 relative overflow-hidden rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all duration-300 shadow-xl ${
                cart.length === 0 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' 
                  : 'bg-brand-500 text-white hover:bg-brand-400 hover:shadow-brand-500/30 hover:-translate-y-0.5 active:translate-y-0'
              }`}
              style={{ minHeight: '60px' }}
            >
              {checkoutLoading ? (
                <span className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-6 h-6" />
                  <span>SATIŞI TAMAMLA</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Başarı Bildirimi (Fiş) ───────────────────────────────────────── */}
      {showSuccess && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center animate-fade-in-up flex flex-col items-center">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6">
              <Check className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Satış Başarılı!</h2>
            <p className="text-gray-500 font-medium mb-6">Ödeme alındı ve işlem kaydedildi.</p>
            
            {lastReceipt && (
              <div className="bg-gray-50 w-full rounded-2xl p-4 border border-dashed border-gray-200 mb-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNFMUUxRTEiLz48L3N2Zz4=')] repeat-x" />
                <div className="absolute bottom-0 left-0 w-full h-1 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNFMUUxRTEiLz48L3N2Zz4=')] repeat-x" />
                <div className="text-xs text-gray-400 font-bold mb-1 uppercase tracking-widest">Fiş No</div>
                <div className="text-sm font-medium text-gray-900 mb-3">#{lastReceipt.receiptNo}</div>
                
                <div className="text-xs text-gray-400 font-bold mb-1 uppercase tracking-widest">Toplam Tutar</div>
                <div className="text-2xl font-black text-emerald-600">
                  ₺{lastReceipt.total?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            )}
            
            <button 
              onClick={() => setShowSuccess(false)}
              className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors"
            >
              YENİ SATIŞ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
