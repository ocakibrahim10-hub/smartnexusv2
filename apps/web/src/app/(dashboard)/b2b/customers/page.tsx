'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Search,
  ChevronRight,
  ShoppingCart,
  TrendingUp,
  Phone,
  Mail,
  MapPin,
  Tag,
} from 'lucide-react';

type B2BCustomer = {
  id: string;
  name: string;
  type: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  taxNo: string | null;
  priceList: { id: string; name: string } | null;
  orderCount: number;
  totalRevenue: number;
  b2bOrders: { id: string; code: string; status: string; total: number; requestedAt: string }[];
};

type PriceList = { id: string; name: string; currency: string };

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-gray-500/20 text-gray-400',
  PENDING: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-blue-500/20 text-blue-400',
  PROCESSING: 'bg-brand-50 text-brand-600',
  SHIPPED: 'bg-orange-500/20 text-orange-400',
  DELIVERED: 'bg-emerald-500/20 text-emerald-600',
  CANCELLED: 'bg-red-500/20 text-red-400',
};
const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Taslak',
  PENDING: 'Bekliyor',
  APPROVED: 'Onaylandı',
  PROCESSING: 'Hazırlanıyor',
  SHIPPED: 'Kargoda',
  DELIVERED: 'Teslim Edildi',
  CANCELLED: 'İptal',
};

const fmt = (d: string) => new Date(d).toLocaleDateString('tr-TR');
const fmtMoney = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺';

