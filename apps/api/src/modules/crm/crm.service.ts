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

  async updateLeadStatus(tenantId: string, leadId: string, status: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, tenantId } });
    if (!lead) throw new NotFoundException('Lead bulunamadı');

    const updated = await this.prisma.lead.update({
      where: { id: leadId },
      data: { status },
    });

    if (status === 'WON') {
      const existingContact = await this.prisma.contact.findFirst({
        where: { tenantId, email: lead.email || 'no-email-match' }
      });

      if (!existingContact) {
        await this.prisma.contact.create({
          data: {
            tenantId,
            type: 'CUSTOMER',
            name: lead.company || lead.name || 'Bilinmiyor',
            contactPerson: lead.name,
            email: lead.email,
            phone: lead.phone,
            code: `C-LEAD-${Math.floor(Math.random() * 10000)}`,
          }
        });
      }
    }

    return updated;
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
