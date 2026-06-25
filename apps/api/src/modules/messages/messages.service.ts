import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async getMessages(tenantId: string) {
    // Messages sent TO this tenant (via recipients) or FROM this tenant
    const [received, sent] = await Promise.all([
      this.prisma.messageRecipient.findMany({
        where: { tenantId },
        orderBy: { message: { createdAt: 'desc' } },
        include: {
          message: {
            include: { fromTenant: { select: { id: true, name: true, type: true } } },
          },
        },
      }),
      this.prisma.message.findMany({
        where: { fromTenantId: tenantId },
        orderBy: { createdAt: 'desc' },
        include: {
          recipients: {
            select: { tenantId: true, isRead: true, tenant: { select: { name: true } } },
          },
        },
      }),
    ]);

    return { received, sent };
  }

  async getMessage(id: string, tenantId: string) {
    const recipient = await this.prisma.messageRecipient.findFirst({
      where: { messageId: id, tenantId },
    });
    if (recipient && !recipient.isRead) {
      await this.prisma.messageRecipient.update({
        where: { id: recipient.id },
        data: { isRead: true, readAt: new Date() },
      });
    }

    return this.prisma.message.findUnique({
      where: { id },
      include: {
        fromTenant: { select: { id: true, name: true, type: true } },
        recipients: {
          include: { tenant: { select: { id: true, name: true, type: true } } },
        },
      },
    });
  }

  async createMessage(
    fromTenantId: string,
    dto: {
      title: string;
      body: string;
      targetType: string;
      targetTenantIds?: string[];
      scheduledAt?: string;
    },
  ) {
    // Determine recipients
    let recipientTenantIds: string[] = dto.targetTenantIds || [];

    if (!dto.targetTenantIds?.length) {
      const whereType: any = {};
      if (dto.targetType === 'DEALERS') whereType.type = 'DEALER';
      else if (dto.targetType === 'BUSINESSES') whereType.type = 'BUSINESS';
      else if (dto.targetType === 'BRANCHES') whereType.type = 'BRANCH';
      else if (dto.targetType === 'ALL') whereType.type = { not: 'SUPERADMIN' };

      if (Object.keys(whereType).length) {
        const tenants = await this.prisma.tenant.findMany({
          where: { ...whereType, isActive: true },
          select: { id: true },
        });
        recipientTenantIds = tenants.map((t) => t.id);
      }
    }

    const isScheduled = !!dto.scheduledAt;
    const sentAt = isScheduled ? null : new Date();

    const message = await this.prisma.message.create({
      data: {
        fromTenantId,
        title: dto.title,
        body: dto.body,
        targetType: dto.targetType as any,
        sentAt,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        isScheduled,
        recipients: {
          create: recipientTenantIds.map((tid) => ({ tenantId: tid })),
        },
      },
      include: { recipients: true },
    });

    return message;
  }

  async getUnreadCount(tenantId: string) {
    return this.prisma.messageRecipient.count({
      where: { tenantId, isRead: false },
    });
  }

  async markAllRead(tenantId: string) {
    return this.prisma.messageRecipient.updateMany({
      where: { tenantId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }
}
