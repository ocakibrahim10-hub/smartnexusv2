'use client';

import { useEffect, useState } from 'react';
import { toast } from '@/lib/toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  ShoppingBag,
  RefreshCw,
  Link2,
  Link2Off,
  Package,
  TrendingUp,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import {
  type Platform,
  PLATFORM_LOGO,
  PLATFORM_NAME,
  PlatformLogo,
  platformCardBorderClass,
  platformFilterActiveClass,
  OrderStatusBadge,
  KpiIconBox,
} from '@/lib/marketplace-platforms';

interface Connection {
  platform: Platform;
  name: string;
  color: string;
  description: string;
  connected: boolean;
  sellerId: string | null;
  connectedAt: string | null;
  lastSyncAt: string | null;
}

interface Order {
  id: string;
  platform: Platform;
  orderNo: string;
  product: string;
  qty: number;
  price: number;
  status: string;
  customer: string;
  city: string;
  createdAt: string;
}

interface Listing {
  id: string;
  platform: Platform;
  productCode: string;
  productName: string;
  listingId: string;
  price: number;
  stock: number;
  status: string;
  views: number;
  sales30d: number;
  rating: number;
  reviewCount: number;
  lastSynced: string;
}

interface DashboardData {
  connectedCount: number;
  totalOrders: number;
  totalRevenue: number;
  platformStats: Array<{
    platform: Platform;
    orders: number;
    revenue: number;
    newOrders: number;
    lastSyncAt: string | null;
  }>;
  recentLogs: Array<{
    platform: string;
    action: string;
    synced: number;
    timestamp: string;
  }>;
}

