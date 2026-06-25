import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ExpenseCategory } from '@prisma/client';
import { LedgerService } from '../../common/ledger.service';

@Injectable()
export class ExpensesService {
  constructor(
    private prisma: PrismaService,
    private ledger: LedgerService,
  ) {}

  async findAll(tenantId: string, query: { category?: ExpenseCategory; startDate?: string; endDate?: string }) {
    const where: any = { tenantId };
    if (query.category) where.category = query.category;
    if (query.startDate || query.endDate) {
      where.expenseDate = {};
      if (query.startDate) where.expenseDate.gte = new Date(query.startDate);
      if (query.endDate) where.expenseDate.lte = new Date(query.endDate + 'T23:59:59');
    }

    return this.prisma.expense.findMany({
      where,
      orderBy: { expenseDate: 'desc' },
      include: { contact: { select: { name: true } } },
    });
  }

  async create(
    tenantId: string,
    dto: {
      category: ExpenseCategory;
      amount: number;
      vatRate?: number;
      description: string;
      vendor?: string;
      expenseDate?: string;
      contactId?: string;
      receiptNo?: string;
    },
  ) {
    const vatRate = dto.vatRate ?? 20;
    const vatAmount = (dto.amount * vatRate) / (100 + vatRate);

    const expense = await this.prisma.expense.create({
      data: {
        tenantId,
        category: dto.category,
        amount: dto.amount,
        vatRate,
        vatAmount: Math.round(vatAmount * 100) / 100,
        description: dto.description,
        vendor: dto.vendor,
        expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : new Date(),
        contactId: dto.contactId,
        receiptNo: dto.receiptNo,
      },
    });

    await this.ledger.postExpense(tenantId, expense.id);
    return expense;
  }

  async remove(tenantId: string, id: string) {
    const exp = await this.prisma.expense.findFirst({ where: { id, tenantId } });
    if (!exp) throw new NotFoundException('Gider bulunamadı');
    return this.prisma.expense.delete({ where: { id } });
  }

  async enablePortalAccess(tenantId: string, contactId: string, password: string) {
    const contact = await this.prisma.contact.findFirst({ where: { id: contactId, tenantId } });
    if (!contact) throw new NotFoundException('Cari bulunamadı');
    const argon2 = await import('argon2');
    return this.prisma.contact.update({
      where: { id: contactId },
      data: { portalEnabled: true, portalPassword: await argon2.hash(password) },
      select: { id: true, name: true, email: true, portalEnabled: true },
    });
  }
}
