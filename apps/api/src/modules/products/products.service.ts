import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { parsePagination } from '../../common/pagination';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: any = {}) {
    const { search, categoryId, type, isActive } = query;
    const { page, limit, skip } = parsePagination(query);

    const where: any = { tenantId, deletedAt: null };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive === 'true' || isActive === true;

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: { select: { id: true, name: true } },
          productUnits: true,
          stockItems: {
            include: { warehouse: { select: { id: true, name: true } } },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    // Toplam stok ekle
    const enriched = data.map((p) => ({
      ...p,
      totalStock: p.stockItems.reduce((s, si) => s + si.quantity, 0),
    }));

    return { data: enriched, total, page: Number(page), limit: Number(limit) };
  }

  async findOne(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        category: true,
        productUnits: true,
        stockItems: {
          include: { warehouse: true },
          orderBy: { warehouse: { name: 'asc' } },
        },
      },
    });
    if (!product) throw new NotFoundException('Ürün bulunamadı');
    return { ...product, totalStock: product.stockItems.reduce((s, si) => s + si.quantity, 0) };
  }

  async getCategories(tenantId: string) {
    return this.prisma.productCategory.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(tenantId: string, name: string) {
    return this.prisma.productCategory.create({ data: { tenantId, name } });
  }

  async create(tenantId: string, dto: CreateProductDto) {
    // Kod üret
    let code = dto.code;
    if (!code) {
      const last = await this.prisma.product.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        select: { code: true },
      });
      const num = last?.code?.match(/\d+/)?.[0];
      code = `PRD-${String(parseInt(num || '0') + 1).padStart(4, '0')}`;
    }

    // Barkod çakışma kontrolü
    if (dto.barcode) {
      const exists = await this.prisma.product.findFirst({
        where: { tenantId, barcode: dto.barcode },
      });
      if (exists) throw new ConflictException('Bu barkod zaten kullanılıyor');
    }

    const product = await this.prisma.product.create({
      data: {
        tenantId,
        code,
        name: dto.name,
        barcode: dto.barcode,
        categoryId: dto.categoryId,
        type: (dto.type as any) || 'PRODUCT',
        unit: dto.unit || 'ADET',
        saleUnit: dto.saleUnit || dto.unit || 'ADET',
        salePrice: dto.salePrice,
        purchasePrice: dto.purchasePrice || 0,
        vatRate: dto.vatRate ?? 20,
        isActive: dto.isActive ?? true,
        description: dto.description,
        imageUrl: dto.imageUrl || null,
        productUnits: dto.units?.length
          ? {
              create: dto.units.map((u) => ({
                unit: u.unit,
                factorToBase: u.factorToBase,
                isPurchaseUnit: u.isPurchaseUnit ?? false,
                isSaleUnit: u.isSaleUnit ?? false,
                barcode: u.barcode,
              })),
            }
          : undefined,
      },
      include: { productUnits: true },
    });

    // Varsayılan depoya stok kaydı oluştur
    const defaultWarehouse = await this.prisma.warehouse.findFirst({
      where: { tenantId, isDefault: true },
    });
    if (defaultWarehouse && dto.type !== 'SERVICE') {
      await this.prisma.stockItem.upsert({
        where: {
          productId_warehouseId_tenantId: {
            productId: product.id,
            warehouseId: defaultWarehouse.id,
            tenantId,
          },
        },
        create: {
          tenantId,
          productId: product.id,
          warehouseId: defaultWarehouse.id,
          quantity: 0,
          minQuantity: dto.minStock || 0,
        },
        update: {},
      });
    }

    return product;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateProductDto>) {
    await this.findOne(tenantId, id);
    const { units, minStock, ...rest } = dto;

    if (units) {
      await this.prisma.productUnit.deleteMany({ where: { productId: id } });
      await this.prisma.productUnit.createMany({
        data: units.map((u) => ({
          productId: id,
          unit: u.unit,
          factorToBase: u.factorToBase,
          isPurchaseUnit: u.isPurchaseUnit ?? false,
          isSaleUnit: u.isSaleUnit ?? false,
          barcode: u.barcode,
        })),
      });
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        name: rest.name,
        barcode: rest.barcode,
        categoryId: rest.categoryId,
        unit: rest.unit,
        saleUnit: rest.saleUnit,
        salePrice: rest.salePrice,
        purchasePrice: rest.purchasePrice,
        vatRate: rest.vatRate,
        isActive: rest.isActive,
        description: rest.description,
        imageUrl: rest.imageUrl,
      },
      include: { productUnits: true },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getMovements(tenantId: string, productId: string, query: any = {}) {
    const { page, limit, skip } = parsePagination(query, { limit: 30 });

    await this.findOne(tenantId, productId);

    const [data, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where: { tenantId, productId },
        skip,
        take: limit,
        include: { warehouse: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stockMovement.count({ where: { tenantId, productId } }),
    ]);

    return { data, total };
  }

  async getLowStock(tenantId: string) {
    const items = await this.prisma.stockItem.findMany({
      where: { tenantId },
      include: {
        product: { select: { id: true, name: true, code: true, unit: true, isActive: true } },
        warehouse: { select: { name: true } },
      },
    });
    return items
      .filter((si) => si.minQuantity > 0 && si.quantity <= si.minQuantity && si.product.isActive)
      .sort((a, b) => a.quantity / a.minQuantity - b.quantity / b.minQuantity);
  }

  /** Stok satırı autocomplete */
  async searchForPurchase(tenantId: string, q: string, limit = 12) {
    if (!q?.trim()) return [];
    return this.prisma.product.findMany({
      where: {
        tenantId,
        deletedAt: null,
        isActive: true,
        OR: [
          { name: { contains: q.trim(), mode: 'insensitive' } },
          { barcode: { contains: q.trim(), mode: 'insensitive' } },
          { code: { contains: q.trim(), mode: 'insensitive' } },
        ],
      },
      take: limit,
      select: {
        id: true,
        name: true,
        code: true,
        barcode: true,
        unit: true,
        vatRate: true,
        purchasePrice: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  private async nextInternalBarcode(tenantId: string): Promise<string> {
    const count = await this.prisma.product.count({ where: { tenantId } });
    const seq = String(count + 1).padStart(8, '0');
    return `869${seq}${String((count * 7) % 10)}`;
  }

  /** Barkodsuz ürünlere toplu barkod ata */
  async bulkGenerateBarcodes(
    tenantId: string,
    opts: { all?: boolean; categoryId?: string; productIds?: string[] },
  ) {
    const where: any = { tenantId, deletedAt: null, OR: [{ barcode: null }, { barcode: '' }] };
    if (opts.productIds?.length) where.id = { in: opts.productIds };
    else if (opts.categoryId) where.categoryId = opts.categoryId;
    else if (!opts.all) throw new ConflictException('Ürün, kategori veya tüm stok seçilmeli');

    const products = await this.prisma.product.findMany({
      where,
      select: { id: true, name: true, code: true, barcode: true },
      orderBy: { createdAt: 'asc' },
    });

    const updated: Array<{ id: string; name: string; barcode: string }> = [];
    for (const p of products) {
      const barcode = await this.nextInternalBarcode(tenantId);
      await this.prisma.product.update({ where: { id: p.id }, data: { barcode } });
      updated.push({ id: p.id, name: p.name, barcode });
    }
    return { count: updated.length, products: updated };
  }

  /** Barkod etiketi basım verisi */
  async getBarcodeLabels(
    tenantId: string,
    opts: { all?: boolean; categoryId?: string; productIds?: string[]; onlyMissing?: boolean },
  ) {
    const where: any = { tenantId, deletedAt: null, isActive: true };
    if (opts.productIds?.length) where.id = { in: opts.productIds };
    else if (opts.categoryId) where.categoryId = opts.categoryId;
    if (opts.onlyMissing) where.OR = [{ barcode: null }, { barcode: '' }];

    const products = await this.prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        code: true,
        barcode: true,
        unit: true,
        salePrice: true,
        category: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
      take: 500,
    });

    return products.filter((p) => p.barcode || !opts.onlyMissing);
  }
}
