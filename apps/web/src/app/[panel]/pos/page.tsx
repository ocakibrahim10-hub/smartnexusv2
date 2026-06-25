'use client';

import { toast } from '@/lib/toast';
import { useState, useEffect, useCallback } from 'react';
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
  const user = getUser();
  // Ürün state
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Sepet
  const [cart, setCart] = useState<CartLine[]>([]);
  const [extraDiscount, setExtraDiscount] = useState(0);

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

  // Ürünleri yükle
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

  useEffect(() => {
    api
      .get('/pos/categories')
      .then((r) => setCategories(r.data))
      .catch(() => {});
    loadProducts();
    api
      .get('/pos/hugin/status')
      .then((r) => setHuginStatus(r.data.connected))
      .catch(() => setHuginStatus(false));
    document.getElementById('pos-barcode-input')?.focus();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchQ) loadProducts(searchQ);
      else loadProducts('', selectedCategory || undefined);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQ, selectedCategory]);

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
  const addToCart = (
    product: Product & { saleStock?: number; saleUnit?: string; baseStock?: number },
  ) => {
    const stock = (product as any).saleStock ?? product.stockItems?.[0]?.quantity ?? 0;
    const saleUnit = (product as any).saleUnit || product.unit || 'ADET';
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
      u[idx] = calcLine({ ...u[idx], unitPrice: price });
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
  };

  // Totaller
  const subtotal = cart.reduce((s, l) => s + l.quantity * l.unitPrice * (1 - l.discount / 100), 0);
  const vatTotal = cart.reduce((s, l) => s + l.vatAmount, 0);
  const total = subtotal + vatTotal - extraDiscount;
  const change =
    paymentType === 'CASH' && parseFloat(cashGiven) > total ? parseFloat(cashGiven) - total : 0;

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
      setCashGiven('');
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Satış işlemi başarısız');
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="pos-shell flex h-screen overflow-hidden bg-gray-100">
      {/* ── Sol: Ürünler ─────────────────────────────────────────────────── */}
      <div className="flex flex-col w-[58%] border-r border-gray-200 bg-white">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white">
          <div className="flex-1 relative">
            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <FormField
              id="pos-barcode-input"
              label="Ürün adı veya barkod ile ara"
              hideLabel
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Ürün adı veya barkod ile ara..."
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
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
          {/* Hugin durumu */}
          <div
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${huginStatus ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-500'}`}
          >
            {huginStatus ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            Hugin S1
          </div>
        </div>

        {/* Kategoriler */}
        {categories.length > 0 && (
          <div className="flex gap-2 px-4 py-2 overflow-x-auto border-b border-gray-100">
            <button
              onClick={() => {
                setSelectedCategory(null);
                setSearchQ('');
              }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!selectedCategory ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
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
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedCategory === c.id ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Ürün Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loadingProducts ? (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <Package className="w-8 h-8 mb-2" />
              <p className="text-sm">Ürün bulunamadı</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
              {products.map((p) => {
                const stock = (p as any).saleStock ?? p.stockItems?.[0]?.quantity ?? 0;
                const saleUnit = (p as any).saleUnit || p.unit || 'ADET';
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={stock <= 0}
                    className={`bg-white border border-gray-100 rounded-xl p-3 text-left transition-all group ${stock > 0 ? 'hover:border-brand-300 hover:shadow-md active:scale-95' : 'opacity-50 cursor-not-allowed'}`}
                  >
                    <ProductImage
                      src={p.imageUrl}
                      alt={p.name}
                      size="xs"
                      rounded="lg"
                      className="mb-2"
                    />
                    <div className="text-xs font-semibold text-gray-900 truncate leading-snug">
                      {p.name}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{p.code}</div>
                    <div className="mt-2 flex items-end justify-between">
                      <span className="text-sm font-bold text-brand-600">
                        ₺{(p.salePrice || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </span>
                      <span
                        className={`text-xs ${stock > 0 ? 'text-emerald-600' : 'text-red-500'}`}
                      >
                        {stock > 0 ? `${stock} ${saleUnit}` : 'Stok yok'}
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
      <div className="flex flex-col w-[42%] bg-white">
        {/* Müşteri */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              {customer ? (
                <div className="flex items-center gap-2 pl-9 pr-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-indigo-800 truncate">
                      {customer.name}
                    </div>
                    {customer.taxNo && (
                      <div className="text-xs text-indigo-500">VN: {customer.taxNo}</div>
                    )}
                  </div>
                  <IconButton
                    label="Müşteriyi kaldır"
                    onClick={() => setCustomer(null)}
                    className="text-indigo-400 hover:text-indigo-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </IconButton>
                </div>
              ) : (
                <FormField
                  label="Cari ara"
                  hideLabel
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerSearch(true);
                  }}
                  onFocus={() => setShowCustomerSearch(true)}
                  placeholder="Perakende Müşteri (cari aramak için yazın)"
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              )}
              {showCustomerSearch && customerResults.length > 0 && !customer && (
                <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                  {customerResults.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setCustomer(c);
                        setCustomerSearch('');
                        setShowCustomerSearch(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                    >
                      <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 text-xs font-bold flex-shrink-0">
                        {c.name.charAt(0)}
                      </div>
                      <div className="text-left min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{c.name}</div>
                        <div className="text-xs text-gray-400">{c.taxNo || c.phone}</div>
                      </div>
                      {c.balance && c.balance > 0 && (
                        <span className="ml-auto text-xs text-red-600 font-medium flex-shrink-0">
                          ₺{c.balance.toLocaleString('tr-TR')}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sepet */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-600">
              <ShoppingCart className="w-12 h-12 mb-3" />
              <p className="text-sm">Sepet boş</p>
              <p className="text-xs mt-1">Ürün eklemek için tıklayın</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {cart.map((line, idx) => (
                <div
                  key={line.productId}
                  className="px-4 py-3 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{line.name}</div>
                      <div className="flex items-center gap-2 mt-1.5">
                        {/* Adet kontrolü */}
                        <div className="flex items-center gap-1 bg-gray-100 rounded-lg">
                          <IconButton
                            label="Adet azalt"
                            onClick={() => updateQty(idx, line.quantity - 1)}
                            className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </IconButton>
                          <FormField
                            label="Adet"
                            hideLabel
                            type="number"
                            value={line.quantity}
                            onChange={(e) => updateQty(idx, parseFloat(e.target.value) || 0)}
                            className="w-10 text-center text-xs font-semibold bg-transparent outline-none"
                            min="0.001"
                            step="1"
                          />
                          <IconButton
                            label="Adet artır"
                            onClick={() => updateQty(idx, line.quantity + 1)}
                            className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </IconButton>
                        </div>

                        {/* Fiyat */}
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">₺</span>
                          <FormField
                            label="Birim fiyat"
                            hideLabel
                            type="number"
                            value={line.unitPrice}
                            onChange={(e) => updatePrice(idx, parseFloat(e.target.value) || 0)}
                            className="w-20 text-xs font-medium text-gray-700 border-b border-dashed border-gray-200 outline-none bg-transparent"
                            step="0.01"
                          />
                        </div>

                        {/* İndirim */}
                        <div className="flex items-center gap-1">
                          <Tag className="w-3 h-3 text-gray-400" />
                          <FormField
                            label="Satır indirimi (%)"
                            hideLabel
                            type="number"
                            value={line.discount}
                            onChange={(e) => updateDiscount(idx, parseFloat(e.target.value) || 0)}
                            className="w-10 text-xs text-orange-600 border-b border-dashed border-orange-200 outline-none bg-transparent"
                            min="0"
                            max="100"
                          />
                          <span className="text-xs text-orange-500">%</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-900">
                          ₺{line.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-gray-400">
                          KDV: ₺
                          {line.vatAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <IconButton
                        label="Sepetten kaldır"
                        onClick={() => removeFromCart(idx)}
                        className="text-gray-600 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </IconButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Toplam & Ödeme */}
        <div className="border-t border-gray-100 bg-gray-50">
          {/* Toplam satırları */}
          <div className="px-4 py-3 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Ara Toplam</span>
              <span>₺{subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>KDV</span>
              <span>₺{vatTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
            </div>
            {/* Toplam indirim */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Ek İndirim (₺)</span>
              <FormField
                label="Ek İndirim (₺)"
                hideLabel
                type="number"
                value={extraDiscount || ''}
                onChange={(e) => setExtraDiscount(parseFloat(e.target.value) || 0)}
                className="w-24 text-right text-orange-600 border-b border-dashed border-orange-200 outline-none bg-transparent text-sm"
                placeholder="0"
                min="0"
              />
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-900 pt-1 border-t border-gray-200">
              <span>TOPLAM</span>
              <span className="text-brand-600">
                ₺{Math.max(0, total).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Ödeme tipi seçimi */}
          <div className="grid grid-cols-5 gap-1 px-3 pb-2">
            {(Object.keys(PAYMENT_LABELS) as PaymentType[]).map((pt) => {
              const Icon = PAYMENT_ICONS[pt];
              return (
                <button
                  key={pt}
                  onClick={() => setPaymentType(pt)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium transition-all ${paymentType === pt ? 'bg-brand-500 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-100'}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-center leading-tight">{PAYMENT_LABELS[pt]}</span>
                </button>
              );
            })}
          </div>

          {/* Ödeme detayları */}
          <div className="px-3 pb-2">
            {paymentType === 'CASH' && (
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <FormField
                    label="Verilen Nakit"
                    type="number"
                    value={cashGiven}
                    onChange={(e) => setCashGiven(e.target.value)}
                    placeholder={`₺${Math.max(0, total).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                {change > 0 && (
                  <div className="text-right">
                    <div className="text-xs text-gray-400">Para Üstü</div>
                    <div className="text-lg font-bold text-emerald-600">
                      ₺{change.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                )}
              </div>
            )}
            {paymentType === 'CARD' && (
              <FormField
                label="Kart referans no"
                hideLabel
                value={cardRef}
                onChange={(e) => setCardRef(e.target.value)}
                placeholder="Kart referans no (opsiyonel)"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            )}
            {paymentType === 'CHECK' && (
              <div className="flex gap-2">
                <FormField
                  label="Çek numarası"
                  hideLabel
                  value={checkNo}
                  onChange={(e) => setCheckNo(e.target.value)}
                  placeholder="Çek numarası"
                  className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <FormField
                  label="Çek vade tarihi"
                  hideLabel
                  type="date"
                  value={checkDueDate}
                  onChange={(e) => setCheckDueDate(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            )}
            {paymentType === 'WIRE' && (
              <FormField
                label="Havale referans no"
                hideLabel
                value={wireRef}
                onChange={(e) => setWireRef(e.target.value)}
                placeholder="Havale / EFT referans no"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            )}
            {paymentType === 'CREDIT' && !customer && (
              <div className="flex items-center gap-2 text-gray-600 bg-gray-50 rounded-lg px-3 py-2 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Cari seçilmezse &quot;Perakende Müşteri&quot; carisine veresiye yazılır
              </div>
            )}
          </div>

          {/* Hugin seçeneği + Ödeme butonu */}
          <div className="flex items-center gap-2 px-3 pb-3">
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={printToHugin}
                onChange={(e) => setPrintToHugin(e.target.checked)}
                className="w-3.5 h-3.5 accent-brand-500"
              />
              <Printer className="w-3.5 h-3.5" />
              Yazarkasa
            </label>
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading || cart.length === 0}
              className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-base"
            >
              {checkoutLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  SATIŞ TAMAMLAnDI
                </>
              )}
            </button>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                title="Sepeti Temizle"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Başarı bildirimi */}
      {showSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in-up">
          <CheckCircle className="w-6 h-6" />
          <div>
            <div className="font-bold">Satış Tamamlandı!</div>
            {lastReceipt && (
              <div className="text-sm text-emerald-100">
                #{lastReceipt.receiptNo} · ₺
                {lastReceipt.total?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
