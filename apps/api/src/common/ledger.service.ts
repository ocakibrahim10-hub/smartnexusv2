import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceType } from '@prisma/client';
import { DEFAULT_LEDGER_ACCOUNTS } from './ledger-accounts';

@Injectable()
export class LedgerService {
  constructor(private prisma: PrismaService) {}

  async ensureDefaultAccounts(tenantId: string) {
    for (const acc of DEFAULT_LEDGER_ACCOUNTS) {
      await this.prisma.ledgerAccount.upsert({
        where: { tenantId_code: { tenantId, code: acc.code } },
        update: { name: acc.name, type: acc.type },
        create: { tenantId, code: acc.code, name: acc.name, type: acc.type },
      });
    }
  }

  private async accountId(tenantId: string, code: string) {
    await this.ensureDefaultAccounts(tenantId);
    const acc = await this.prisma.ledgerAccount.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });
    if (!acc) throw new Error(`Hesap bulunamadı: ${code}`);
    return acc.id;
  }

  async postInvoice(tenantId: string, invoiceId: string) {
    const inv = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { contact: true },
    });
    if (!inv) return;

    const existing = await this.prisma.journalEntry.findFirst({
      where: { tenantId, sourceType: 'INVOICE', sourceId: invoiceId },
    });
    if (existing) return;

    const lines: { code: string; debit: number; credit: number }[] = [];

    if (inv.type === InvoiceType.SALES) {
      lines.push({ code: '120', debit: inv.total, credit: 0 });
      lines.push({ code: '600', debit: 0, credit: inv.subtotal });
      if (inv.vatTotal > 0) lines.push({ code: '391', debit: 0, credit: inv.vatTotal });
    } else if (inv.type === InvoiceType.PURCHASE) {
      lines.push({ code: '153', debit: inv.subtotal, credit: 0 });
      if (inv.vatTotal > 0) lines.push({ code: '191', debit: inv.vatTotal, credit: 0 });
      lines.push({ code: '320', debit: 0, credit: inv.total });
    } else {
      return;
    }

    await this.createEntry(tenantId, {
      description: `Fatura ${inv.series}-${inv.number} — ${inv.contact.name}`,
      reference: `${inv.series}-${inv.number}`,
      sourceType: 'INVOICE',
      sourceId: invoiceId,
      date: inv.date,
      lines,
    });
  }

  async postExpense(tenantId: string, expenseId: string) {
    const exp = await this.prisma.expense.findFirst({ where: { id: expenseId, tenantId } });
    if (!exp) return;

    const existing = await this.prisma.journalEntry.findFirst({
      where: { tenantId, sourceType: 'EXPENSE', sourceId: expenseId },
    });
    if (existing) return;

    const net = exp.amount - exp.vatAmount;
    const lines = [
      { code: '770', debit: net, credit: 0 },
      ...(exp.vatAmount > 0 ? [{ code: '191', debit: exp.vatAmount, credit: 0 }] : []),
      { code: '102', debit: 0, credit: exp.amount },
    ];

    await this.createEntry(tenantId, {
      description: exp.description,
      reference: exp.receiptNo || expenseId,
      sourceType: 'EXPENSE',
      sourceId: expenseId,
      date: exp.expenseDate,
      lines,
    });
  }

  private async createEntry(
    tenantId: string,
    dto: {
      description: string;
      reference?: string;
      sourceType?: string;
      sourceId?: string;
      date?: Date;
      lines: { code: string; debit: number; credit: number }[];
    },
  ) {
    const lineData = await Promise.all(
      dto.lines.map(async (l) => ({
        accountId: await this.accountId(tenantId, l.code),
        debit: l.debit,
        credit: l.credit,
      })),
    );

    return this.prisma.journalEntry.create({
      data: {
        tenantId,
        description: dto.description,
        reference: dto.reference,
        sourceType: dto.sourceType,
        sourceId: dto.sourceId,
        date: dto.date || new Date(),
        lines: { create: lineData },
      },
      include: { lines: { include: { account: true } } },
    });
  }

  async getTrialBalance(tenantId: string, asOf?: string) {
    await this.ensureDefaultAccounts(tenantId);
    const end = asOf ? new Date(asOf + 'T23:59:59') : new Date();

    const accounts = await this.prisma.ledgerAccount.findMany({
      where: { tenantId, isActive: true },
      orderBy: { code: 'asc' },
    });

    const rows = await Promise.all(
      accounts.map(async (acc) => {
        const agg = await this.prisma.journalLine.aggregate({
          where: {
            accountId: acc.id,
            entry: { tenantId, date: { lte: end } },
          },
          _sum: { debit: true, credit: true },
        });
        const debit = agg._sum.debit || 0;
        const credit = agg._sum.credit || 0;
        const balance =
          acc.type === 'ASSET' || acc.type === 'EXPENSE' ? debit - credit : credit - debit;
        return { ...acc, debit, credit, balance };
      }),
    );

    const active = rows.filter((r) => r.debit > 0 || r.credit > 0 || Math.abs(r.balance) > 0.01);
    const totalDebit = active.reduce((s, r) => s + r.debit, 0);
    const totalCredit = active.reduce((s, r) => s + r.credit, 0);

    return { asOf: end.toISOString(), rows: active, totalDebit, totalCredit };
  }

  async getJournalEntries(tenantId: string, query: { page?: number; limit?: number }) {
    const page = Number(query.page) || 1;
    const limit = Math.min(100, Number(query.limit) || 30);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where: { tenantId },
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          lines: { include: { account: { select: { code: true, name: true } } } },
        },
      }),
      this.prisma.journalEntry.count({ where: { tenantId } }),
    ]);

    return { data, total, page, pages: Math.ceil(total / limit) };
  }

  async getIncomeStatement(tenantId: string, startDate: string, endDate: string) {
    await this.ensureDefaultAccounts(tenantId);
    const start = new Date(startDate);
    const end = new Date(endDate + 'T23:59:59');

    const revenueAccounts = await this.prisma.ledgerAccount.findMany({
      where: { tenantId, type: 'REVENUE' },
    });
    const expenseAccounts = await this.prisma.ledgerAccount.findMany({
      where: { tenantId, type: 'EXPENSE' },
    });

    const sumFor = async (accountIds: string[]) => {
      const agg = await this.prisma.journalLine.aggregate({
        where: {
          accountId: { in: accountIds },
          entry: { tenantId, date: { gte: start, lte: end } },
        },
        _sum: { debit: true, credit: true },
      });
      return (agg._sum.credit || 0) - (agg._sum.debit || 0);
    };

    const revenue = await sumFor(revenueAccounts.map((a) => a.id));
    const expenses = await sumFor(expenseAccounts.map((a) => a.id));

    return {
      startDate,
      endDate,
      revenue,
      expenses,
      netIncome: revenue - expenses,
    };
  }
}