export default function B2BCustomersPage() {
  const [customers, setCustomers] = useState<B2BCustomer[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<B2BCustomer | null>(null);
  const [assigningPL, setAssigningPL] = useState(false);
  const [selectedPL, setSelectedPL] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [cr, plr] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/b2b/customers`, {
          headers,
        }).then((r) => r.json()),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/b2b/price-lists`, {
          headers,
        }).then((r) => r.json()),
      ]);
      setCustomers(Array.isArray(cr) ? cr : []);
      setPriceLists(Array.isArray(plr) ? plr : []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const filtered = customers.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.city || '').toLowerCase().includes(search.toLowerCase()),
  );

  const stats = {
    total: customers.length,
    totalRevenue: customers.reduce((s, c) => s + c.totalRevenue, 0),
    totalOrders: customers.reduce((s, c) => s + c.orderCount, 0),
    withPriceList: customers.filter((c) => c.priceList).length,
  };

  const assignPriceList = async () => {
    if (!selected || !selectedPL) return;
    setAssigningPL(true);
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/b2b/customers/${selected.id}/price-list`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ priceListId: selectedPL }),
        },
      );
      await fetchAll();
      // update selected
      const updated = customers.find((c) => c.id === selected.id);
      if (updated)
        setSelected({ ...updated, priceList: priceLists.find((p) => p.id === selectedPL) || null });
    } catch {}
    setAssigningPL(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Users className="text-indigo-400" />
          B2B Müşteriler
        </h1>
        <p className="text-gray-500 text-sm mt-1">Kurumsal müşteri portföyünüzü yönetin</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Toplam Müşteri', value: stats.total, icon: Users, color: 'text-indigo-400' },
          {
            label: 'Toplam Sipariş',
            value: stats.totalOrders,
            icon: ShoppingCart,
            color: 'text-blue-400',
          },
          {
            label: 'Toplam Ciro',
            value: fmtMoney(stats.totalRevenue),
            icon: TrendingUp,
            color: 'text-emerald-600',
          },
          {
            label: 'Fiyat Listeli',
            value: stats.withPriceList,
            icon: Tag,
            color: 'text-yellow-400',
          },
        ].map((k) => (
          <div key={k.label} className="kpi-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">{k.label}</span>
              <k.icon size={18} className={k.color} />
            </div>
            <div className="page-title">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-4 h-[calc(100vh-330px)]">
        {/* Left: customer list */}
        <div className="w-80 flex flex-col gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9 text-sm w-full"
              placeholder="Müşteri veya şehir ara…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {loading ? (
              <div className="text-center text-gray-400 py-8">Yükleniyor…</div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <Users size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Müşteri bulunamadı</p>
              </div>
            ) : (
              filtered.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelected(c);
                    setSelectedPL(c.priceList?.id || '');
                  }}
                  className={`card cursor-pointer transition-all border-l-4 ${selected?.id === c.id ? 'border-l-indigo-500 bg-indigo-500/10' : 'border-l-transparent hover:border-l-indigo-500/50'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="text-gray-900 font-semibold text-sm truncate">{c.name}</div>
                      {c.city && (
                        <div className="text-gray-400 text-xs flex items-center gap-1 mt-0.5">
                          <MapPin size={10} />
                          {c.city}
                        </div>
                      )}
                    </div>
                    <ChevronRight size={14} className="text-gray-500 flex-shrink-0 mt-0.5" />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{c.orderCount} sipariş</span>
                      {c.priceList && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-brand-50 text-brand-600">
                          {c.priceList.name}
                        </span>
                      )}
                    </div>
                    <span className="text-emerald-600 text-xs font-semibold">
                      {fmtMoney(c.totalRevenue)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: detail */}
        <div className="flex-1 overflow-y-auto">
          {!selected ? (
            <div className="card h-full flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Users size={48} className="mx-auto mb-3 opacity-20" />
                <p>Detay için bir müşteri seçin</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Info card */}
              <div className="card">
                <h2 className="text-xl font-bold text-gray-900 mb-3">{selected.name}</h2>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selected.email && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail size={13} className="text-gray-500" />
                      {selected.email}
                    </div>
                  )}
                  {selected.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone size={13} className="text-gray-500" />
                      {selected.phone}
                    </div>
                  )}
                  {selected.city && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin size={13} className="text-gray-500" />
                      {selected.city}
                    </div>
                  )}
                  {selected.taxNo && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="text-gray-500 text-xs">VKN:</span>
                      {selected.taxNo}
                    </div>
                  )}
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="bg-gray-50 rounded p-3 text-center">
                    <div className="text-gray-400 text-xs mb-1">Toplam Sipariş</div>
                    <div className="text-gray-900 font-bold text-lg">{selected.orderCount}</div>
                  </div>
                  <div className="bg-gray-50 rounded p-3 text-center">
                    <div className="text-gray-400 text-xs mb-1">Toplam Ciro</div>
                    <div className="text-emerald-600 font-bold">
                      {fmtMoney(selected.totalRevenue)}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded p-3 text-center">
                    <div className="text-gray-400 text-xs mb-1">Fiyat Listesi</div>
                    <div className="text-indigo-400 font-semibold text-sm">
                      {selected.priceList?.name || '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Price list assignment */}
              <div className="card">
                <h3 className="text-gray-900 font-semibold mb-3 flex items-center gap-2">
                  <Tag size={14} className="text-indigo-400" />
                  Fiyat Listesi Ata
                </h3>
                <div className="flex gap-3">
                  <select
                    className="input flex-1 text-sm"
                    value={selectedPL}
                    onChange={(e) => setSelectedPL(e.target.value)}
                  >
                    <option value="">Fiyat listesi seçin…</option>
                    {priceLists.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.currency})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={assignPriceList}
                    disabled={assigningPL || !selectedPL}
                    className="btn-primary text-sm px-4"
                  >
                    {assigningPL ? 'Atanıyor…' : 'Ata'}
                  </button>
                </div>
              </div>

              {/* Order history */}
              {selected.b2bOrders.length > 0 && (
                <div className="card">
                  <h3 className="text-gray-900 font-semibold mb-3 flex items-center gap-2">
                    <ShoppingCart size={14} className="text-indigo-400" />
                    Sipariş Geçmişi
                  </h3>
                  <div className="space-y-2">
                    {selected.b2bOrders.map((o) => (
                      <div
                        key={o.id}
                        className="flex items-center justify-between bg-gray-50 rounded p-3"
                      >
                        <div>
                          <div className="text-gray-900 text-sm font-medium">{o.code}</div>
                          <div className="text-gray-400 text-xs">{fmt(o.requestedAt)}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[o.status] || ''}`}
                          >
                            {STATUS_LABEL[o.status] || o.status}
                          </span>
                          <span className="text-gray-900 font-semibold text-sm">
                            {fmtMoney(o.total)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