function ConnectModal({
  platform,
  onClose,
  onConnect,
}: {
  platform: Platform;
  onClose: () => void;
  onConnect: () => void;
}) {
  const [form, setForm] = useState({ apiKey: '', sellerId: '', apiSecret: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!form.apiKey || !form.sellerId) {
      setError('API Key ve Mağaza ID zorunludur');
      return;
    }
    setLoading(true);
    try {
      await apiFetch(`/marketplace/connections/${platform}`, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      onConnect();
      onClose();
    } catch {
      setError('Bağlantı başarısız. API bilgilerini kontrol edin.');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="modal-card w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <PlatformLogo platform={platform} size="xl" />
          <div>
            <h2 className="text-base font-bold">{PLATFORM_NAME[platform]} Bağla</h2>
            <p className="text-xs text-[#777680]">API bilgilerinizi girin</p>
          </div>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="text-xs block mb-1.5">API Key *</label>
            <input
              className="input w-full"
              placeholder="api_key_xxxxx"
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs block mb-1.5">
              {platform === 'TRENDYOL'
                ? 'Satıcı ID'
                : platform === 'HEPSIBURADA'
                  ? 'Mağaza ID'
                  : 'Seller ID'}{' '}
              *
            </label>
            <input
              className="input w-full"
              placeholder="12345678"
              value={form.sellerId}
              onChange={(e) => setForm({ ...form, sellerId: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs block mb-1.5">API Secret (Opsiyonel)</label>
            <input
              className="input w-full"
              type="password"
              placeholder="api_secret_xxxxx"
              value={form.apiSecret}
              onChange={(e) => setForm({ ...form, apiSecret: e.target.value })}
            />
          </div>
          {error && (
            <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
          )}
        </div>

        <div className="mt-4 p-3 rounded-lg bg-[#FBF8FF] border border-[#EFEDF4] text-xs text-[#777680]">
          🔒 Bu demo bir simülasyondur. Gerçek API anahtarı gerekmez — herhangi bir değer
          girebilirsiniz.
        </div>

        <div className="flex gap-2.5 mt-5">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>
            İptal
          </button>
          <button
            type="button"
            className="btn-primary flex-[2] justify-center"
            onClick={submit}
            disabled={loading}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Bağlan
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MarketplaceView() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [tab, setTab] = useState<'overview' | 'orders' | 'listings'>('overview');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'ALL'>('ALL');
  const [connectModal, setConnectModal] = useState<Platform | null>(null);
  const [syncing, setSyncing] = useState<Platform | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnectPlatform, setDisconnectPlatform] = useState<Platform | null>(null);

  const loadAll = async () => {
    try {
      const [conn, dash, ord, list] = await Promise.all([
        apiFetch<Connection[]>('/marketplace/connections'),
        apiFetch<DashboardData>('/marketplace/dashboard'),
        apiFetch<{ orders?: Order[] }>('/marketplace/orders'),
        apiFetch<{ listings?: Listing[] }>('/marketplace/listings'),
      ]);
      setConnections(conn);
      setDashboard(dash);
      setOrders(ord.orders ?? []);
      setListings(list.listings ?? []);
    } catch {
      /* offline */
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const disconnect = (platform: Platform) => {
    setDisconnectPlatform(platform);
  };

  const confirmDisconnect = async () => {
    if (!disconnectPlatform) return;
    try {
      await apiFetch(`/marketplace/connections/${disconnectPlatform}`, { method: 'DELETE' });
      toast.success(`${PLATFORM_NAME[disconnectPlatform]} bağlantısı kesildi`);
      loadAll();
    } catch {
      toast.error('Bağlantı kesilemedi');
    } finally {
      setDisconnectPlatform(null);
    }
  };

  const sync = async (platform: Platform) => {
    setSyncing(platform);
    try {
      await apiFetch(`/marketplace/sync/${platform}`, { method: 'POST' });
      await loadAll();
    } catch {
      /* ignore */
    }
    setSyncing(null);
  };

  const fmt = (n: number) => new Intl.NumberFormat('tr-TR').format(Math.round(n));
  const fmtCur = (n: number) =>
    new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(n);

  const filteredOrders =
    platformFilter === 'ALL' ? orders : orders.filter((o) => o.platform === platformFilter);
  const filteredListings =
    platformFilter === 'ALL' ? listings : listings.filter((l) => l.platform === platformFilter);
  const connectedCount = connections.filter((c) => c.connected).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-6 h-6 text-[#606BDF] animate-spin" />
        <span className="text-sm text-[#777680]">Yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="page-title">Pazaryeri Entegrasyonu</h1>
            <p className="page-subtitle">{connectedCount}/7 platform bağlı</p>
          </div>
        </div>
        <button type="button" className="btn-secondary" onClick={loadAll}>
          <RefreshCw className="w-3.5 h-3.5" />
          Yenile
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 mb-6">
        {connections.map((conn) => (
          <div
            key={conn.platform}
            className={`card !p-5 ${
              conn.connected ? platformCardBorderClass[conn.platform] : ''
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <PlatformLogo platform={conn.platform} size="xl" />
              <span
                className={
                  conn.connected
                    ? 'badge-success text-[11px]'
                    : 'badge text-[11px] bg-gray-100 text-gray-500 ring-gray-200'
                }
              >
                {conn.connected ? 'Bağlı' : 'Bağlı Değil'}
              </span>
            </div>

            <div className="mb-1">
              <p className="font-bold">{conn.name}</p>
              <p className="text-xs text-[#777680] mt-0.5">{conn.description}</p>
            </div>

            {conn.connected && (
              <div className="my-3 p-2.5 rounded-lg bg-[#FBF8FF] border border-[#EFEDF4] text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#777680]">Mağaza ID</span>
                  <span className="text-[#46464F]">{conn.sellerId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#777680]">Son Senkron</span>
                  <span className="text-[#46464F]">
                    {conn.lastSyncAt
                      ? new Date(conn.lastSyncAt).toLocaleTimeString('tr-TR')
                      : 'Hiç'}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-3">
              {conn.connected ? (
                <>
                  <button
                    type="button"
                    className="btn-secondary flex-1 text-xs justify-center"
                    onClick={() => sync(conn.platform)}
                    disabled={syncing === conn.platform}
                  >
                    {syncing === conn.platform ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" /> Senkron...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3" /> Senkronize Et
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary px-3 text-red-500"
                    onClick={() => disconnect(conn.platform)}
                    title="Bağlantıyı kes"
                  >
                    <Link2Off className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn-primary flex-1 text-xs justify-center"
                  onClick={() => setConnectModal(conn.platform)}
                >
                  <Link2 className="w-3 h-3" /> Bağlan
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {connectedCount === 0 ? (
        <div className="text-center py-16 text-[#777680]">
          <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-base mb-2">Henüz platform bağlı değil</p>
          <p className="text-sm">Başlamak için yukarıdaki platformlardan birine bağlanın.</p>
        </div>
      ) : (
        <>
          {dashboard && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              {[
                {
                  label: 'Toplam Sipariş',
                  value: fmt(dashboard.totalOrders),
                  icon: <ShoppingBag className="w-[18px] h-[18px]" />,
                  tone: 'indigo' as const,
                },
                {
                  label: 'Toplam Gelir',
                  value: fmtCur(dashboard.totalRevenue),
                  icon: <TrendingUp className="w-[18px] h-[18px]" />,
                  tone: 'green' as const,
                },
                {
                  label: 'Bağlı Platform',
                  value: dashboard.connectedCount.toString(),
                  icon: <Link2 className="w-[18px] h-[18px]" />,
                  tone: 'orange' as const,
                },
                {
                  label: 'Aktif Listeleme',
                  value: fmt(listings.filter((l) => l.status === 'active').length),
                  icon: <Package className="w-[18px] h-[18px]" />,
                  tone: 'purple' as const,
                },
              ].map((k) => (
                <div key={k.label} className="kpi-card flex-row items-center gap-3.5 !p-5">
                  <KpiIconBox tone={k.tone}>{k.icon}</KpiIconBox>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-[#777680]">{k.label}</p>
                    <p className="kpi-value text-xl">{k.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
            <div className="tab-group p-1 bg-[#FBF8FF] rounded-xl border border-[#EFEDF4]">
              {(['overview', 'orders', 'listings'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={tab === t ? 'tab-pill tab-pill-active' : 'tab-pill !border-0'}
                >
                  {t === 'overview'
                    ? 'Genel Bakış'
                    : t === 'orders'
                      ? `Siparişler (${orders.length})`
                      : `Listeler (${listings.length})`}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {(
                [
                  'ALL',
                  'TRENDYOL',
                  'HEPSIBURADA',
                  'AMAZON_TR',
                  'N11',
                  'PTTAVM',
                  'CICEKSEPETI',
                  'PAZARAMA',
                ] as const
              ).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatformFilter(p)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                    platformFilter === p
                      ? platformFilterActiveClass[p]
                      : 'bg-white text-[#777680] border border-[#EFEDF4]'
                  }`}
                >
                  {p === 'ALL' ? 'Tümü' : PLATFORM_NAME[p]}
                </button>
              ))}
            </div>
          </div>

          {tab === 'overview' && dashboard && (
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
              <div className="card !p-5">
                <h3 className="panel-title mb-4">Platform Performansı</h3>
                {dashboard.platformStats.map((ps) => (
                  <div
                    key={ps.platform}
                    className={`mb-4 last:mb-0 p-3.5 rounded-xl bg-[#FBF8FF] border ${platformCardBorderClass[ps.platform]}`}
                  >
                    <div className="flex items-center gap-2.5 mb-3">
                      <PlatformLogo platform={ps.platform} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{PLATFORM_NAME[ps.platform]}</p>
                        <p className="text-[11px] text-[#777680]">
                          Son senkron:{' '}
                          {ps.lastSyncAt
                            ? new Date(ps.lastSyncAt).toLocaleTimeString('tr-TR')
                            : 'Hiç'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-emerald-600 font-bold">{fmtCur(ps.revenue)}</p>
                        <p className="text-[11px] text-[#777680]">gelir</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Toplam Sipariş', value: ps.orders },
                        { label: 'Yeni Sipariş', value: ps.newOrders },
                        { label: 'Ort. Sipariş', value: fmtCur(ps.revenue / (ps.orders || 1)) },
                      ].map((s) => (
                        <div
                          key={s.label}
                          className="p-2 rounded-lg bg-white border border-[#EFEDF4] text-center"
                        >
                          <p className="text-sm font-bold text-[#46464F]">{s.value}</p>
                          <p className="text-[10px] text-[#777680]">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="card !p-5">
                <h3 className="panel-title mb-4">Senkron Geçmişi</h3>
                {dashboard.recentLogs.length === 0 ? (
                  <p className="text-sm text-[#777680] text-center py-8">Henüz senkron yapılmadı</p>
                ) : (
                  dashboard.recentLogs.map((log, i) => (
                    <div key={i} className="flex items-center gap-2.5 mb-2.5 last:mb-0">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#46464F]">
                          {PLATFORM_NAME[log.platform as Platform]} · {log.action}
                        </p>
                        <p className="text-[11px] text-[#777680]">
                          {log.synced} ürün senkronize edildi
                        </p>
                      </div>
                      <p className="text-[10px] text-[#777680] shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString('tr-TR')}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === 'orders' && (
            <div className="card !p-0 overflow-hidden">
              <div className="marketplace-orders-header px-4 py-2.5 border-b border-[#EFEDF4] bg-[#FBF8FF]">
                {['Platform', 'Sipariş / Ürün', 'Adet', 'Tutar', 'Durum', 'Şehir', 'Tarih'].map(
                  (h) => (
                    <div
                      key={h}
                      className="text-[11px] font-semibold uppercase tracking-wide text-[#777680] pr-2"
                    >
                      {h}
                    </div>
                  ),
                )}
              </div>
              {filteredOrders.length === 0 && (
                <div className="py-12 text-center text-sm text-[#777680]">Sipariş bulunamadı.</div>
              )}
              {filteredOrders.map((o) => (
                <div
                  key={o.id}
                  className="marketplace-orders-row px-4 py-3 border-b border-[#EFEDF4] last:border-b-0"
                >
                  <div className="flex items-center gap-2 pr-2">
                    <PlatformLogo platform={o.platform} size="sm" />
                    <span className="text-[11px] text-[#777680]">{PLATFORM_LOGO[o.platform]}</span>
                  </div>
                  <div className="pr-2 min-w-0">
                    <p className="text-xs font-semibold font-mono text-[#606BDF]">{o.orderNo}</p>
                    <p className="text-sm mt-0.5 truncate">{o.product}</p>
                    <p className="text-[11px] text-[#777680] truncate">{o.customer}</p>
                  </div>
                  <p className="text-sm text-[#46464F] pr-2">×{o.qty}</p>
                  <p className="text-sm font-semibold pr-2">{fmtCur(o.price * o.qty)}</p>
                  <div className="pr-2">
                    <OrderStatusBadge status={o.status} />
                  </div>
                  <p className="text-xs text-[#46464F] pr-2">{o.city}</p>
                  <p className="text-[11px] text-[#777680]">
                    {new Date(o.createdAt).toLocaleDateString('tr-TR')}
                  </p>
                </div>
              ))}
            </div>
          )}

          {tab === 'listings' && (
            <div className="card !p-0 overflow-hidden">
              <div className="marketplace-listings-header px-4 py-2.5 border-b border-[#EFEDF4] bg-[#FBF8FF]">
                {[
                  'Platform',
                  'Ürün',
                  'Fiyat',
                  'Stok',
                  'Durum',
                  'Görüntüleme',
                  '30g Satış',
                  'Rating',
                ].map((h) => (
                  <div
                    key={h}
                    className="text-[11px] font-semibold uppercase tracking-wide text-[#777680] pr-2"
                  >
                    {h}
                  </div>
                ))}
              </div>
              {filteredListings.length === 0 && (
                <div className="py-12 text-center text-sm text-[#777680]">
                  Listeleme bulunamadı.
                </div>
              )}
              {filteredListings.map((l) => (
                <div
                  key={l.id}
                  className="marketplace-listings-row px-4 py-3 border-b border-[#EFEDF4] last:border-b-0"
                >
                  <PlatformLogo platform={l.platform} size="md" />
                  <div className="pr-2 min-w-0">
                    <p className="text-sm font-medium truncate">{l.productName}</p>
                    <p className="text-[11px] text-[#777680] truncate">
                      {l.productCode} · #{l.listingId}
                    </p>
                  </div>
                  <p className="text-sm pr-2">{fmtCur(l.price)}</p>
                  <p
                    className={`text-sm font-semibold pr-2 ${
                      l.stock < 10 ? 'text-orange-500' : 'text-emerald-600'
                    }`}
                  >
                    {fmt(l.stock)}
                  </p>
                  <div className="pr-2">
                    <span
                      className={
                        l.status === 'active' ? 'badge-success text-[11px]' : 'badge text-[11px]'
                      }
                    >
                      {l.status === 'active' ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                  <p className="text-xs text-[#46464F] pr-2">{fmt(l.views)}</p>
                  <p className="text-sm font-semibold text-[#606BDF] pr-2">{l.sales30d}</p>
                  <p className="text-xs text-amber-500">
                    ★ {l.rating} ({l.reviewCount})
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {connectModal && (
        <ConnectModal
          platform={connectModal}
          onClose={() => setConnectModal(null)}
          onConnect={loadAll}
        />
      )}

      <ConfirmDialog
        open={disconnectPlatform !== null}
        title="Bağlantıyı Kes"
        message={`${disconnectPlatform ? PLATFORM_NAME[disconnectPlatform] : ''} bağlantısını kesmek istediğinize emin misiniz?`}
        confirmLabel="Bağlantıyı Kes"
        variant="danger"
        onConfirm={confirmDisconnect}
        onCancel={() => setDisconnectPlatform(null)}
      />
    </div>
  );
}
