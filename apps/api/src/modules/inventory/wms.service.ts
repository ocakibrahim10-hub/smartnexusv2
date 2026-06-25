import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WmsService {
  constructor(private prisma: PrismaService) {}

  // ─── LOKASYONLAR ─────────────────────────────────────────────────────

  async getLocations(tenantId: string, query: any = {}) {
    const { warehouseId } = query;
    const where: any = { tenantId, isActive: true };
    if (warehouseId) where.warehouseId = warehouseId;

    return this.prisma.warehouseLocation.findMany({
      where,
      include: {
        warehouse: { select: { id: true, name: true } },
        _count: { select: { stockItems: true } },
      },
      orderBy: [{ warehouseId: 'asc' }, { code: 'asc' }],
    });
  }

  async createLocation(tenantId: string, dto: any) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, tenantId },
    });
    if (!warehouse) throw new NotFoundException('Depo bulunamadı');

    return this.prisma.warehouseLocation.create({
      data: {
        tenantId,
        warehouseId: dto.warehouseId,
        code: dto.code,
        label: dto.label,
        type: dto.type || 'SHELF',
        aisle: dto.aisle,
        rack: dto.rack,
        level: dto.level,
      },
    });
  }

  async bulkCreateLocations(tenantId: string, dto: any) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, tenantId },
    });
    if (!warehouse) throw new NotFoundException('Depo bulunamadı');

    const aisles = dto.aisles || 3;   // Koridor sayısı
    const racks = dto.racks || 5;     // Her koridordaki raf sayısı
    const levels = dto.levels || 3;   // Her raftaki bölme/kat

    const locations: any[] = [];
    for (let a = 1; a <= aisles; a++) {
      for (let r = 1; r <= racks; r++) {
        for (let l = 1; l <= levels; l++) {
          const aisle = String.fromCharCode(64 + a); // A, B, C...
          const code = `${aisle}-${String(r).padStart(2, '0')}-${String(l).padStart(2, '0')}`;
          locations.push({
            tenantId,
            warehouseId: dto.warehouseId,
            code,
            label: `${aisle} Koridoru Raf ${r} Bölme ${l}`,
            type: 'SHELF',
            aisle,
            rack: String(r),
            level: String(l),
          });
        }
      }
    }

    const created = await this.prisma.warehouseLocation.createMany({
      data: locations,
      skipDuplicates: true,
    });

    return { message: `${created.count} lokasyon oluşturuldu`, count: created.count };
  }

  // ─── BARKOD TARAMA ───────────────────────────────────────────────────

  async scanBarcode(tenantId: string, barcode: string) {
    // Ürün barkodundan arama
    const product = await this.prisma.product.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        OR: [
          { barcode },
          { code: barcode },
        ],
      },
      include: {
        productUnits: true,
        stockItems: {
          where: { tenantId },
          include: {
            warehouse: { select: { id: true, name: true } },
            location: { select: { id: true, code: true, label: true } },
          },
        },
      },
    });

    if (!product) {
      // Lokasyon barkodu olabilir mi?
      const location = await this.prisma.warehouseLocation.findFirst({
        where: { code: barcode, tenantId },
        include: {
          warehouse: { select: { id: true, name: true } },
          stockItems: {
            include: {
              product: { select: { id: true, name: true, code: true, barcode: true, unit: true } },
            },
          },
        },
      });
      if (location) {
        return {
          type: 'LOCATION',
          location: {
            id: location.id,
            code: location.code,
            label: location.label,
            warehouse: location.warehouse,
            items: location.stockItems.map(si => ({
              productId: si.product.id,
              productName: si.product.name,
              barcode: si.product.barcode,
              quantity: si.quantity,
              unit: si.product.unit,
            })),
          },
        };
      }
      throw new NotFoundException(`Barkod bulunamadı: ${barcode}`);
    }

    return {
      type: 'PRODUCT',
      product: {
        id: product.id,
        name: product.name,
        code: product.code,
        barcode: product.barcode,
        unit: product.unit,
        salePrice: product.salePrice,
        purchasePrice: product.purchasePrice,
        stock: product.stockItems.map(si => ({
          warehouseId: si.warehouseId,
          warehouseName: si.warehouse.name,
          locationId: si.locationId,
          locationCode: si.location?.code,
          quantity: si.quantity,
        })),
        totalStock: product.stockItems.reduce((s, si) => s + si.quantity, 0),
      },
    };
  }

  // ─── BARKODLA MAL KABUL ──────────────────────────────────────────────

  async barcodeReceive(tenantId: string, userId: string, dto: any) {
    const { barcode, warehouseId, locationId, quantity } = dto;
    const product = await this.findProductByBarcode(tenantId, barcode);
    await this.validateWarehouse(tenantId, warehouseId);

    const stockItem = await this.prisma.stockItem.upsert({
      where: {
        productId_warehouseId_tenantId: {
          productId: product.id,
          warehouseId,
          tenantId,
        },
      },
      create: { tenantId, productId: product.id, warehouseId, locationId, quantity: 0 },
      update: {},
    });

    await this.prisma.$transaction([
      this.prisma.stockItem.update({
        where: { id: stockItem.id },
        data: {
          quantity: { increment: quantity },
          locationId: locationId || stockItem.locationId,
        },
      }),
      this.prisma.stockMovement.create({
        data: {
          tenantId,
          productId: product.id,
          warehouseId,
          locationId,
          type: 'IN',
          quantity,
          description: `Barkod ile mal kabul: ${product.name}`,
          userId,
        },
      }),
    ]);

    return {
      success: true,
      product: { id: product.id, name: product.name, barcode: product.barcode },
      quantity,
      message: `${quantity} ${product.unit} "${product.name}" depoya girişi yapıldı`,
    };
  }

  // ─── BARKODLA SEVKİYAT / ÇIKIŞ ──────────────────────────────────────

  async barcodeDispatch(tenantId: string, userId: string, dto: any) {
    const { barcode, warehouseId, quantity } = dto;
    const product = await this.findProductByBarcode(tenantId, barcode);
    await this.validateWarehouse(tenantId, warehouseId);

    const stockItem = await this.prisma.stockItem.findFirst({
      where: { productId: product.id, warehouseId, tenantId },
    });
    if (!stockItem || stockItem.quantity < quantity) {
      throw new BadRequestException(
        `Yetersiz stok. Mevcut: ${stockItem?.quantity ?? 0} ${product.unit}`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.stockItem.update({
        where: { id: stockItem.id },
        data: { quantity: { decrement: quantity } },
      }),
      this.prisma.stockMovement.create({
        data: {
          tenantId,
          productId: product.id,
          warehouseId,
          locationId: stockItem.locationId,
          type: 'OUT',
          quantity,
          description: `Barkod ile sevkiyat: ${product.name}`,
          userId,
        },
      }),
    ]);

    return {
      success: true,
      product: { id: product.id, name: product.name },
      quantity,
      remaining: stockItem.quantity - quantity,
      message: `${quantity} ${product.unit} "${product.name}" çıkışı yapıldı`,
    };
  }

  // ─── LOKASYON TAŞIMA ─────────────────────────────────────────────────

  async moveToLocation(tenantId: string, userId: string, dto: any) {
    const { barcode, warehouseId, fromLocationId, toLocationId, quantity } = dto;
    const product = await this.findProductByBarcode(tenantId, barcode);

    const stockItem = await this.prisma.stockItem.findFirst({
      where: { productId: product.id, warehouseId, tenantId },
    });
    if (!stockItem) throw new NotFoundException('Stok kaydı bulunamadı');

    await this.prisma.stockItem.update({
      where: { id: stockItem.id },
      data: { locationId: toLocationId },
    });

    await this.prisma.stockMovement.create({
      data: {
        tenantId,
        productId: product.id,
        warehouseId,
        locationId: toLocationId,
        type: 'ADJUST',
        quantity: 0,
        description: `Lokasyon değişikliği: ${fromLocationId || 'Bilinmiyor'} → ${toLocationId}`,
        userId,
      },
    });

    return {
      success: true,
      message: `"${product.name}" yeni lokasyona taşındı`,
    };
  }

  // ─── HIZLI SAYIM (MOBİL BARKODLA) ────────────────────────────────────

  async quickCount(tenantId: string, userId: string, dto: any) {
    const { warehouseId, items } = dto;
    await this.validateWarehouse(tenantId, warehouseId);

    const results: any[] = [];

    for (const item of items) {
      const product = await this.findProductByBarcode(tenantId, item.barcode);

      const stockItem = await this.prisma.stockItem.findFirst({
        where: { productId: product.id, warehouseId, tenantId },
      });

      const currentQty = stockItem?.quantity || 0;
      const diff = item.countedQty - currentQty;

      if (Math.abs(diff) < 0.001) {
        results.push({ product: product.name, diff: 0, action: 'EŞİT' });
        continue;
      }

      await this.prisma.$transaction([
        this.prisma.stockMovement.create({
          data: {
            tenantId,
            productId: product.id,
            warehouseId,
            type: 'COUNT',
            quantity: Math.abs(diff),
            description: `Hızlı Sayım: ${diff > 0 ? '+' : ''}${diff}`,
            userId,
          },
        }),
        stockItem
          ? this.prisma.stockItem.update({
              where: { id: stockItem.id },
              data: { quantity: item.countedQty },
            })
          : this.prisma.stockItem.create({
              data: {
                tenantId,
                productId: product.id,
                warehouseId,
                quantity: item.countedQty,
              },
            }),
      ]);

      results.push({
        product: product.name,
        before: currentQty,
        after: item.countedQty,
        diff,
        action: diff > 0 ? 'FAZLA' : 'EKSİK',
      });
    }

    return { warehouseId, processed: results.length, results };
  }

  // ─── TOPLAMA LİSTESİ (PICKİNG) ───────────────────────────────────────

  async getPickList(tenantId: string, warehouseId: string) {
    // Bekleyen siparişlerden toplama listesi oluştur
    const pendingInvoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        type: 'SALES',
        status: { in: ['APPROVED', 'DRAFT'] },
      },
      include: {
        lines: {
          include: {
            product: {
              select: { id: true, name: true, code: true, barcode: true, unit: true },
            },
          },
        },
        contact: { select: { name: true } },
      },
      orderBy: { date: 'asc' },
      take: 50,
    });

    // Ürünlerin lokasyon bilgilerini getir
    const productIds = [...new Set(pendingInvoices.flatMap(inv => inv.lines.map(l => l.productId)))];
    const stockItems = await this.prisma.stockItem.findMany({
      where: { productId: { in: productIds }, warehouseId, tenantId },
      include: {
        location: { select: { code: true, label: true, aisle: true, rack: true } },
      },
    });
    const stockMap = new Map(stockItems.map(si => [si.productId, si]));

    const pickItems = pendingInvoices.flatMap(inv =>
      inv.lines
        .filter(l => l.productId)
        .map(l => {
          const si = stockMap.get(l.productId!);
          return {
            invoiceId: inv.id,
            invoiceNumber: `${inv.series}-${inv.number}`,
            customer: inv.contact?.name,
            productId: l.productId,
            productName: l.product?.name,
            barcode: l.product?.barcode,
            unit: l.product?.unit,
            quantity: l.quantity,
            locationCode: si?.location?.code || '-',
            locationLabel: si?.location?.label || 'Konum atanmamış',
            aisle: si?.location?.aisle || '-',
            currentStock: si?.quantity || 0,
          };
        }),
    );

    // Lokasyona göre sırala (koridordan koridora yürüme optimize)
    pickItems.sort((a, b) => a.aisle.localeCompare(b.aisle) || a.locationCode.localeCompare(b.locationCode));

    return { items: pickItems, totalItems: pickItems.length };
  }

  // ─── YARDIMCI METODLAR ────────────────────────────────────────────────

  private async findProductByBarcode(tenantId: string, barcode: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        OR: [{ barcode }, { code: barcode }],
      },
    });
    if (!product) throw new NotFoundException(`Ürün bulunamadı (Barkod: ${barcode})`);
    return product;
  }

  private async validateWarehouse(tenantId: string, warehouseId: string) {
    const wh = await this.prisma.warehouse.findFirst({
      where: { id: warehouseId, tenantId },
    });
    if (!wh) throw new NotFoundException('Depo bulunamadı');
    return wh;
  }
}
