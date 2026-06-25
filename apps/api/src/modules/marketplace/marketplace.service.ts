import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type MarketplacePlatform =
  | 'TRENDYOL'
  | 'HEPSIBURADA'
  | 'AMAZON_TR'
  | 'N11'
  | 'PTTAVM'
  | 'CICEKSEPETI'
  | 'PAZARAMA';

interface MockConnection {
  tenantId: string;
  platform: MarketplacePlatform;
  apiKey: string;
  sellerId: string;
  isActive: boolean;
  connectedAt: string;
  lastSyncAt: string | null;
}

// In-memory store (production'da DB'ye taşınır)
const connections = new Map<string, MockConnection>();
const syncLogs = new Map<string, any[]>();

function mockOrders(platform: MarketplacePlatform, count = 8) {
  const statuses = ['Yeni', 'Hazırlanıyor', 'Kargoda', 'Teslim Edildi', 'İptal'];
  const products = [
    'Bluetooth Kulaklık Pro',
    'Akıllı Saat Ultra',
    'Kablosuz Şarj Standı',
    'USB-C Hub 7 Port',
    'LED Masa Lambası',
    'Oyuncu Mouse Pad XL',
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: `${platform.slice(0, 3)}-${Date.now()}-${i}`,
    platform,
    orderNo: `${{ TRENDYOL: 'TY', HEPSIBURADA: 'HB', AMAZON_TR: 'AZ', N11: 'N11', PTTAVM: 'PTT', CICEKSEPETI: 'CS', PAZARAMA: 'PZ' }[platform] ?? 'MK'}-${Math.floor(100000 + Math.random() * 900000)}`,
    product: products[Math.floor(Math.random() * products.length)],
    qty: Math.floor(1 + Math.random() * 5),
    price: Math.floor(299 + Math.random() * 2000),
    status: statuses[Math.floor(Math.random() * statuses.length)],
    customer: `Müşteri ${i + 1}`,
    city: ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya'][i % 5],
    createdAt: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
  }));
}

function mockListings(platform: MarketplacePlatform, count = 10) {
  const products = [
    { name: 'Bluetooth Kulaklık Pro', code: 'BT-001' },
    { name: 'Akıllı Saat Ultra', code: 'SW-002' },
    { name: 'Kablosuz Şarj Standı', code: 'WC-003' },
    { name: 'USB-C Hub 7 Port', code: 'HUB-004' },
    { name: 'LED Masa Lambası', code: 'LED-005' },
    { name: 'Oyuncu Mouse Pad XL', code: 'MP-006' },
    { name: 'Mekanik Klavye RGB', code: 'KB-007' },
    { name: 'Webcam 1080p AF', code: 'CAM-008' },
    { name: 'Hoparlör 360° BT', code: 'SP-009' },
    { name: 'Harici SSD 1TB', code: 'SSD-010' },
  ].slice(0, count);

  return products.map((p, i) => ({
    id: `LST-${platform.slice(0, 2)}-${i}`,
    platform,
    productCode: p.code,
    productName: p.name,
    listingId: `${Math.floor(10000000 + Math.random() * 90000000)}`,
    price: Math.floor(199 + Math.random() * 3000),
    stock: Math.floor(Math.random() * 100),
    status: Math.random() > 0.2 ? 'active' : 'passive',
    views: Math.floor(Math.random() * 5000),
    sales30d: Math.floor(Math.random() * 50),
    rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
    reviewCount: Math.floor(Math.random() * 200),
    lastSynced: new Date(Date.now() - Math.random() * 3600000).toISOString(),
  }));
}

@Injectable()
export class MarketplaceService {
  constructor(private prisma: PrismaService) {}

  private getKey(tenantId: string, platform: MarketplacePlatform) {
    return `${tenantId}:${platform}`;
  }

  // ─── BAĞLANTI YÖNETİMİ ────────────────────────────────────────────────────

  getConnections(tenantId: string) {
    const platforms: MarketplacePlatform[] = [
      'TRENDYOL',
      'HEPSIBURADA',
      'AMAZON_TR',
      'N11',
      'PTTAVM',
      'CICEKSEPETI',
      'PAZARAMA',
    ];
    const platformMeta = {
      TRENDYOL: {
        name: 'Trendyol',
        color: '#f27a1a',
        icon: 'trendyol',
        description: "Türkiye'nin #1 E-Ticaret Platformu",
      },
      HEPSIBURADA: {
        name: 'Hepsiburada',
        color: '#ff6000',
        icon: 'hepsiburada',
        description: "Türkiye'nin Teknoloji Mağazası",
      },
      AMAZON_TR: {
        name: 'Amazon TR',
        color: '#ff9900',
        icon: 'amazon',
        description: 'Dünya Geneli E-Ticaret Devi',
      },
      N11: { name: 'n11', color: '#7b2d8b', icon: 'n11', description: "Doğan Grubu'nun Pazaryeri" },
      PTTAVM: {
        name: 'PttAVM',
        color: '#e30613',
        icon: 'pttavm',
        description: 'PTT Kargo Destekli Pazar Yeri',
      },
      CICEKSEPETI: {
        name: 'ÇiçekSepeti',
        color: '#e91e8c',
        icon: 'ciceksepeti',
        description: 'Çiçek & Yaşam Pazaryeri',
      },
      PAZARAMA: {
        name: 'Pazarama',
        color: '#0075be',
        icon: 'pazarama',
        description: 'Türkiye Geneli KOBİ Pazaryeri',
      },
    };

    return platforms.map((p) => {
      const conn = connections.get(this.getKey(tenantId, p));
      return {
        platform: p,
        ...platformMeta[p],
        connected: !!conn?.isActive,
        sellerId: conn?.sellerId ?? null,
        connectedAt: conn?.connectedAt ?? null,
        lastSyncAt: conn?.lastSyncAt ?? null,
      };
    });
  }

