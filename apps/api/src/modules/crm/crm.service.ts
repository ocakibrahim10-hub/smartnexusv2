import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CrmService {
  constructor(private prisma: PrismaService) {}

  async getLeads(tenantId: string) {
    return this.prisma.lead.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createLead(tenantId: string, data: any) {
    return this.prisma.lead.create({
      data: {
        tenantId,
        name: data.name,
        company: data.company,
        email: data.email,
        phone: data.phone,
        status: data.status || 'NEW',
        notes: data.notes,
      },
    });
  }

  async getDeals(tenantId: string) {
    return this.prisma.deal.findMany({
      where: { tenantId },
      include: { contact: { select: { id: true, name: true, type: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createDeal(tenantId: string, data: any) {
    return this.prisma.deal.create({
      data: {
        tenantId,
        title: data.title,
        value: data.value,
        stage: data.stage || 'PROSPECTING',
        contactId: data.contactId,
        expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
      },
    });
  }

  async updateDealStage(tenantId: string, dealId: string, stage: any) {
    return this.prisma.deal.update({
      where: { id: dealId, tenantId },
      data: { stage },
    });
  }

  async getActivities(tenantId: string, dealId?: string) {
    return this.prisma.activity.findMany({
      where: { tenantId, ...(dealId ? { dealId } : {}) },
      orderBy: { date: 'desc' },
    });
  }

  async createActivity(tenantId: string, data: any) {
    return this.prisma.activity.create({
      data: {
        tenantId,
        type: data.type || 'NOTE',
        notes: data.notes,
        date: data.date ? new Date(data.date) : new Date(),
        dealId: data.dealId,
      },
    });
  }
}
