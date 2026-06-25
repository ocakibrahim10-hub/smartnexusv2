import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  async getStats(tenantId: string, isSuperAdmin = false) {
    const where = isSuperAdmin ? {} : { tenantId };

    const [byStatus, byPriority, recent] = await Promise.all([
      this.prisma.supportTicket.groupBy({ by: ['status'], where, _count: { id: true } }),
      this.prisma.supportTicket.groupBy({ by: ['priority'], where, _count: { id: true } }),
      this.prisma.supportTicket.findMany({
        where: { ...where, status: { not: 'CLOSED' } },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: {
          tenant: { select: { name: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
    ]);

    return { byStatus, byPriority, recent };
  }

  async getTickets(
    tenantId: string,
    query: { status?: string; priority?: string; search?: string },
    isSuperAdmin = false,
  ) {
    const where: any = isSuperAdmin ? {} : { tenantId };
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.search) where.subject = { contains: query.search, mode: 'insensitive' };

    return this.prisma.supportTicket.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        tenant: { select: { id: true, name: true, type: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { messages: true } },
      },
    });
  }

  async getTicket(id: string, tenantId: string, isSuperAdmin = false) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: isSuperAdmin ? { id } : { id, tenantId },
      include: {
        tenant: { select: { id: true, name: true, type: true, email: true, phone: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!ticket) throw new NotFoundException('Talep bulunamadı');
    return ticket;
  }

  async createTicket(
    tenantId: string,
    dto: { subject: string; priority?: string; body: string },
    userId: string,
  ) {
    return this.prisma.supportTicket.create({
      data: {
        tenantId,
        subject: dto.subject,
        priority: (dto.priority as any) || 'MEDIUM',
        messages: {
          create: { senderId: userId, body: dto.body, isAdmin: false },
        },
      },
      include: { messages: true },
    });
  }

  async updateTicket(id: string, dto: { status?: string; priority?: string }) {
    return this.prisma.supportTicket.update({
      where: { id },
      data: {
        status: dto.status as any,
        priority: dto.priority as any,
      },
    });
  }

  async addMessage(ticketId: string, senderId: string, body: string, isAdmin = false) {
    // Auto-update status
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Talep bulunamadı');

    const updates: any = {};
    if (isAdmin && ticket.status === 'OPEN') updates.status = 'IN_PROGRESS';
    if (!isAdmin && ticket.status === 'RESOLVED') updates.status = 'OPEN';

    const [msg] = await Promise.all([
      this.prisma.ticketMessage.create({
        data: { ticketId, senderId, body, isAdmin },
      }),
      Object.keys(updates).length
        ? this.prisma.supportTicket.update({ where: { id: ticketId }, data: updates })
        : Promise.resolve(),
    ]);

    return msg;
  }

  async closeTicket(id: string) {
    return this.prisma.supportTicket.update({ where: { id }, data: { status: 'CLOSED' } });
  }

  async resolveTicket(id: string) {
    return this.prisma.supportTicket.update({ where: { id }, data: { status: 'RESOLVED' } });
  }
}
