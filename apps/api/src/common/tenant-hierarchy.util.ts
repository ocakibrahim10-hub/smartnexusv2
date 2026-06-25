import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

export async function getParentTenantId(
  prisma: PrismaService,
  tenantId: string,
): Promise<string | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { parentId: true },
  });
  return tenant?.parentId ?? null;
}

export async function requireParentTenant(
  prisma: PrismaService,
  branchTenantId: string,
): Promise<string> {
  const parentId = await getParentTenantId(prisma, branchTenantId);
  if (!parentId) throw new BadRequestException('Bu işletmenin bağlı olduğu ana işletme bulunamadı');
  return parentId;
}

/** Şubede ana işletme ürününün yerel karşılığını bul veya oluştur */
export async function ensureBranchProduct(
  prisma: PrismaService,
  branchTenantId: string,
  parentProductId: string,
) {
  const existing = await prisma.product.findFirst({
    where: { tenantId: branchTenantId, parentProductId, deletedAt: null },
    include: { productUnits: true },
  });
  if (existing) return existing;

  const parent = await prisma.product.findFirst({
    where: { id: parentProductId, deletedAt: null },
    include: { productUnits: true },
  });
  if (!parent) throw new NotFoundException('Ana işletme ürünü bulunamadı');

  let code = parent.code;
  const codeExists = await prisma.product.findFirst({
    where: { tenantId: branchTenantId, code, deletedAt: null },
  });
  if (codeExists) code = `${parent.code}-SB`;

  const branchProduct = await prisma.product.create({
    data: {
      tenantId: branchTenantId,
      code,
      name: parent.name,
      description: parent.description,
      unit: parent.unit,
      saleUnit: parent.saleUnit || parent.unit,
      vatRate: parent.vatRate,
      purchasePrice: parent.purchasePrice,
      salePrice: parent.salePrice,
      barcode: parent.barcode,
      imageUrl: parent.imageUrl,
      categoryId: parent.categoryId,
      type: parent.type,
      isActive: parent.isActive,
      isService: parent.isService,
      minQuantity: parent.minQuantity,
      parentProductId: parent.id,
      productUnits: {
        create: parent.productUnits.map((u) => ({
          unit: u.unit,
          factorToBase: u.factorToBase,
          isPurchaseUnit: u.isPurchaseUnit,
          isSaleUnit: u.isSaleUnit,
          barcode: u.barcode,
        })),
      },
    },
    include: { productUnits: true },
  });

  const defaultWarehouse = await prisma.warehouse.findFirst({
    where: { tenantId: branchTenantId, isDefault: true, isActive: true },
  });
  if (defaultWarehouse && branchProduct.type !== 'SERVICE' && !branchProduct.isService) {
    await prisma.stockItem.upsert({
      where: {
        productId_warehouseId_tenantId: {
          productId: branchProduct.id,
          warehouseId: defaultWarehouse.id,
          tenantId: branchTenantId,
        },
      },
      create: {
        tenantId: branchTenantId,
        productId: branchProduct.id,
        warehouseId: defaultWarehouse.id,
        quantity: 0,
        minQuantity: branchProduct.minQuantity,
      },
      update: {},
    });
  }

  return branchProduct;
}
