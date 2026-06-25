import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MrpService {
  constructor(private prisma: PrismaService) {}

  async getBoms(tenantId: string) {
    return this.prisma.billOfMaterial.findMany({
      where: { tenantId },
      include: { product: true, items: { include: { product: true } } },
    });
  }

  async createBom(tenantId: string, data: any) {
    return this.prisma.billOfMaterial.create({
      data: {
        tenantId,
        code: data.code,
        name: data.name,
        productId: data.productId,
        quantity: data.quantity,
        items: {
          create: data.items.map((i: any) => ({
            productId: i.productId,
            quantity: i.quantity,
            unit: i.unit,
          })),
        },
      },
    });
  }

  async getWorkOrders(tenantId: string) {
    return this.prisma.workOrder.findMany({
      where: { tenantId },
      include: {
        bom: { include: { product: true } },
        items: { include: { product: true } },
      },
    });
  }

  async createWorkOrder(tenantId: string, data: any) {
    const bom = await this.prisma.billOfMaterial.findUnique({
      where: { id: data.bomId },
      include: { items: true },
    });

    if (!bom || bom.tenantId !== tenantId) {
      throw new NotFoundException('Reçete bulunamadı.');
    }

    const multiplier = data.quantity / bom.quantity;

    return this.prisma.workOrder.create({
      data: {
        tenantId,
        code: data.code,
        bomId: bom.id,
        status: 'PLANNED',
        quantity: data.quantity,
        plannedDate: data.plannedDate ? new Date(data.plannedDate) : null,
        notes: data.notes,
        items: {
          create: bom.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity * multiplier,
            type: 'MATERIAL',
          })),
        },
      },
    });
  }

  async updateWorkOrderStatus(tenantId: string, workOrderId: string, status: string, userId: string) {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, tenantId },
      include: { items: true, bom: true },
    });

    if (!wo) throw new NotFoundException('İş emri bulunamadı.');

    if (status === 'COMPLETED' && wo.status !== 'COMPLETED') {
      const warehouse = await this.prisma.warehouse.findFirst({
        where: { tenantId },
        orderBy: { isDefault: 'desc' }
      });
      
      if (!warehouse) throw new NotFoundException('İşlem için tanımlı depo bulunamadı.');

      // Tüketim (Stok Düşme)
      for (const item of wo.items) {
        await this.prisma.stockMovement.create({
          data: {
            tenantId,
            productId: item.productId,
            warehouseId: warehouse.id,
            type: 'OUT',
            quantity: item.quantity,
            description: `${wo.code} nolu iş emri üretimi (Tüketim)`,
            userId,
          },
        });
      }

      // Üretim (Mamul Stoğa Ekleme)
      await this.prisma.stockMovement.create({
        data: {
          tenantId,
          productId: wo.bom.productId,
          warehouseId: warehouse.id,
          type: 'IN',
          quantity: wo.quantity,
          description: `${wo.code} nolu iş emri üretimi (Giriş)`,
          userId,
        },
      });
    }

    return this.prisma.workOrder.update({
      where: { id: workOrderId },
      data: {
        status,
        startDate: status === 'IN_PROGRESS' && !wo.startDate ? new Date() : undefined,
        endDate: status === 'COMPLETED' ? new Date() : undefined,
      },
    });
  }
}
