import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateWarehouseDto,
  StockMovementDto,
  CreateTransferDto,
  StockCountDto,
  CreateStockRequestDto,
} from './dto/inventory.dto';
import { convertToBaseUnit, formatQuantityWithUnit } from '../../common/unit-conversion';
import { ensureBranchProduct, requireParentTenant } from '../../common/tenant-hierarchy.util';
import { getDefaultWarehouse } from '../../common/stock.util';
import { parsePagination } from '../../common/pagination';
import { PlanLimitsService } from '../../common/plan-limits.service';

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private planLimits: PlanLimitsService,
  ) {}

  // ─── DEPOLAR ──────────────────────────────────────────────────────────────

  async getWarehouses(tenantId: string) {
    const warehouses = await this.prisma.warehouse.findMany({
      where: { tenantId },
      include: {
        _count: { select: { stockItems: true } },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    // Her depo için toplam stok değeri
    const withValues = await Promise.all(
      warehouses.map(async (w) => {
        const items = await this.prisma.stockItem.findMany({
          where: { warehouseId: w.id, tenantId },
          include: { product: { select: { purchasePrice: true, salePrice: true } } },
        });
        const stockValue = items.reduce(
          (s, si) => s + si.quantity * (si.product.purchasePrice || 0),
          0,
        );
        const totalQty = items.reduce((s, si) => s + si.quantity, 0);
        return { ...w, stockValue, totalQty };
      }),
    );

    return withValues;
  }

  async createWarehouse(tenantId: string, dto: CreateWarehouseDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Firma bulunamadı');
    await this.planLimits.assertCanAddWarehouse(tenantId, tenant.plan);

    if (dto.isDefault) {
      await this.prisma.warehouse.updateMany({ where: { tenantId }, data: { isDefault: false } });
    }
    return this.prisma.warehouse.create({
      data: {
        tenantId,
        name: dto.name,
        address: dto.address,
        city: dto.city,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async updateWarehouse(tenantId: string, id: string, dto: Partial<CreateWarehouseDto>) {
    const w = await this.prisma.warehouse.findFirst({ where: { id, tenantId } });
    if (!w) throw new NotFoundException('Depo bulunamadı');
    if (dto.isDefault) {
      await this.prisma.warehouse.updateMany({ where: { tenantId }, data: { isDefault: false } });
    }
    return this.prisma.warehouse.update({ where: { id }, data: { ...dto } });
  }

  async getWarehouseStock(tenantId: string, warehouseId: string, query: any = {}) {
    const { search } = query;
    const { page, limit, skip } = parsePagination(query);

    const where: any = { warehouseId, tenantId };
    if (search) {
      where.product = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.stockItem.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              code: true,
              barcode: true,
              unit: true,
              saleUnit: true,
              salePrice: true,
              purchasePrice: true,
              minQuantity: true,
              productUnits: true,
            },
          },
        },
        orderBy: { product: { name: 'asc' } },
      }),
      this.prisma.stockItem.count({ where }),
    ]);

    return { data: items, total };
  }

  // ─── STOK HAREKETLERİ ─────────────────────────────────────────────────────

  async getMovements(tenantId: string, query: any = {}) {
    const { productId, warehouseId, type, startDate, endDate } = query;
    const { page, limit, skip } = parsePagination(query);

    const where: any = { tenantId };
    if (productId) where.productId = productId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (type) where.type = type;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59');
    }

    const [data, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: { select: { name: true, code: true, unit: true } },
          warehouse: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return { data, total };
  }

  async addMovement(tenantId: string, userId: string, dto: StockMovementDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId },
      include: { productUnits: true },
    });
    if (!product) throw new NotFoundException('Ürün bulunamadı');
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, tenantId },
    });
    if (!warehouse) throw new NotFoundException('Depo bulunamadı');

    const inputUnit = dto.inputUnit || product.unit;
    let baseQty: number;
    try {
      baseQty = convertToBaseUnit(dto.quantity, inputUnit, product.unit, product.productUnits);
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }

    const stockItem = await this.prisma.stockItem.upsert({
      where: {
        productId_warehouseId_tenantId: {
          productId: dto.productId,
          warehouseId: dto.warehouseId,
          tenantId,
        },
      },
      create: { tenantId, productId: dto.productId, warehouseId: dto.warehouseId, quantity: 0 },
      update: {},
    });

    let quantityDelta = baseQty;
    if (dto.type === 'OUT') {
      if (stockItem.quantity < baseQty) {
        throw new BadRequestException(
          `Yetersiz stok. Mevcut: ${formatQuantityWithUnit(stockItem.quantity, product.unit)}`,
        );
      }
      quantityDelta = -baseQty;
    } else if (dto.type === 'ADJUST') {
      quantityDelta = baseQty - stockItem.quantity;
    }

    const desc =
      dto.description ||
      (dto.inputUnit && dto.inputUnit !== product.unit
        ? `Manuel ${dto.type}: ${dto.quantity} ${dto.inputUnit} (= ${formatQuantityWithUnit(baseQty, product.unit)})`
        : `Manuel ${dto.type}`);

    const [movement] = await this.prisma.$transaction([
      this.prisma.stockMovement.create({
        data: {
          tenantId,
          productId: dto.productId,
          warehouseId: dto.warehouseId,
          type: dto.type as any,
          quantity: Math.abs(quantityDelta),
          inputUnit: dto.inputUnit,
          inputQuantity: dto.inputUnit ? dto.quantity : undefined,
          unitCost: dto.unitCost || product.purchasePrice || 0,
          description: desc,
          userId,
        },
      }),
      this.prisma.stockItem.update({
        where: {
          productId_warehouseId_tenantId: {
            productId: dto.productId,
            warehouseId: dto.warehouseId,
            tenantId,
          },
        },
        data: { quantity: { increment: quantityDelta } },
      }),
    ]);

    return movement;
  }

  // ─── ANA İŞLETME STOĞU (ŞUBE GÖRÜNÜMÜ) ───────────────────────────────────

  async getParentStock(tenantId: string, query: any = {}) {
    const parentId = await requireParentTenant(this.prisma, tenantId);
    const { search } = query;
    const { page, limit, skip } = parsePagination(query, { limit: 100 });

    const parentWarehouse = await getDefaultWarehouse(this.prisma, parentId);
    if (!parentWarehouse) return { data: [], total: 0, parentId };

    const where: any = { tenantId: parentId, deletedAt: null, isActive: true, isService: false };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          productUnits: true,
          stockItems: { where: { warehouseId: parentWarehouse.id } },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    const branchProducts = await this.prisma.product.findMany({
      where: { tenantId, parentProductId: { in: products.map((p) => p.id) }, deletedAt: null },
      include: { stockItems: { where: { warehouse: { isDefault: true } } } },
    });
    const branchMap = new Map(branchProducts.map((p) => [p.parentProductId!, p]));

    return {
      parentId,
      data: products.map((p) => {
        const parentQty = p.stockItems.reduce((s, si) => s + si.quantity, 0);
        const branchMirror = branchMap.get(p.id);
        const branchQty = branchMirror?.stockItems.reduce((s, si) => s + si.quantity, 0) ?? 0;
        return {
          id: p.id,
          code: p.code,
          name: p.name,
          unit: p.unit,
          saleUnit: p.saleUnit || p.unit,
          productUnits: p.productUnits,
          parentStock: parentQty,
          branchStock: branchQty,
          branchProductId: branchMirror?.id,
          salePrice: p.salePrice,
        };
      }),
      total,
    };
  }

  // ─── ŞUBE STOK TALEBİ ─────────────────────────────────────────────────────

  async createStockRequest(tenantId: string, userId: string, dto: CreateStockRequestDto) {
    const parentId = await requireParentTenant(this.prisma, tenantId);
    if (!dto.lines?.length) throw new BadRequestException('En az bir ürün seçin');

    const resolvedLines: {
      productId: string;
      quantity: number;
      inputUnit?: string;
      inputQuantity?: number;
    }[] = [];

    for (const line of dto.lines) {
      const product = await this.prisma.product.findFirst({
        where: { id: line.productId, tenantId: parentId, deletedAt: null },
        include: { productUnits: true },
      });
      if (!product) throw new NotFoundException(`Ana işletmede ürün bulunamadı: ${line.productId}`);

      const inputUnit = line.inputUnit || product.unit;
      let baseQty: number;
      try {
        baseQty = convertToBaseUnit(line.quantity, inputUnit, product.unit, product.productUnits);
      } catch (e: any) {
        throw new BadRequestException(`${product.name}: ${e.message}`);
      }

      resolvedLines.push({
        productId: product.id,
        quantity: baseQty,
        inputUnit: line.inputUnit,
        inputQuantity: line.inputUnit ? line.quantity : undefined,
      });
    }

    return this.prisma.stockTransfer.create({
      data: {
        fromTenantId: parentId,
        toTenantId: tenantId,
        status: 'PENDING',
        isRequest: true,
        notes: dto.notes,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
        createdById: userId,
        lines: {
          create: resolvedLines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            inputUnit: l.inputUnit,
            inputQuantity: l.inputQuantity,
          })),
        },
      },
      include: {
        lines: { include: { product: { select: { name: true, code: true, unit: true } } } },
      },
    });
  }

  // ─── STOK SAYIMI ──────────────────────────────────────────────────────────

  async doStockCount(tenantId: string, userId: string, dto: StockCountDto) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, tenantId },
    });
    if (!warehouse) throw new NotFoundException('Depo bulunamadı');

    const results: any[] = [];

    for (const line of dto.lines) {
      const stockItem = await this.prisma.stockItem.findFirst({
        where: { productId: line.productId, warehouseId: dto.warehouseId, tenantId },
      });

      const currentQty = stockItem?.quantity || 0;
      const diff = line.countedQty - currentQty;

      if (Math.abs(diff) < 0.001) {
        results.push({ productId: line.productId, diff: 0, action: 'NO_CHANGE' });
        continue;
      }

      await this.prisma.$transaction([
        this.prisma.stockMovement.create({
          data: {
            tenantId,
            productId: line.productId,
            warehouseId: dto.warehouseId,
            type: 'COUNT',
            quantity: Math.abs(diff),
            description: `Sayım farkı: ${diff > 0 ? '+' : ''}${diff}`,
            userId,
          },
        }),
        stockItem
          ? this.prisma.stockItem.update({
              where: {
                productId_warehouseId_tenantId: {
                  productId: line.productId,
                  warehouseId: dto.warehouseId,
                  tenantId,
                },
              },
              data: { quantity: line.countedQty },
            })
          : this.prisma.stockItem.create({
              data: {
                tenantId,
                productId: line.productId,
                warehouseId: dto.warehouseId,
                quantity: line.countedQty,
              },
            }),
      ]);

      results.push({
        productId: line.productId,
        before: currentQty,
        after: line.countedQty,
        diff,
        action: diff > 0 ? 'INCREASE' : 'DECREASE',
      });
    }

    return { warehouseId: dto.warehouseId, processedLines: results.length, results };
  }

  // ─── TRANSFER EMİRLERİ ────────────────────────────────────────────────────

  async getTransfers(tenantId: string, query: any = {}) {
    const { status } = query;
    const { page, limit, skip } = parsePagination(query, { limit: 20 });

    const where: any = {
      OR: [{ fromTenantId: tenantId }, { toTenantId: tenantId }],
    };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.stockTransfer.findMany({
        where,
        skip,
        take: limit,
        include: {
          lines: {
            include: { product: { select: { name: true, code: true, unit: true } } },
          },
        },
        orderBy: { requestedAt: 'desc' },
      }),
      this.prisma.stockTransfer.count({ where }),
    ]);

    // Tenant bilgileri ekle
    const tenantIds = [...new Set(data.flatMap((t) => [t.fromTenantId, t.toTenantId]))];
    const tenants = await this.prisma.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, name: true },
    });
    const tenantMap = Object.fromEntries(tenants.map((t) => [t.id, t.name]));

    return {
      data: data.map((t) => ({
        ...t,
        fromTenantName: tenantMap[t.fromTenantId] || t.fromTenantId,
        toTenantName: tenantMap[t.toTenantId] || t.toTenantId,
        direction: t.fromTenantId === tenantId ? 'OUT' : 'IN',
        isRequest: t.isRequest,
      })),
      total,
    };
  }

  async createTransfer(tenantId: string, userId: string, dto: CreateTransferDto) {
    const fromWarehouse = await this.prisma.warehouse.findFirst({
      where: { tenantId, isDefault: true },
    });
    if (!fromWarehouse) throw new BadRequestException('Gönderen depo bulunamadı');

    const resolvedLines: {
      productId: string;
      quantity: number;
      inputUnit?: string;
      inputQuantity?: number;
    }[] = [];

    for (const line of dto.lines) {
      const product = await this.prisma.product.findFirst({
        where: { id: line.productId, tenantId },
        include: { productUnits: true },
      });
      if (!product) throw new NotFoundException('Ürün bulunamadı');

      const inputUnit = line.inputUnit || product.unit;
      let baseQty: number;
      try {
        baseQty = convertToBaseUnit(line.quantity, inputUnit, product.unit, product.productUnits);
      } catch (e: any) {
        throw new BadRequestException(`${product.name}: ${e.message}`);
      }

      const si = await this.prisma.stockItem.findFirst({
        where: { productId: line.productId, warehouseId: fromWarehouse.id, tenantId },
      });
      if (!si || si.quantity < baseQty) {
        throw new BadRequestException(
          `Yetersiz stok: ${product.name}. Mevcut: ${formatQuantityWithUnit(si?.quantity ?? 0, product.unit)}`,
        );
      }

      resolvedLines.push({
        productId: line.productId,
        quantity: baseQty,
        inputUnit: line.inputUnit,
        inputQuantity: line.inputUnit ? line.quantity : undefined,
      });
    }

    const transfer = await this.prisma.stockTransfer.create({
      data: {
        fromTenantId: tenantId,
        toTenantId: dto.toTenantId,
        status: 'PENDING',
        isRequest: false,
        notes: dto.notes,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
        createdById: userId,
        lines: {
          create: resolvedLines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            inputUnit: l.inputUnit,
            inputQuantity: l.inputQuantity,
          })),
        },
      },
      include: { lines: true },
    });

    return transfer;
  }

  async approveTransfer(tenantId: string, id: string) {
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: { id },
      include: { lines: true },
    });
    if (!transfer) throw new NotFoundException('Transfer emri bulunamadı');
    if (transfer.status !== 'PENDING') throw new BadRequestException('Bu transfer onaylanamaz');

    // Stok talebi: sadece ana işletme onaylayabilir
    if (transfer.isRequest && transfer.fromTenantId !== tenantId) {
      throw new ForbiddenException('Stok talebini yalnızca ana işletme onaylayabilir');
    }

    // Onay öncesi ana depoda stok kontrolü
    if (transfer.isRequest) {
      const fromWarehouse = await getDefaultWarehouse(this.prisma, transfer.fromTenantId);
      if (!fromWarehouse) throw new BadRequestException('Ana işletme deposu bulunamadı');
      for (const line of transfer.lines) {
        const si = await this.prisma.stockItem.findFirst({
          where: {
            productId: line.productId,
            warehouseId: fromWarehouse.id,
            tenantId: transfer.fromTenantId,
          },
          include: { product: true },
        });
        if (!si || si.quantity < line.quantity) {
          throw new BadRequestException(
            `Onay için yetersiz stok: ${si?.product?.name || line.productId}`,
          );
        }
      }
    }

    return this.prisma.stockTransfer.update({
      where: { id },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });
  }

  async shipTransfer(tenantId: string, id: string, userId: string) {
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: { id, fromTenantId: tenantId },
      include: { lines: true },
    });
    if (!transfer) throw new NotFoundException('Transfer emri bulunamadı');
    if (!['APPROVED', 'PENDING'].includes(transfer.status))
      throw new BadRequestException('Bu transfer sevk edilemez');

    const fromWarehouse = await getDefaultWarehouse(this.prisma, tenantId);
    if (!fromWarehouse) throw new BadRequestException('Gönderen depo bulunamadı');

    for (const line of transfer.lines) {
      const si = await this.prisma.stockItem.findFirst({
        where: { productId: line.productId, warehouseId: fromWarehouse.id, tenantId },
        include: { product: true },
      });
      if (!si || si.quantity < line.quantity) {
        throw new BadRequestException(
          `Sevkiyat için yetersiz stok: ${si?.product?.name || line.productId}`,
        );
      }
    }

    await this.prisma.$transaction([
      ...transfer.lines.map((line) =>
        this.prisma.stockItem.updateMany({
          where: { productId: line.productId, warehouseId: fromWarehouse.id, tenantId },
          data: { quantity: { decrement: line.quantity } },
        }),
      ),
      ...transfer.lines.map((line) =>
        this.prisma.stockMovement.create({
          data: {
            tenantId,
            productId: line.productId,
            warehouseId: fromWarehouse.id,
            type: 'OUT',
            quantity: line.quantity,
            inputUnit: line.inputUnit,
            inputQuantity: line.inputQuantity,
            description: transfer.isRequest
              ? `Stok talebi sevkiyatı #${id.slice(-6)}`
              : `Transfer sevkiyatı #${id.slice(-6)}`,
            userId,
          },
        }),
      ),
      this.prisma.stockTransfer.update({
        where: { id },
        data: { status: 'SHIPPED', shippedAt: new Date() },
      }),
    ]);

    return { message: 'Transfer sevk edildi' };
  }

  async receiveTransfer(tenantId: string, id: string, userId: string) {
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: { id, toTenantId: tenantId },
      include: { lines: { include: { product: true } } },
    });
    if (!transfer) throw new NotFoundException('Transfer emri bulunamadı');
    if (transfer.status !== 'SHIPPED')
      throw new BadRequestException('Transfer henüz sevk edilmedi');

    const toWarehouse = await getDefaultWarehouse(this.prisma, tenantId);
    if (!toWarehouse) throw new BadRequestException('Alıcı depo bulunamadı');

    const resolvedLines: { localProductId: string; line: (typeof transfer.lines)[0] }[] = [];
    for (const line of transfer.lines) {
      let localProductId = line.productId;
      if (transfer.fromTenantId !== tenantId) {
        const branchProduct = await ensureBranchProduct(this.prisma, tenantId, line.productId);
        localProductId = branchProduct.id;
      }
      resolvedLines.push({ localProductId, line });
    }

    await this.prisma.$transaction([
      ...resolvedLines.flatMap(({ localProductId, line }) => [
        this.prisma.stockItem.upsert({
          where: {
            productId_warehouseId_tenantId: {
              productId: localProductId,
              warehouseId: toWarehouse.id,
              tenantId,
            },
          },
          create: {
            tenantId,
            productId: localProductId,
            warehouseId: toWarehouse.id,
            quantity: line.quantity,
          },
          update: { quantity: { increment: line.quantity } },
        }),
        this.prisma.stockMovement.create({
          data: {
            tenantId,
            productId: localProductId,
            warehouseId: toWarehouse.id,
            type: 'IN',
            quantity: line.quantity,
            inputUnit: line.inputUnit,
            inputQuantity: line.inputQuantity,
            description: transfer.isRequest
              ? `Stok talebi teslim alındı #${id.slice(-6)}`
              : `Transfer alındı #${id.slice(-6)}`,
            userId,
          },
        }),
        this.prisma.product.update({
          where: { id: localProductId },
          data: { isActive: true },
        }),
      ]),
      this.prisma.stockTransfer.update({
        where: { id },
        data: { status: 'RECEIVED', receivedAt: new Date() },
      }),
    ]);

    return { message: 'Transfer alındı, ürünler satışa açıldı' };
  }

  async cancelTransfer(tenantId: string, id: string) {
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: { id, OR: [{ fromTenantId: tenantId }, { toTenantId: tenantId }] },
    });
    if (!transfer) throw new NotFoundException('Transfer emri bulunamadı');
    if (['RECEIVED', 'CANCELLED'].includes(transfer.status))
      throw new BadRequestException('Bu transfer iptal edilemez');

    return this.prisma.stockTransfer.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  // ─── DÜŞÜK STOK ─────────────────────────────────────────────────────────

  async getLowStockItems(tenantId: string) {
    const items = await this.prisma.stockItem.findMany({
      where: { tenantId, minQuantity: { gt: 0 } },
      include: {
        product: { select: { id: true, name: true, code: true, unit: true } },
        warehouse: { select: { id: true, name: true } },
      },
    });

    return items
      .filter((si) => si.quantity <= si.minQuantity)
      .map((si) => ({
        productId: si.productId,
        productName: si.product.name,
        sku: si.product.code,
        unit: si.product.unit,
        warehouseId: si.warehouseId,
        warehouseName: si.warehouse.name,
        quantity: si.quantity,
        minQuantity: si.minQuantity,
        deficit: si.minQuantity - si.quantity,
      }))
      .sort((a, b) => b.deficit - a.deficit);
  }

  // ─── ALT-KİRA KİRALAYICI METRİKLER ──────────────────────────────────────

  async getDashboardMetrics(tenantId: string) {
    const [totalProducts, totalWarehouses, lowStockCount, pendingTransfers] = await Promise.all([
      this.prisma.product.count({ where: { tenantId, isActive: true, deletedAt: null } }),
      this.prisma.warehouse.count({ where: { tenantId } }),
      this.prisma.stockItem
        .count({
          where: {
            tenantId,
            minQuantity: { gt: 0 },
            AND: [{ quantity: { lte: this.prisma.stockItem.fields.minQuantity } }],
          },
        })
        .catch(() => 0),
      this.prisma.stockTransfer.count({
        where: {
          OR: [{ fromTenantId: tenantId }, { toTenantId: tenantId }],
          status: { in: ['PENDING', 'APPROVED', 'SHIPPED'] },
        },
      }),
    ]);

    const stockValue = await this.prisma.stockItem
      .findMany({
        where: { tenantId },
        include: { product: { select: { purchasePrice: true } } },
      })
      .then((items) =>
        items.reduce((s, si) => s + si.quantity * (si.product.purchasePrice || 0), 0),
      );

    const recentMovements = await this.prisma.stockMovement.findMany({
      where: { tenantId },
      take: 10,
      include: {
        product: { select: { name: true, unit: true } },
        warehouse: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      totalProducts,
      totalWarehouses,
      lowStockCount,
      pendingTransfers,
      stockValue,
      recentMovements,
    };
  }

  // ─── AI TALep TAHMİNİ ─────────────────────────────────────────────────────

  async getForecast(tenantId: string) {
    const since = new Date();
    since.setDate(since.getDate() - 90);

    // Son 90 günün OUT hareketlerini ürün bazında topla
    const movements = await this.prisma.stockMovement.groupBy({
      by: ['productId'],
      where: {
        tenantId,
        type: { in: ['OUT', 'TRANSFER_OUT'] },
        createdAt: { gte: since },
      },
      _sum: { quantity: true },
      _count: { id: true },
    });

    // Mevcut stok seviyelerini çek
    const stockItems = await this.prisma.stockItem.findMany({
      where: { tenantId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            code: true,
            unit: true,
            salePrice: true,
            purchasePrice: true,
            minQuantity: true,
          },
        },
        warehouse: { select: { name: true } },
      },
    });

    // Ürün bazında stok toplamı
    const stockMap = new Map<string, { quantity: number; product: any; warehouses: string[] }>();
    for (const si of stockItems) {
      const existing = stockMap.get(si.productId);
      if (existing) {
        existing.quantity += si.quantity;
        existing.warehouses.push(si.warehouse.name);
      } else {
        stockMap.set(si.productId, {
          quantity: si.quantity,
          product: si.product,
          warehouses: [si.warehouse.name],
        });
      }
    }

    // Son 30 ve 60 gün hareketleri (trend hesabı için)
    const since30 = new Date();
    since30.setDate(since30.getDate() - 30);
    const since60 = new Date();
    since60.setDate(since60.getDate() - 60);

    const movements30 = await this.prisma.stockMovement.groupBy({
      by: ['productId'],
      where: { tenantId, type: { in: ['OUT', 'TRANSFER_OUT'] }, createdAt: { gte: since30 } },
      _sum: { quantity: true },
    });
    const movements60 = await this.prisma.stockMovement.groupBy({
      by: ['productId'],
      where: {
        tenantId,
        type: { in: ['OUT', 'TRANSFER_OUT'] },
        createdAt: { gte: since60, lt: since30 },
      },
      _sum: { quantity: true },
    });

    const map30 = new Map(movements30.map((m) => [m.productId, m._sum.quantity ?? 0]));
    const map60 = new Map(movements60.map((m) => [m.productId, m._sum.quantity ?? 0]));

    const forecasts = movements.map((m) => {
      const totalOut = m._sum.quantity ?? 0;
      const avgDailyDemand = totalOut / 90;
      const stock = stockMap.get(m.productId);
      const currentStock = stock?.quantity ?? 0;

      const daysRemaining = avgDailyDemand > 0 ? Math.floor(currentStock / avgDailyDemand) : 999;
      const reorderQty = Math.ceil(avgDailyDemand * 30); // 30 günlük tampon
      const reorderPoint = Math.ceil(avgDailyDemand * 7); // 7 günlük güvenlik stoğu

      const last30 = map30.get(m.productId) ?? 0;
      const prev30 = map60.get(m.productId) ?? 0;
      const trendPct = prev30 > 0 ? ((last30 - prev30) / prev30) * 100 : 0;
      const trend: 'up' | 'down' | 'stable' =
        trendPct > 10 ? 'up' : trendPct < -10 ? 'down' : 'stable';

      // Aciliyet skoru (0-100)
      let urgency = 0;
      if (daysRemaining <= 0) urgency = 100;
      else if (daysRemaining <= 3) urgency = 90;
      else if (daysRemaining <= 7) urgency = 75;
      else if (daysRemaining <= 14) urgency = 50;
      else if (daysRemaining <= 30) urgency = 25;
      else urgency = 5;

      // Trend etkisi
      if (trend === 'up') urgency = Math.min(100, urgency + 15);

      // Güven skoru (hareket sayısına göre)
      const txCount = m._count.id ?? 0;
      const confidence = Math.min(95, 40 + txCount * 5);

      return {
        productId: m.productId,
        productName: stock?.product?.name ?? 'Bilinmeyen Ürün',
        productCode: stock?.product?.code ?? '-',
        unit: stock?.product?.unit ?? 'ADET',
        salePrice: stock?.product?.salePrice ?? 0,
        purchasePrice: stock?.product?.purchasePrice ?? 0,
        warehouses: stock?.warehouses ?? [],
        currentStock,
        minQuantity: stock?.product?.minQuantity ?? 0,
        avgDailyDemand: Math.round(avgDailyDemand * 100) / 100,
        totalOut90d: totalOut,
        last30dOut: last30,
        prev30dOut: prev30,
        daysRemaining,
        reorderPoint,
        reorderQty,
        trend,
        trendPct: Math.round(trendPct),
        urgency,
        confidence,
        estimatedCost: reorderQty * (stock?.product?.purchasePrice ?? 0),
        needsReorder: currentStock <= reorderPoint,
      };
    });

    // Aciliyete göre sırala, hareket olmayan ürünleri de kontrol et
    const sorted = forecasts.sort((a, b) => b.urgency - a.urgency);

    // Özet istatistikler
    const critical = sorted.filter((f) => f.urgency >= 75).length;
    const warning = sorted.filter((f) => f.urgency >= 25 && f.urgency < 75).length;
    const needsReorder = sorted.filter((f) => f.needsReorder).length;
    const totalEstimatedCost = sorted
      .filter((f) => f.needsReorder)
      .reduce((s, f) => s + f.estimatedCost, 0);

    return {
      summary: {
        critical,
        warning,
        needsReorder,
        totalEstimatedCost,
        analyzedProducts: sorted.length,
      },
      forecasts: sorted,
      generatedAt: new Date().toISOString(),
    };
  }
}
