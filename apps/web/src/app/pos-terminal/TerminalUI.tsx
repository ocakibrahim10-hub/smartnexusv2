'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart2,
  FileText,
  X,
  PauseCircle,
  ListOrdered,
  Zap,
  Wifi,
  WifiOff,
  Search,
  User,
  Trash2,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';

interface Product {
  id: string;
  name: string;
  code: string;
  barcode?: string;
  salePrice: number;
  vatRate: number;
  unit: string;
  stock: number;
  saleUnit?: string;
}

interface Contact {
  id: string;
  name: string;
  code?: string;
  taxNo?: string;
  phone?: string;
  balance?: number;
}

interface CartItem {
  cartId: string;
  productId: string;
  code: string;
  name: string;
  quantity: number;
  unit: string;
  salePrice: number;
  vatRate: number;
  discountPct: number;
  stock: number;
}

interface HeldSale {
  id: string;
  cart: CartItem[];
  contactId: string | null;
  contactName: string;
  description: string;
  paymentType: string;
  discountPct: number;
  discountTl: number;
  timestamp: number;
}

type PaymentUi = 'CASH' | 'CARD' | 'CREDIT';

const HELD_KEY = 'smartnexus_pos_terminal_held';

function mapApiProduct(p: Record<string, unknown>): Product {
  const stockItems = p.stockItems as { quantity: number }[] | undefined;
  const baseStock = stockItems?.reduce((s, si) => s + si.quantity, 0) ?? 0;
  const saleStock = (p.saleStock as number) ?? baseStock;
  return {
    id: p.id as string,
    name: p.name as string,
    code: p.code as string,
    barcode: p.barcode as string | undefined,
    salePrice: Number(p.salePrice) || 0,
    vatRate: Number(p.vatRate) || 20,
    unit: (p.saleUnit as string) || (p.unit as string) || 'ADET',
    stock: saleStock,
    saleUnit: (p.saleUnit as string) || (p.unit as string),
  };
}

function lineTotal(item: CartItem) {
  const net = item.quantity * item.salePrice * (1 - item.discountPct / 100);
  const vat = net * (item.vatRate / 100);
  return { net, vat, gross: net + vat };
}

interface TerminalUIProps {
  onLogout: () => void;
}

