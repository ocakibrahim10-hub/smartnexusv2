import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateVehicleDto,
  UpdateVehicleDto,
  CreateShipmentDto,
  UpdateShipmentDto,
} from './dto/tms.dto';
import { parsePagination } from '../../common/pagination';
import { UyumsoftSoapClient } from '../integrations/einvoice/uyumsoft-soap.client';
import { buildUblTrDespatch } from '../../common/ubl-tr-dispatch.builder';

@Injectable()
export class TmsService {
  constructor(
    private prisma: PrismaService,
    private uyumsoft: UyumsoftSoapClient,
    private config: ConfigService,
  ) {}

  // ─── Dashboard ──────────────────────────────────────────────────────────────
  async getDashboard(tenantId: string) {
    const [
      totalVehicles,
      activeVehicles,
      totalShipments,
      planned,
      inTransit,
      delivered,
      failed,
      recentShipments,
    ] = await Promise.all([
      this.prisma.vehicle.count({ where: { tenantId } }),
      this.prisma.vehicle.count({ where: { tenantId, isActive: true } }),
      this.prisma.shipment.count({ where: { tenantId } }),
      this.prisma.shipment.count({ where: { tenantId, status: 'PLANNED' } }),
      this.prisma.shipment.count({ where: { tenantId, status: 'IN_TRANSIT' } }),
      this.prisma.shipment.count({ where: { tenantId, status: 'DELIVERED' } }),
      this.prisma.shipment.count({ where: { tenantId, status: 'FAILED' } }),
      this.prisma.shipment.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { vehicle: true, orders: true },
      }),
    ]);

    return {
      totalVehicles,
      activeVehicles,
      totalShipments,
      planned,
      inTransit,
      delivered,
      failed,
      deliveryRate: totalShipments > 0 ? Math.round((delivered / totalShipments) * 100) : 0,
      recentShipments,
    };
  }

  private async assertDriver(tenantId: string, driverId?: string | null) {
    if (!driverId) return;
    const driver = await this.prisma.user.findFirst({
      where: { id: driverId, tenantId, role: 'DRIVER', isActive: true },
    });
    if (!driver) throw new BadRequestException('Geçersiz şoför seçimi');
  }

  private async resolveDriverSnapshot(tenantId: string, driverId?: string | null) {
    if (!driverId) return {};
    const driver = await this.prisma.user.findFirst({
      where: { id: driverId, tenantId, role: 'DRIVER' },
      select: {
        name: true,
        phone: true,
        contact: { select: { nationalId: true, address: true, city: true, district: true } },
      },
    });
    if (!driver) return {};
    const fullAddress = [driver.contact?.address, driver.contact?.district, driver.contact?.city]
      .filter(Boolean)
      .join(', ');
    return {
      driverName: driver.name,
      driverPhone: driver.phone,
      driverNationalId: driver.contact?.nationalId,
      driverAddress: fullAddress || driver.contact?.address,
    };
  }

  private async loadDriversMap(tenantId: string, driverIds: string[]) {
    const ids = [...new Set(driverIds.filter(Boolean))];
    if (!ids.length) return new Map<string, { id: string; name: string; phone: string | null }>();
    const drivers = await this.prisma.user.findMany({
      where: { tenantId, id: { in: ids } },
      select: { id: true, name: true, phone: true },
    });
    return new Map(drivers.map((d) => [d.id, d]));
  }

  // ─── Vehicles ───────────────────────────────────────────────────────────────
  async getVehicles(
    tenantId: string,
    query?: { search?: string; type?: string; isActive?: string },
  ) {
    const where: any = { tenantId };
    if (query?.type) where.type = query.type;
    if (query?.isActive !== undefined) where.isActive = query.isActive === 'true';
    if (query?.search) {
      where.OR = [
        { plate: { contains: query.search, mode: 'insensitive' } },
        { brand: { contains: query.search, mode: 'insensitive' } },
        { model: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const vehicles = await this.prisma.vehicle.findMany({
      where,
      orderBy: { plate: 'asc' },
      include: {
        shipments: {
          where: { status: { in: ['PLANNED', 'IN_TRANSIT'] } },
          select: { id: true, status: true },
        },
      },
    });

    const driverMap = await this.loadDriversMap(
      tenantId,
      vehicles.map((v) => v.driverId).filter(Boolean) as string[],
    );

    return vehicles.map((v) => ({
      ...v,
      driver: v.driverId ? (driverMap.get(v.driverId) ?? null) : null,
      activeShipments: v.shipments.length,
      isOnRoute: v.shipments.some((s) => s.status === 'IN_TRANSIT'),
    }));
  }

  async createVehicle(tenantId: string, dto: CreateVehicleDto) {
    await this.assertDriver(tenantId, dto.driverId);
    return this.prisma.vehicle.create({
      data: { tenantId, ...dto },
    });
  }

  async updateVehicle(tenantId: string, id: string, dto: UpdateVehicleDto) {
    await this.findVehicleOrThrow(tenantId, id);
    await this.assertDriver(tenantId, dto.driverId);
    return this.prisma.vehicle.update({ where: { id }, data: dto });
  }

  async deleteVehicle(tenantId: string, id: string) {
    await this.findVehicleOrThrow(tenantId, id);
    return this.prisma.vehicle.update({ where: { id }, data: { isActive: false } });
  }

  private async findVehicleOrThrow(tenantId: string, id: string) {
    const v = await this.prisma.vehicle.findFirst({ where: { id, tenantId } });
    if (!v) throw new NotFoundException('Araç bulunamadı');
    return v;
  }

  // ─── Shipments ──────────────────────────────────────────────────────────────
  async getShipments(
    tenantId: string,
    user: { id: string; role: string },
    query?: {
      status?: string;
      vehicleId?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: string;
      limit?: string;
    },
  ) {
    const { page, limit, skip } = parsePagination(query, { limit: 20 });
    const where: any = { tenantId };

    if (user.role === 'DRIVER') {
      where.driverId = user.id;
    }

    if (query?.status) where.status = query.status;
    if (query?.vehicleId) where.vehicleId = query.vehicleId;
    if (query?.dateFrom || query?.dateTo) {
      where.plannedDate = {};
      if (query.dateFrom) where.plannedDate.gte = new Date(query.dateFrom);
      if (query.dateTo) where.plannedDate.lte = new Date(query.dateTo);
    }

    const [total, items] = await Promise.all([
      this.prisma.shipment.count({ where }),
      this.prisma.shipment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          vehicle: { select: { id: true, plate: true, type: true, brand: true, model: true } },
          orders: {
            include: { b2bOrder: { include: { contact: { select: { id: true, name: true } } } } },
          },
        },
      }),
    ]);

    const driverMap = await this.loadDriversMap(
      tenantId,
      items.map((s) => s.driverId).filter(Boolean) as string[],
    );

    return {
      total,
      page,
      limit,
      items: items.map((s) => ({
        ...s,
        driver: s.driverId ? (driverMap.get(s.driverId) ?? null) : null,
      })),
    };
  }

  async getShipment(tenantId: string, id: string) {
    const s = await this.prisma.shipment.findFirst({
      where: { id, tenantId },
      include: {
        vehicle: true,
        orders: {
          orderBy: { sequence: 'asc' },
          include: {
            b2bOrder: {
              include: {
                contact: true,
                lines: { include: { product: { select: { id: true, name: true, unit: true } } } },
              },
            },
          },
        },
      },
    });
    if (!s) throw new NotFoundException('Sevkiyat bulunamadı');
    const driverMap = await this.loadDriversMap(tenantId, s.driverId ? [s.driverId] : []);
    return {
      ...s,
      driver: s.driverId ? (driverMap.get(s.driverId) ?? null) : null,
    };
  }

  async createShipment(tenantId: string, dto: CreateShipmentDto) {
    let driverId = dto.driverId;
    if (!driverId && dto.vehicleId) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: dto.vehicleId, tenantId },
        select: { driverId: true },
      });
      driverId = vehicle?.driverId || undefined;
    }
    await this.assertDriver(tenantId, driverId);
    const driverSnapshot = await this.resolveDriverSnapshot(tenantId, driverId);
    const code = await this.generateShipmentCode(tenantId);
    const { orders, ...shipmentData } = dto;

    return this.prisma.shipment.create({
      data: {
        tenantId,
        code,
        ...shipmentData,
        driverId,
        ...driverSnapshot,
        plannedDate: shipmentData.plannedDate ? new Date(shipmentData.plannedDate) : undefined,
        orders: orders?.length
          ? {
              create: orders.map((o, i) => ({
                b2bOrderId: o.b2bOrderId,
                address: o.address,
                sequence: o.sequence ?? i + 1,
              })),
            }
          : undefined,
      },
      include: { vehicle: true, orders: true },
    });
  }

  async updateShipment(tenantId: string, id: string, dto: UpdateShipmentDto) {
    await this.findShipmentOrThrow(tenantId, id);
    let driverId = dto.driverId;
    if (driverId === undefined && dto.vehicleId) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: dto.vehicleId, tenantId },
        select: { driverId: true },
      });
      driverId = vehicle?.driverId || undefined;
    }
    await this.assertDriver(tenantId, driverId);
    const driverSnapshot =
      driverId !== undefined ? await this.resolveDriverSnapshot(tenantId, driverId) : {};
    return this.prisma.shipment.update({
      where: { id },
      data: {
        ...dto,
        ...(driverId !== undefined ? { driverId, ...driverSnapshot } : {}),
        plannedDate: dto.plannedDate ? new Date(dto.plannedDate) : undefined,
      },
    });
  }

  async sendEDispatch(tenantId: string, shipmentId: string) {
    const shipment = await this.getShipment(tenantId, shipmentId);
    if (shipment.eDespatchId) throw new BadRequestException('E-irsaliye zaten oluşturulmuş');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant?.taxNo) throw new BadRequestException('İşletme VKN tanımlı değil (Ayarlar)');

    let lines =
      shipment.orders.flatMap((o) =>
        (o.b2bOrder?.lines || []).map((l) => ({
          description: l.product?.name || 'Ürün',
          quantity: l.quantity,
          unit: l.product?.unit,
        })),
      ) || [];
    if (!lines.length) {
      lines = [{ description: `Sevkiyat ${shipment.code}`, quantity: 1, unit: 'ADET' }];
    }

    const firstOrder = shipment.orders[0];
    const customer = firstOrder?.b2bOrder?.contact;

    const { uuid, xml } = buildUblTrDespatch({
      code: shipment.code,
      issueDate: shipment.plannedDate
        ? new Date(shipment.plannedDate).toISOString().split('T')[0]
        : undefined,
      supplier: { vkn: tenant.taxNo, name: tenant.name },
      customer: {
        name: customer?.name || 'Müşteri',
        taxNo: customer?.taxNo,
        address: firstOrder?.address || customer?.address,
      },
      driver: {
        name: shipment.driverName || shipment.driver?.name || 'Şoför',
        nationalId: shipment.driverNationalId,
        phone: shipment.driverPhone,
      },
      vehiclePlate: shipment.vehicle?.plate,
      lines,
    });

    let eDespatchId = uuid;
    let eDespatchStatus = 'DRAFT';
    const provider = this.config.get<string>('EINVOICE_PROVIDER') || 'mock';
    if (provider === 'uyumsoft') {
      const sent = await this.uyumsoft.sendDespatch(xml, shipment.id);
      eDespatchId = sent.uuid;
      eDespatchStatus = 'SENT';
    }

    return this.prisma.shipment.update({
      where: { id: shipmentId },
      data: { eDespatchId, eDespatchStatus },
      include: { vehicle: true, orders: true },
    });
  }

  async startShipment(tenantId: string, id: string) {
    const s = await this.findShipmentOrThrow(tenantId, id);
    if (s.status !== 'PLANNED')
      throw new BadRequestException('Sadece PLANNED sevkiyat yola çıkabilir');
    return this.prisma.shipment.update({ where: { id }, data: { status: 'IN_TRANSIT' } });
  }

  async deliverShipment(tenantId: string, id: string) {
    const s = await this.findShipmentOrThrow(tenantId, id);
    if (s.status !== 'IN_TRANSIT')
      throw new BadRequestException('Sadece IN_TRANSIT sevkiyat teslim edilebilir');
    return this.prisma.shipment.update({
      where: { id },
      data: { status: 'DELIVERED', deliveredAt: new Date() },
    });
  }

  async failShipment(tenantId: string, id: string, reason?: string) {
    await this.findShipmentOrThrow(tenantId, id);
    return this.prisma.shipment.update({
      where: { id },
      data: { status: 'FAILED', notes: reason },
    });
  }

  async cancelShipment(tenantId: string, id: string) {
    const s = await this.findShipmentOrThrow(tenantId, id);
    if (s.status === 'DELIVERED')
      throw new BadRequestException('Teslim edilmiş sevkiyat iptal edilemez');
    return this.prisma.shipment.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  async addShipmentOrder(
    tenantId: string,
    shipmentId: string,
    b2bOrderId: string,
    address: string,
  ) {
    await this.findShipmentOrThrow(tenantId, shipmentId);
    const count = await this.prisma.shipmentOrder.count({ where: { shipmentId } });
    return this.prisma.shipmentOrder.create({
      data: { shipmentId, b2bOrderId, address, sequence: count + 1 },
    });
  }

  private async findShipmentOrThrow(tenantId: string, id: string) {
    const s = await this.prisma.shipment.findFirst({ where: { id, tenantId } });
    if (!s) throw new NotFoundException('Sevkiyat bulunamadı');
    return s;
  }

  private async generateShipmentCode(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.shipment.count({ where: { tenantId } });
    return `SV-${year}-${String(count + 1).padStart(3, '0')}`;
  }
}