  connectPlatform(
    tenantId: string,
    platform: MarketplacePlatform,
    dto: { apiKey: string; sellerId: string; apiSecret?: string },
  ) {
    const key = this.getKey(tenantId, platform);
    connections.set(key, {
      tenantId,
      platform,
      apiKey: dto.apiKey,
      sellerId: dto.sellerId,
      isActive: true,
      connectedAt: new Date().toISOString(),
      lastSyncAt: null,
    });
    return { message: `${platform} bağlantısı başarılı`, platform, sellerId: dto.sellerId };
  }

  disconnectPlatform(tenantId: string, platform: MarketplacePlatform) {
    const key = this.getKey(tenantId, platform);
    const conn = connections.get(key);
    if (!conn) throw new NotFoundException('Bağlantı bulunamadı');
    connections.delete(key);
    return { message: `${platform} bağlantısı kesildi` };
  }

  // ─── SİPARİŞLER ──────────────────────────────────────────────────────────

  async getOrders(tenantId: string, platform?: MarketplacePlatform) {
    const ALL_PLATFORMS: MarketplacePlatform[] = [
      'TRENDYOL',
      'HEPSIBURADA',
      'AMAZON_TR',
      'N11',
      'PTTAVM',
      'CICEKSEPETI',
      'PAZARAMA',
    ];
    const platforms: MarketplacePlatform[] = platform
      ? [platform]
      : ALL_PLATFORMS.filter((p) => connections.get(this.getKey(tenantId, p))?.isActive);

    const allOrders = platforms.flatMap((p) => mockOrders(p, 8));
    allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const summary = {
      total: allOrders.length,
      new: allOrders.filter((o) => o.status === 'Yeni').length,
      preparing: allOrders.filter((o) => o.status === 'Hazırlanıyor').length,
      shipping: allOrders.filter((o) => o.status === 'Kargoda').length,
      totalRevenue: allOrders.reduce((s, o) => s + o.price * o.qty, 0),
    };

    return { summary, orders: allOrders };
  }

  // ─── ÜRÜN LİSTELEMELERİ ──────────────────────────────────────────────────

  getListings(tenantId: string, platform?: MarketplacePlatform) {
    const ALL_PLATFORMS: MarketplacePlatform[] = [
      'TRENDYOL',
      'HEPSIBURADA',
      'AMAZON_TR',
      'N11',
      'PTTAVM',
      'CICEKSEPETI',
      'PAZARAMA',
    ];
    const platforms: MarketplacePlatform[] = platform
      ? [platform]
      : ALL_PLATFORMS.filter((p) => connections.get(this.getKey(tenantId, p))?.isActive);

    const allListings = platforms.flatMap((p) => mockListings(p, 10));
    return { total: allListings.length, listings: allListings };
  }

  // ─── STOK SENKRONIZASYONU ─────────────────────────────────────────────────

  async syncStock(tenantId: string, platform: MarketplacePlatform) {
    const key = this.getKey(tenantId, platform);
    const conn = connections.get(key);
    if (!conn?.isActive) throw new NotFoundException(`${platform} bağlı değil`);

    // Simüle edilmiş stok senkronizasyonu
    await new Promise((res) => setTimeout(res, 500));

    conn.lastSyncAt = new Date().toISOString();
    connections.set(key, conn);

    const log = {
      platform,
      action: 'STOCK_SYNC',
      success: true,
      synced: Math.floor(5 + Math.random() * 20),
      errors: 0,
      timestamp: new Date().toISOString(),
    };

    const logs = syncLogs.get(tenantId) ?? [];
    logs.unshift(log);
    syncLogs.set(tenantId, logs.slice(0, 50));

    return { message: `${platform} stok senkronizasyonu tamamlandı`, ...log };
  }

  // ─── DASHBOARD ────────────────────────────────────────────────────────────

  async getDashboard(tenantId: string) {
    const ALL_PLATFORMS: MarketplacePlatform[] = [
      'TRENDYOL',
      'HEPSIBURADA',
      'AMAZON_TR',
      'N11',
      'PTTAVM',
      'CICEKSEPETI',
      'PAZARAMA',
    ];
    const connectedPlatforms = ALL_PLATFORMS.filter(
      (p) => connections.get(this.getKey(tenantId, p))?.isActive,
    );

    let totalOrders = 0;
    let totalRevenue = 0;
    let platformStats: any[] = [];

    for (const p of connectedPlatforms) {
      const orders = mockOrders(p, 8);
      const revenue = orders.reduce((s, o) => s + o.price * o.qty, 0);
      totalOrders += orders.length;
      totalRevenue += revenue;
      platformStats.push({
        platform: p,
        orders: orders.length,
        revenue,
        newOrders: orders.filter((o) => o.status === 'Yeni').length,
        lastSyncAt: connections.get(this.getKey(tenantId, p))?.lastSyncAt,
      });
    }

    const logs = syncLogs.get(tenantId) ?? [];
    return {
      connectedCount: connectedPlatforms.length,
      totalOrders,
      totalRevenue,
      platformStats,
      recentLogs: logs.slice(0, 10),
    };
  }
}
