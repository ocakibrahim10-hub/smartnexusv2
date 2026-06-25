import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ContactType, Prisma } from '@prisma/client';
import { parsePagination } from '../../common/pagination';

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    query: {
      search?: string;
      type?: ContactType;
      page?: number;
      limit?: number;
    },
  ) {
    const { search, type } = query;
    const { page, limit, skip } = parsePagination(query);

    const where: Prisma.ContactWhereInput = {
      tenantId,
      isActive: true,
      ...(type && { type }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { taxNo: { contains: search } },
          { code: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          taxNo: true,
          phone: true,
          email: true,
          contactPerson: true,
          city: true,
          balance: true,
          creditLimit: true,
          isActive: true,
        },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(tenantId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, tenantId },
      include: {
        invoices: { orderBy: { date: 'desc' }, take: 10 },
        priceList: true,
      },
    });
    if (!contact) throw new NotFoundException('Cari bulunamadı');
    return contact;
  }

  // POS için hızlı arama (TC/vergi no/isim)
  async quickSearch(tenantId: string, q: string) {
    return this.prisma.contact.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { taxNo: { contains: q } },
          { phone: { contains: q } },
        ],
      },
      take: 10,
      select: { id: true, name: true, taxNo: true, phone: true, type: true, balance: true },
    });
  }

  async create(tenantId: string, dto: any) {
    // Kod otomatik oluştur
    if (!dto.code) {
      const count = await this.prisma.contact.count({ where: { tenantId } });
      dto.code = `CRI-${String(count + 1).padStart(4, '0')}`;
    }
    return this.prisma.contact.create({ data: { ...dto, tenantId } });
  }

  async update(tenantId: string, id: string, dto: any) {
    await this.findOne(tenantId, id);
    return this.prisma.contact.update({ where: { id }, data: dto });
  }

  async delete(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.contact.update({ where: { id }, data: { isActive: false } });
  }

  async getStatement(tenantId: string, id: string, startDate?: string, endDate?: string) {
    await this.findOne(tenantId, id);

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const [invoices, payments] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { tenantId, contactId: id, ...(startDate || endDate ? { date: dateFilter } : {}) },
        include: { lines: true },
        orderBy: { date: 'asc' },
      }),
      this.prisma.invoicePayment.findMany({
        where: { tenantId, invoice: { contactId: id } },
        include: { 
          invoice: true,
          checkRegister: {
            include: { collectionBank: true, endorsedContact: true }
          }
        },
        orderBy: { paidAt: 'asc' },
      }),
    ]);

    const movements: any[] = [];

    const typeLabels: Record<string, string> = {
      SALES: 'Satış Faturası',
      PURCHASE: 'Alış Faturası',
      RETURN_SALES: 'Satış İade Faturası',
      RETURN_PURCHASE: 'Alış İade Faturası',
      PROFORMA: 'Proforma Fatura'
    };

    const paymentTypeLabels: Record<string, string> = {
      CASH: 'Nakit Tahsilat/Ödeme',
      BANK: 'Banka Transferi',
      CREDIT_CARD: 'Kredi Kartı',
      CHECK: 'Çek İşlemi',
      PROMISSORY_NOTE: 'Senet',
    };

    for (const inv of invoices) {
      const isDebt = ['SALES', 'RETURN_PURCHASE'].includes(inv.type);
      movements.push({
        date: inv.date,
        type: 'INVOICE',
        ref: `${inv.series || ''}${inv.number || ''}`,
        description: typeLabels[inv.type] || `${inv.type} Faturası`,
        debit: isDebt ? inv.total : 0,
        credit: isDebt ? 0 : inv.total,
        balance: 0,
        dueDate: inv.dueDate,
        status: inv.status,
      });
    }

    for (const pay of payments) {
      const isPaymentToSupplier = ['PURCHASE', 'RETURN_SALES'].includes((pay as any).invoice?.type || '');
      
      let description = paymentTypeLabels[pay.paymentType] || 'Ödeme İşlemi';
      let checkLabel = pay.checkNo;
      
      if (pay.paymentType === 'CHECK' && (pay as any).checkRegister) {
         const reg = (pay as any).checkRegister;
         const methodMap: Record<string, string> = {
           MANUAL: 'Elden',
           BANK_COLLECTION: `Bankaya Verildi`,
           ENDORSEMENT: `Ciro Edildi`
         };
         
         const details = [];
         if (reg.bankName) details.push(reg.bankName);
         if (reg.collectionMethod) {
            if (reg.collectionMethod === 'BANK_COLLECTION' && reg.collectionBank) details.push(`Tahsilat: ${reg.collectionBank.name}`);
            else if (reg.collectionMethod === 'ENDORSEMENT' && reg.endorsedContact) details.push(`Ciro: ${reg.endorsedContact.name}`);
            else details.push(methodMap[reg.collectionMethod]);
         }
         
         if (details.length > 0) {
            description += ` (${details.join(' - ')})`;
         }
      }

      movements.push({
        date: pay.paidAt,
        type: 'PAYMENT',
        ref: pay.reference || 'ÖDEME',
        description,
        debit: isPaymentToSupplier ? pay.amount : 0,
        credit: isPaymentToSupplier ? 0 : pay.amount,
        balance: 0,
        dueDate: pay.checkDueDate,
        checkNo: checkLabel,
      });
    }

    movements.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Recalculate running balance
    let running = 0;
    for (const m of movements) {
      running += m.debit - m.credit;
      m.balance = running;
    }

    return { contact: await this.findOne(tenantId, id), movements, finalBalance: running };
  }

  async getAging(tenantId: string) {
    const contacts = await this.prisma.contact.findMany({
      where: { tenantId, isActive: true, type: { in: ['CUSTOMER', 'BOTH'] } },
      select: {
        id: true,
        name: true,
        balance: true,
        invoices: {
          where: { status: { in: ['APPROVED', 'SENT'] } },
          select: { total: true, dueDate: true, date: true },
        },
      },
    });

    const now = new Date();
    return contacts
      .map((c) => {
        let current = 0,
          days30 = 0,
          days60 = 0,
          days90 = 0,
          over90 = 0;
        for (const inv of c.invoices) {
          const due = inv.dueDate || inv.date;
          const diff = Math.floor((now.getTime() - new Date(due).getTime()) / 86400000);
          if (diff <= 0) current += inv.total;
          else if (diff <= 30) days30 += inv.total;
          else if (diff <= 60) days60 += inv.total;
          else if (diff <= 90) days90 += inv.total;
          else over90 += inv.total;
        }
        return {
          id: c.id,
          name: c.name,
          balance: c.balance,
          current,
          days30,
          days60,
          days90,
          over90,
          total: current + days30 + days60 + days90 + over90,
        };
      })
      .filter((c) => c.total > 0);
  }
}
