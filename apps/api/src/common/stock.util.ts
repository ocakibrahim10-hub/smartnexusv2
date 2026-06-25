import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { convertToBaseUnit, formatQuantityWithUnit, ProductUnitLike } from './unit-conversion';

type ProductWithUnits = {
  id: string;
  name: string;
  unit: string;
  saleUnit?: string | null;
  isService?: boolean;
  type?: string;
  productUnits?: ProductUnitLike[];
};

export async function getDefaultWarehouse(prisma: PrismaService, tenantId: string) {
  return prisma.warehouse.findFirst({
    where: { tenantId, isDefault: true, isActive: true },
  });
}

export async function getProductStock(
  prisma: PrismaService,
  tenantId: string,
  productId: string,
  warehouseId?: string,
): Promise<number> {
  const whId = warehouseId ?? (await getDefaultWarehouse(prisma, tenantId))?.id;
  if (!whId) return 0;
  const item = await prisma.stockItem.findFirst({
    where: { tenantId, productId, warehouseId: whId },
  });
  return item?.quantity ?? 0;
}

export function resolveSaleQuantityInBase(
  product: ProductWithUnits,
  quantity: number,
  saleUnit?: string,
): { baseQty: number; inputUnit?: string; inputQuantity?: number } {
  if (product.isService || product.type === 'SERVICE') {
    return { baseQty: quantity };
  }
  const unit = saleUnit || product.saleUnit || product.unit;
  const baseQty = convertToBaseUnit(quantity, unit, product.unit, product.productUnits || []);
  return {
    baseQty,
    inputUnit: unit !== product.unit ? unit : undefined,
    inputQuantity: unit !== product.unit ? quantity : undefined,
  };
}

export async function assertSufficientStock(
  prisma: PrismaService,
  tenantId: string,
  product: ProductWithUnits,
  requiredBaseQty: number,
  warehouseId?: string,
) {
  if (product.isService || product.type === 'SERVICE') return;
  const available = await getProductStock(prisma, tenantId, product.id, warehouseId);
  if (available < requiredBaseQty - 0.0001) {
    throw new BadRequestException(
      `Yetersiz stok: ${product.name}. Mevcut: ${formatQuantityWithUnit(available, product.unit)}`,
    );
  }
}

export async function decrementStock(
  prisma: PrismaService,
  tenantId: string,
  productId: string,
  baseQuantity: number,
  opts: {
    warehouseId?: string;
    reference?: string;
    description?: string;
    userId?: string;
    inputUnit?: string;
    inputQuantity?: number;
    unitCost?: number;
  } = {},
) {
  const warehouse = opts.warehouseId
    ? await prisma.warehouse.findFirst({ where: { id: opts.warehouseId, tenantId } })
    : await getDefaultWarehouse(prisma, tenantId);
  if (!warehouse) return;

  await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        tenantId,
        productId,
        warehouseId: warehouse.id,
        type: 'OUT',
        quantity: baseQuantity,
        inputUnit: opts.inputUnit,
        inputQuantity: opts.inputQuantity,
        unitCost: opts.unitCost,
        reference: opts.reference,
        description: opts.description || 'Stok çıkışı',
        userId: opts.userId,
      },
    }),
    prisma.stockItem.upsert({
      where: {
        productId_warehouseId_tenantId: {
          productId,
          warehouseId: warehouse.id,
          tenantId,
        },
      },
      create: { tenantId, productId, warehouseId: warehouse.id, quantity: 0 },
      update: { quantity: { decrement: baseQuantity } },
    }),
  ]);
}

export async function incrementStock(
  prisma: PrismaService,
  tenantId: string,
  productId: string,
  baseQuantity: number,
  opts: {
    warehouseId?: string;
    reference?: string;
    description?: string;
    userId?: string;
    inputUnit?: string;
    inputQuantity?: number;
    unitCost?: number;
  } = {},
) {
  const warehouse = opts.warehouseId
    ? await prisma.warehouse.findFirst({ where: { id: opts.warehouseId, tenantId } })
    : await getDefaultWarehouse(prisma, tenantId);
  if (!warehouse) return;

  await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        tenantId,
        productId,
        warehouseId: warehouse.id,
        type: 'IN',
        quantity: baseQuantity,
        inputUnit: opts.inputUnit,
        inputQuantity: opts.inputQuantity,
        unitCost: opts.unitCost,
        reference: opts.reference,
        description: opts.description || 'Stok girişi',
        userId: opts.userId,
      },
    }),
    prisma.stockItem.upsert({
      where: {
        productId_warehouseId_tenantId: {
          productId,
          warehouseId: warehouse.id,
          tenantId,
        },
      },
      create: { tenantId, productId, warehouseId: warehouse.id, quantity: baseQuantity },
      update: { quantity: { increment: baseQuantity } },
    }),
  ]);
}
