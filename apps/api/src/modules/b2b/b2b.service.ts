import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateB2BOrderDto, UpdateB2BOrderDto, CreatePriceListDto } from './dto/b2b.dto';
import { parsePagination } from '../../common/pagination';

@Injectable()
export class B2bService {
  constructor(private prisma: PrismaService) {}

  // ─── Dashboard ──────────────────────────────────────────────────────────────
  async getDashboard(tenantId: string) {
    const [total, draft, pending, approved, processing, shipped, delivered, cancelled] =
      await Promise.all([
        this.prisma.b2BOrder.count({ where: { tenantId } }),
        this.prisma.b2BOrder.count({ where: { tenantId, status: 'DRAFT' } }),
        this.prisma.b2BOrder.count({ where: { tenantId, status: 'PENDING' } }),
        this.prisma.b2BOrder.count({ where: { tenantId, status: 'APPROVED' } }),
        this.prisma.b2BOrder.count({ where: { tenantId, status: 'PROCESSING' } }),
        this.prisma.b2BOrder.count({ where: { tenantId, status: 'SHIPPED' } }),
        this.prisma.b2BOrder.count({ where: { tenantId, status: 'DELIVERED' } }),
        this.prisma.b2BOrder.count({ where: { tenantId, status: 'CANCELLED' } }),
      ]);

    const revenue = await this.prisma.b2BOrder.aggregate({
      where: { tenantId, status: { in: ['DELIVERED', 'SHIPPED'] } },
      _sum: { total: true },
    });

    const pendingOrders = await this.prisma.b2BOrder.findMany({
      where: { tenantId, status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] } },
      orderBy: { requestedAt: 'asc' },
      take: 10,
      include: { contact: { select: { id: true, name: true, city: true } }, lines: true },
    });

    return {
      total,
      draft,
      pending,
      approved,
      processing,
      shipped,
      delivered,
      cancelled,
      revenue: revenue._sum.total ?? 0,
      pendingOrders,
    };
  }

  // ─── Orders ─────────────────────────────────────────────────────────────────
  async getOrders(
    tenantId: string,
    query?: { status?: string; contactId?: string; search?: string; page?: string; limit?: string },
  ) {
    const { page, limit, skip } = parsePagination(query, { limit: 20 });
    const where: any = { tenantId };

    if (query?.status) where.status = query.status;
    if (query?.contactId) where.contactId = query.contactId;
    if (query?.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { contact: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.b2BOrder.count({ where }),
      this.prisma.b2BOrder.findMany({
        where,
        orderBy: { requestedAt: 'desc' },
        skip,
        take: limit,
        include: {
          contact: { select: { id: true, name: true, city: true, phone: true } },
          lines: { include: { product: { select: { id: true, name: true, unit: true } } } },
        },
      }),
    ]);

    return { total, page, limit, items };
  }

  async getOrder(tenantId: string, id: string) {
    const o = await this.prisma.b2BOrder.findFirst({
      where: { id, tenantId },
      include: {
        contact: true,
        lines: { include: { product: true } },
        shipments: { include: { shipment: { include: { vehicle: true } } } },
      },
    });
    if (!o) throw new NotFoundException('B2B sipariş bulunamadı');
    return o;
  }

  async createOrder(tenantId: string, dto: CreateB2BOrderDto) {
    const code = await this.generateOrderCode(tenantId);
    let subtotal = 0,
      vatTotal = 0;

    const lineData = dto.lines.map((l) => {
      const vatRate = l.vatRate ?? 20;
      const lineTotal = l.quantity * l.unitPrice;
      const vatAmount = (lineTotal * vatRate) / 100;
      subtotal += lineTotal;
      vatTotal += vatAmount;
      return {
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        vatRate,
        vatAmount,
        total: lineTotal + vatAmount,
      };
    });

    return this.prisma.b2BOrder.create({
      data: {
        tenantId,
        contactId: dto.contactId,
        code,
        notes: dto.notes,
        subtotal,
        vatTotal,
        total: subtotal + vatTotal,
        lines: { create: lineData },
      },
      include: { contact: true, lines: { include: { product: true } } },
    });
  }

  async updateOrder(tenantId: string, id: string, dto: UpdateB2BOrderDto) {
    const o = await this.findOrderOrThrow(tenantId, id);
    if (!['DRAFT', 'PENDING'].includes(o.status))
      throw new BadRequestException('Sadece DRAFT/PENDING siparişler güncellenebilir');

    if (dto.lines) {
      let subtotal = 0,
        vatTotal = 0;
      const lineData = dto.lines.map((l) => {
        const vatRate = l.vatRate ?? 20;
        const lineTotal = l.quantity * l.unitPrice;
        const vatAmount = (lineTotal * vatRate) / 100;
        subtotal += lineTotal;
        vatTotal += vatAmount;
        return {
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          vatRate,
          vatAmount,
          total: lineTotal + vatAmount,
        };
      });

      await this.prisma.b2BOrderLine.deleteMany({ where: { orderId: id } });
      return this.prisma.b2BOrder.update({
        where: { id },
        data: {
          notes: dto.notes,
          subtotal,
          vatTotal,
          total: subtotal + vatTotal,
          lines: { create: lineData },
        },
        include: { contact: true, lines: { include: { product: true } } },
      });
    }

    return this.prisma.b2BOrder.update({ where: { id }, data: { notes: dto.notes } });
  }

  async submitOrder(tenantId: string, id: string) {
    const o = await this.findOrderOrThrow(tenantId, id);
    if (o.status !== 'DRAFT') throw new BadRequestException('Sadece DRAFT sipariş gönderilebilir');
    return this.prisma.b2BOrder.update({ where: { id }, data: { status: 'PENDING' } });
  }

  async approveOrder(tenantId: string, id: string) {
    const o = await this.findOrderOrThrow(tenantId, id);
    if (o.status !== 'PENDING')
      throw new BadRequestException('Sadece PENDING sipariş onaylanabilir');
    return this.prisma.b2BOrder.update({
      where: { id },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });
  }

  async processOrder(tenantId: string, id: string) {
    const o = await this.findOrderOrThrow(tenantId, id);
    if (o.status !== 'APPROVED')
      throw new BadRequestException('Sadece APPROVED sipariş işleme alınabilir');
    return this.prisma.b2BOrder.update({ where: { id }, data: { status: 'PROCESSING' } });
  }

  async shipOrder(tenantId: string, id: string) {
    const o = await this.findOrderOrThrow(tenantId, id);
    if (o.status !== 'PROCESSING')
      throw new BadRequestException('Sadece PROCESSING sipariş kargoya verilebilir');
    return this.prisma.b2BOrder.update({ where: { id }, data: { status: 'SHIPPED' } });
  }

  async deliverOrder(tenantId: string, id: string) {
    const o = await this.findOrderOrThrow(tenantId, id);
    if (o.status !== 'SHIPPED')
      throw new BadRequestException('Sadece SHIPPED sipariş teslim edilebilir');
    return this.prisma.b2BOrder.update({ where: { id }, data: { status: 'DELIVERED' } });
  }

  async cancelOrder(tenantId: string, id: string) {
    const o = await this.findOrderOrThrow(tenantId, id);
    if (['DELIVERED', 'CANCELLED'].includes(o.status))
      throw new BadRequestException('Bu sipariş iptal edilemez');
    return this.prisma.b2BOrder.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  // ─── B2B Customers ──────────────────────────────────────────────────────────
  async getCustomers(tenantId: string, query?: { search?: string }) {
    const where: any = { tenantId, type: { in: ['CUSTOMER', 'BOTH'] } };
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { taxNo: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const customers = await this.prisma.contact.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        b2bOrders: {
          select: { id: true, status: true, total: true, requestedAt: true },
          orderBy: { requestedAt: 'desc' },
          take: 5,
        },
        priceList: { select: { id: true, name: true } },
      },
    });

    return customers.map((c) => ({
      ...c,
      orderCount: c.b2bOrders.length,
      totalRevenue: c.b2bOrders
        .filter((o) => ['DELIVERED', 'SHIPPED'].includes(o.status))
        .reduce((s, o) => s + o.total, 0),
    }));
  }

  // ─── Price Lists ─────────────────────────────────────────────────────────────
  async getPriceLists(tenantId: string) {
    return this.prisma.priceList.findMany({
      where: { tenantId },
      include: {
        items: {
          include: { product: { select: { id: true, name: true, salePrice: true, unit: true } } },
        },
        _count: { select: { contacts: true } },
      },
    });
  }

  async createPriceList(tenantId: string, dto: CreatePriceListDto) {
    return this.prisma.priceList.create({
      data: { 
        tenantId, 
        name: dto.name, 
        currency: dto.currency ?? 'TRY',
        items: dto.items?.length ? {
          create: dto.items.map(item => ({
            productId: item.productId,
            price: item.price,
            minQuantity: item.minQuantity || 1
          }))
        } : undefined
      },
    });
  }

  async setPriceListItem(
    tenantId: string,
    priceListId: string,
    productId: string,
    price: number,
    minQuantity = 1,
  ) {
    return this.prisma.priceListItem.upsert({
      where: { priceListId_productId: { priceListId, productId } },
      update: { price, minQuantity },
      create: { priceListId, productId, price, minQuantity },
    });
  }

  async assignPriceList(tenantId: string, contactId: string, priceListId: string) {
    const contact = await this.prisma.contact.findFirst({ where: { id: contactId, tenantId } });
    if (!contact) throw new NotFoundException('Cari bulunamadı');
    return this.prisma.contact.update({ where: { id: contactId }, data: { priceListId } });
  }

  private async findOrderOrThrow(tenantId: string, id: string) {
    const o = await this.prisma.b2BOrder.findFirst({ where: { id, tenantId } });
    if (!o) throw new NotFoundException('B2B sipariş bulunamadı');
    return o;
  }

  private async generateOrderCode(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.b2BOrder.count({ where: { tenantId } });
    return `B2B-${year}-${String(count + 1).padStart(3, '0')}`;
  }
}