export function TerminalUI({ onLogout }: TerminalUIProps) {
  const user = getUser();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcode, setBarcode] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [description, setDescription] = useState('');
  const [discountPct, setDiscountPct] = useState(0);
  const [discountTl, setDiscountTl] = useState(0);
  const [paymentType, setPaymentType] = useState<PaymentUi>('CASH');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [gridProducts, setGridProducts] = useState<Product[]>([]);
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [online, setOnline] = useState(true);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactId, setContactId] = useState<string>('');
  const [contactSearch, setContactSearch] = useState('');
  const [showContactSearch, setShowContactSearch] = useState(false);

  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);
  const [showHeld, setShowHeld] = useState(false);

  const [clock, setClock] = useState('');

  const loadProducts = useCallback(async (categoryId?: string | null) => {
    setLoadingGrid(true);
    try {
      const r = await api.get('/pos/products/grid', {
        params: categoryId ? { categoryId } : {},
      });
      setGridProducts((r.data as Record<string, unknown>[]).map(mapApiProduct));
      setOnline(true);
    } catch {
      setOnline(false);
      toast.error('Ürünler yüklenemedi');
    } finally {
      setLoadingGrid(false);
    }
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(
        `${now.toLocaleDateString('tr-TR')} ${now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`,
      );
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    api
      .get('/pos/categories')
      .then((r) => {
        const cats = r.data as { id: string; name: string }[];
        setCategories(cats);
        if (cats.length > 0) setActiveCategoryId(cats[0].id);
      })
      .catch(() => setOnline(false));

    api
      .get('/contacts', { params: { limit: 200 } })
      .then((r) => {
        const list = (r.data?.data ?? r.data ?? []) as Contact[];
        setContacts(list);
        const retail = list.find(
          (c) =>
            c.code?.toUpperCase() === 'PERAKENDE' ||
            c.name?.toUpperCase().includes('PERAKENDE'),
        );
        setContactId(retail?.id || list[0]?.id || '');
      })
      .catch(() => {});

    try {
      const raw = localStorage.getItem(HELD_KEY);
      if (raw) setHeldSales(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadProducts(activeCategoryId);
  }, [activeCategoryId, loadProducts]);

  const saveHeld = (list: HeldSale[]) => {
    setHeldSales(list);
    localStorage.setItem(HELD_KEY, JSON.stringify(list));
  };

  const addToCart = (product: Product, qty?: number) => {
    const q = qty ?? (parseFloat(quantity) || 1);
    if (product.stock <= 0) {
      toast.error('Stok yok');
      return;
    }
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.productId === product.id);
      if (idx >= 0) {
        const next = [...prev];
        const newQty = next[idx].quantity + q;
        if (newQty > product.stock) {
          toast.error(`Maksimum stok: ${product.stock}`);
          return prev;
        }
        next[idx] = { ...next[idx], quantity: newQty };
        return next;
      }
      if (q > product.stock) {
        toast.error(`Maksimum stok: ${product.stock}`);
        return prev;
      }
      return [
        {
          cartId: `${product.id}-${Date.now()}`,
          productId: product.id,
          code: product.code,
          name: product.name,
          quantity: q,
          unit: product.unit,
          salePrice: product.salePrice,
          vatRate: product.vatRate,
          discountPct: 0,
          stock: product.stock,
        },
        ...prev,
      ];
    });
    setQuantity('1');
    setBarcode('');
  };

  const searchAndAddBarcode = async (code: string) => {
    const local = gridProducts.find((p) => p.barcode === code || p.code === code);
    if (local) {
      addToCart(local);
      toast.success(`${local.name} eklendi`);
      return;
    }
    try {
      const r = await api.get('/pos/products', { params: { q: code } });
      const items = (r.data as Record<string, unknown>[]).map(mapApiProduct);
      if (items.length === 1) {
        addToCart(items[0]);
        toast.success(`${items[0].name} eklendi`);
      } else if (items.length > 1) {
        toast.info('Birden fazla ürün bulundu — listeden seçin');
      } else {
        toast.error('Barkod bulunamadı');
      }
    } catch {
      toast.error('Barkod araması başarısız');
    }
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) return;
    searchAndAddBarcode(barcode.trim());
  };

  const removeRow = (cartId: string) => setCart((prev) => prev.filter((c) => c.cartId !== cartId));

  const calcTotals = () => {
    let subtotal = 0;
    let vat = 0;
    cart.forEach((item) => {
      const t = lineTotal(item);
      subtotal += t.net;
      vat += t.vat;
    });
    const afterPct = subtotal * (1 - discountPct / 100);
    const grand = afterPct + vat - discountTl;
    return { subtotal, vat, grandTotal: Math.max(0, grand) };
  };

  const totals = calcTotals();
  const selectedContact = contacts.find((c) => c.id === contactId);

  const handleHold = () => {
    if (cart.length === 0) {
      toast.error('Sepet boş');
      return;
    }
    const held: HeldSale = {
      id: `held-${Date.now()}`,
      cart: [...cart],
      contactId: contactId || null,
      contactName: selectedContact?.name || 'Perakende',
      description,
      paymentType,
      discountPct,
      discountTl,
      timestamp: Date.now(),
    };
    saveHeld([held, ...heldSales]);
    setCart([]);
    setDescription('');
    setDiscountPct(0);
    setDiscountTl(0);
    toast.success('Satış askıya alındı');
  };

  const restoreHeld = (held: HeldSale) => {
    setCart(held.cart);
    if (held.contactId) setContactId(held.contactId);
    setDescription(held.description);
    setPaymentType(held.paymentType as PaymentUi);
    setDiscountPct(held.discountPct);
    setDiscountTl(held.discountTl);
    saveHeld(heldSales.filter((h) => h.id !== held.id));
    setShowHeld(false);
    toast.success('Askıdaki satış yüklendi');
  };

  const completeSale = async (docType: string) => {
    if (cart.length === 0) {
      toast.error('Sepet boş');
      return;
    }
    setCheckoutLoading(true);
    try {
      const dto = {
        contactId: contactId || undefined,
        lines: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.salePrice,
          discount: item.discountPct,
          vatRate: item.vatRate,
          saleUnit: item.unit,
        })),
        paymentType,
        discount: discountTl + totals.subtotal * (discountPct / 100),
        printToHugin: false,
      };
      const r = await api.post('/pos/checkout', dto);
      toast.success(
        `${docType} kaydedildi — ${r.data?.receipt?.receiptNo || 'Fiş'}`,
      );
      setCart([]);
      setDescription('');
      setDiscountPct(0);
      setDiscountTl(0);
      loadProducts(activeCategoryId);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg || 'Satış kaydedilemedi');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const filteredContacts = contactSearch.trim()
    ? contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
          c.code?.toLowerCase().includes(contactSearch.toLowerCase()) ||
          c.taxNo?.includes(contactSearch),
      )
    : contacts;

  const lastLine = cart[0];

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#FBF8FF] overflow-hidden text-sm text-[#1B1B1F]">
      {/* Toolbar */}
      <div className="bg-white border-b border-[#EFEDF4] px-3 py-2 flex items-center gap-2 shadow-sm">
        <div className="flex items-center gap-2 mr-4">
          <div className="w-8 h-8 rounded-lg bg-[#606BDF] text-white flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-sm leading-none">SmartNexus POS</div>
            <div className="text-[10px] text-gray-500">{user?.tenantName || 'İşletme'}</div>
          </div>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#E0E0FF] text-[#3944B8] text-xs font-semibold"
        >
          <BarChart2 className="w-4 h-4" /> Satış
        </button>
        <button
          type="button"
          onClick={() => toast.info('Son faturalar ana panelden görüntülenir')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-gray-50 text-xs font-medium text-gray-600"
        >
          <FileText className="w-4 h-4" /> Faturalar
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-red-50 text-red-600 text-xs font-medium"
        >
          <X className="w-4 h-4" /> Kapat
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden p-2 gap-2 min-h-0">
        {/* Sol: Satış listesi */}
        <div className="flex-[0.58] flex flex-col card border border-[#EFEDF4] overflow-hidden min-w-0">
          <div className="px-3 py-2 border-b border-[#EFEDF4] bg-[#FBF8FF] font-semibold text-[#3944B8] text-xs">
            Satış Listesi
          </div>

          <div className="p-3 flex flex-col gap-2 flex-1 min-h-0">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleHold}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#EFEDF4] hover:bg-[#E0E0FF] text-xs font-medium"
              >
                <PauseCircle className="w-3.5 h-3.5" /> Askıya Al
              </button>
              <button
                type="button"
                onClick={() => setShowHeld(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#EFEDF4] hover:bg-[#E0E0FF] text-xs font-medium"
              >
                <ListOrdered className="w-3.5 h-3.5" />
                Askıdakiler {heldSales.length > 0 && `(${heldSales.length})`}
              </button>
            </div>

            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 items-center">
              <label className="text-xs text-gray-500">Cari</label>
              <div className="relative">
                <select
                  title="Cari hesap"
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                  className="w-full border border-[#EFEDF4] rounded-lg px-3 py-1.5 text-xs bg-white focus:border-[#606BDF] outline-none"
                >
                  {contacts.length === 0 && <option value="">Yükleniyor…</option>}
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.balance != null ? ` (${c.balance.toFixed(2)} ₺)` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  title="Cari ara"
                  onClick={() => setShowContactSearch(!showContactSearch)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#606BDF]"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
                {showContactSearch && (
                  <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-[#EFEDF4] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    <input
                      type="text"
                      placeholder="Cari ara…"
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      className="w-full px-3 py-2 text-xs border-b border-[#EFEDF4] outline-none"
                    />
                    {filteredContacts.slice(0, 15).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setContactId(c.id);
                          setShowContactSearch(false);
                          setContactSearch('');
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-[#FBF8FF] flex items-center gap-2"
                      >
                        <User className="w-3 h-3 text-gray-400" />
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <label className="text-xs text-gray-500">Ödeme</label>
              <select
                title="Ödeme tipi"
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as PaymentUi)}
                className="border border-[#EFEDF4] rounded-lg px-3 py-1.5 text-xs bg-white focus:border-[#606BDF] outline-none"
              >
                <option value="CASH">Peşin (Nakit)</option>
                <option value="CARD">Kredi Kartı</option>
                <option value="CREDIT">Veresiye</option>
              </select>

              <label className="text-xs text-gray-500">Açıklama</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Fiş notu (isteğe bağlı)"
                className="border border-[#EFEDF4] rounded-lg px-3 py-1.5 text-xs outline-none focus:border-[#606BDF]"
              />
            </div>

            <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-2">
              <input
                type="number"
                title="Miktar"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-16 border border-[#EFEDF4] rounded-lg px-2 py-1.5 text-xs text-center"
                min="0.01"
                step="any"
              />
              <input
                type="text"
                title="Barkod"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Barkod okutun veya yazın…"
                className="flex-1 border border-[#EFEDF4] rounded-lg px-3 py-1.5 text-xs focus:border-[#606BDF] outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  setBarcode('');
                  setQuantity('1');
                }}
                className="px-3 py-1.5 text-xs border border-[#EFEDF4] rounded-lg hover:bg-gray-50"
              >
                Temizle
              </button>
            </form>

            {lastLine && (
              <div className="flex gap-2 text-[11px] text-gray-500 px-1">
                <span className="truncate flex-1">{lastLine.name}</span>
                <span>Stok: {lastLine.stock}</span>
              </div>
            )}

            <div className="flex-1 border border-[#EFEDF4] rounded-lg overflow-auto min-h-[140px] bg-white">
              <table className="w-full text-[11px]">
                <thead className="bg-[#FBF8FF] sticky top-0 border-b border-[#EFEDF4]">
                  <tr>
                    <th className="w-6 p-1" />
                    <th className="p-1 text-left font-medium">Kod</th>
                    <th className="p-1 text-left font-medium">Ürün</th>
                    <th className="p-1 text-right font-medium">Miktar</th>
                    <th className="p-1 text-right font-medium">Fiyat</th>
                    <th className="p-1 text-right font-medium">Tutar</th>
                    <th className="p-1 text-right font-medium">KDV</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => {
                    const t = lineTotal(item);
                    return (
                      <tr key={item.cartId} className="border-b border-gray-50 hover:bg-[#FBF8FF] group">
                        <td className="p-1">
                          <button
                            type="button"
                            title="Sil"
                            onClick={() => removeRow(item.cartId)}
                            className="text-red-400 opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                        <td className="p-1 text-gray-500">{item.code}</td>
                        <td className="p-1 max-w-[140px] truncate">{item.name}</td>
                        <td className="p-1 text-right">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="p-1 text-right">{item.salePrice.toFixed(2)}</td>
                        <td className="p-1 text-right font-medium">{t.gross.toFixed(2)}</td>
                        <td className="p-1 text-right text-gray-500">%{item.vatRate}</td>
                      </tr>
                    );
                  })}
                  {cart.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400 text-xs">
                        Sepet boş. Barkod okutun veya sağdaki hızlı tuşlardan ürün ekleyin.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex gap-4 items-end">
              <div className="flex-1 space-y-2">
                <div className="flex gap-2 items-center">
                  <label className="text-xs text-gray-500 w-20">İndirim %</label>
                  <input
                    type="number"
                    value={discountPct}
                    onChange={(e) => setDiscountPct(Number(e.target.value) || 0)}
                    className="w-20 border border-[#EFEDF4] rounded-lg px-2 py-1 text-xs text-right"
                    min={0}
                    max={100}
                  />
                  <label className="text-xs text-gray-500 ml-2">İndirim ₺</label>
                  <input
                    type="number"
                    value={discountTl}
                    onChange={(e) => setDiscountTl(Number(e.target.value) || 0)}
                    className="w-24 border border-[#EFEDF4] rounded-lg px-2 py-1 text-xs text-right"
                    min={0}
                  />
                </div>
                <div className="flex gap-2">
                  {(['Perakende Fatura', 'Toptan Fatura', 'İrsaliye'] as const).map((label) => (
                    <button
                      key={label}
                      type="button"
                      disabled={checkoutLoading}
                      onClick={() => completeSale(label)}
                      className="flex-1 py-2.5 text-xs font-semibold rounded-lg border border-[#EFEDF4] hover:bg-[#E0E0FF] hover:border-[#606BDF] disabled:opacity-50 transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="w-44 text-right space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Ara Toplam</span>
                  <span>{totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">KDV</span>
                  <span>{totals.vat.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-end pt-1 border-t border-[#EFEDF4]">
                  <span className="text-xs font-semibold">Genel Toplam</span>
                  <span className="text-2xl font-bold text-[#606BDF]">
                    {totals.grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sağ: Hızlı tuşlar */}
        <div className="flex-[0.42] flex flex-col card border border-[#EFEDF4] overflow-hidden min-w-0">
          <div className="px-3 py-2 border-b border-[#EFEDF4] bg-[#FBF8FF] font-semibold text-[#3944B8] text-xs flex justify-between">
            <span>Hızlı Tuşlar — Stoktan</span>
            {loadingGrid && <span className="text-gray-400 font-normal">Yükleniyor…</span>}
          </div>
          <div className="p-2 flex flex-col h-full gap-2 min-h-0">
            <div className="grid grid-cols-4 gap-1.5 max-h-28 overflow-y-auto">
              <button
                type="button"
                onClick={() => setActiveCategoryId(null)}
                className={`p-2 text-[10px] font-semibold rounded-lg border transition-colors ${
                  !activeCategoryId
                    ? 'bg-[#E0E0FF] border-[#606BDF] text-[#3944B8]'
                    : 'border-[#EFEDF4] hover:bg-gray-50'
                }`}
              >
                Tümü
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={`p-2 text-[10px] font-semibold rounded-lg border transition-colors line-clamp-2 ${
                    activeCategoryId === cat.id
                      ? 'bg-[#E0E0FF] border-[#606BDF] text-[#3944B8]'
                      : 'border-[#EFEDF4] hover:bg-gray-50'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            <div className="flex-1 grid grid-cols-3 sm:grid-cols-4 gap-1.5 overflow-y-auto auto-rows-min content-start min-h-0">
              {gridProducts.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addToCart(item)}
                  className="relative min-h-[72px] p-2 rounded-lg border border-[#EFEDF4] bg-white hover:border-[#606BDF] hover:bg-[#FBF8FF] active:scale-[0.98] transition-all text-left flex flex-col justify-between"
                >
                  <span
                    className={`absolute top-1 right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${
                      item.stock > 0
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-red-50 text-red-600 border-red-100'
                    }`}
                  >
                    {item.stock} {item.saleUnit || item.unit}
                  </span>
                  <span className="text-[10px] font-medium line-clamp-3 leading-tight pr-10">{item.name}</span>
                  <span className="text-[10px] text-[#606BDF] font-bold mt-1">
                    {item.salePrice.toFixed(2)} ₺
                  </span>
                </button>
              ))}
              {!loadingGrid && gridProducts.length === 0 && (
                <div className="col-span-full p-6 text-center text-xs text-gray-400">
                  Bu kategoride stoklu ürün yok. Stok modülünden ürün ekleyin.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Askıdakiler modal */}
      {showHeld && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="modal-card max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[#EFEDF4]">
              <h3 className="font-semibold">Askıdaki Satışlar</h3>
              <button type="button" onClick={() => setShowHeld(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {heldSales.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">Askıda satış yok</p>
              ) : (
                heldSales.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => restoreHeld(h)}
                    className="w-full text-left p-3 rounded-lg hover:bg-[#FBF8FF] border border-transparent hover:border-[#EFEDF4] mb-1"
                  >
                    <div className="font-medium text-sm">{h.contactName}</div>
                    <div className="text-xs text-gray-500">
                      {h.cart.length} kalem ·{' '}
                      {new Date(h.timestamp).toLocaleString('tr-TR')}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="bg-white border-t border-[#EFEDF4] px-4 py-1 flex items-center justify-between text-[10px] text-gray-500 h-6">
        <div className="flex items-center gap-2">
          {online ? (
            <span className="flex items-center gap-1 text-emerald-600">
              <Wifi className="w-3 h-3" /> Bağlı
            </span>
          ) : (
            <span className="flex items-center gap-1 text-red-500">
              <WifiOff className="w-3 h-3" /> Bağlantı sorunu
            </span>
          )}
          <span className="font-medium text-[#606BDF]">SmartNexus</span>
          <span>· {user?.name}</span>
        </div>
        <span>{clock}</span>
      </div>
    </div>
  );
}
