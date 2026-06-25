import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  log(data: {
    tenantId: string;
    userId?: string;
    userEmail?: string;
    action: string;
    entity?: string;
    entityId?: string;
    meta?: Record<string, unknown>;
  }) {
    return this.prisma.auditLog.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        userEmail: data.userEmail,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        meta: data.meta as any,
      },
    });
  }

  findAll(tenantId: string, query: { page?: number; limit?: number; entity?: string }) {
    const page = Number(query.page) || 1;
    const limit = Math.min(100, Number(query.limit) || 50);
    const where: any = { tenantId };
    if (query.entity) where.entity = query.entity;

    return Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]).then(([data, total]) => ({ data, total, page, pages: Math.ceil(total / limit) }));
  }
}
