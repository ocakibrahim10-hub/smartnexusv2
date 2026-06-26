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

  async postPayment(tenantId: string, paymentId: string) {
    const payment = await this.prisma.invoicePayment.findFirst({
      where: { id: paymentId, tenantId },
      include: { invoice: { include: { contact: true } } },
    });
    if (!payment) return;

    const existing = await this.prisma.journalEntry.findFirst({
      where: { tenantId, sourceType: 'PAYMENT', sourceId: paymentId },
    });
    if (existing) return;

    const inv = payment.invoice;
    const isOutgoing = inv.type === InvoiceType.PURCHASE || inv.type === InvoiceType.RETURN_SALES;
    const cashCode = payment.paymentType === 'CASH' ? '100' : payment.paymentType === 'CARD' ? '108' : '102';
    
    const lines: { code: string; debit: number; credit: number }[] = [];
    if (isOutgoing) {
      // We pay out: Debit 320, Credit 100/102
      lines.push({ code: '320', debit: payment.amount, credit: 0 });
      lines.push({ code: cashCode, debit: 0, credit: payment.amount });
    } else {
      // We receive money: Debit 100/102, Credit 120
      lines.push({ code: cashCode, debit: payment.amount, credit: 0 });
      lines.push({ code: '120', debit: 0, credit: payment.amount });
    }

    await this.createEntry(tenantId, {
      description: `Tahsilat/Ödeme (${payment.paymentType}) Fatura ${inv.series}-${inv.number}`,
      reference: payment.reference || `${inv.series}-${inv.number}`,
      sourceType: 'PAYMENT',
      sourceId: paymentId,
      date: payment.paidAt,
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

  async getAccounts(tenantId: string) {
    await this.ensureDefaultAccounts(tenantId);
    const accounts = await this.prisma.ledgerAccount.findMany({
      where: { tenantId },
      orderBy: { code: 'asc' },
    });
    // Build tree logic can be done on the frontend or backend.
    // We'll just return the flat list ordered by code, which implicitly groups them.
    return accounts;
  }

  async createAccount(tenantId: string, data: { code: string; name: string; type: string; parentId?: string }) {
    // Validate uniqueness
    const existing = await this.prisma.ledgerAccount.findUnique({
      where: { tenantId_code: { tenantId, code: data.code } },
    });
    if (existing) {
      throw new Error(`Hesap kodu zaten kullanımda: ${data.code}`);
    }

    return this.prisma.ledgerAccount.create({
      data: {
        tenantId,
        code: data.code,
        name: data.name,
        type: data.type,
        parentId: data.parentId,
      },
    });
  }

  async updateAccount(tenantId: string, id: string, data: { code?: string; name?: string; type?: string; isActive?: boolean }) {
    return this.prisma.ledgerAccount.update({
      where: { id, tenantId },
      data,
    });
  }

  async deleteAccount(tenantId: string, id: string) {
    // check if it has lines
    const linesCount = await this.prisma.journalLine.count({
      where: { accountId: id },
    });
    if (linesCount > 0) {
      throw new Error('Hareket görmüş hesap silinemez.');
    }
    return this.prisma.ledgerAccount.delete({
      where: { id, tenantId },
    });
  }

  async getBalanceSheet(tenantId: string, asOf?: string) {
    const trial = await this.getTrialBalance(tenantId, asOf);
    
    // ASSET -> Aktif (Varlıklar)
    const assets = trial.rows.filter(r => r.type === 'ASSET' && r.balance !== 0);
    // LIABILITY -> Pasif (Borçlar)
    const liabilities = trial.rows.filter(r => r.type === 'LIABILITY' && r.balance !== 0);
    // EQUITY -> Özkaynaklar
    const equities = trial.rows.filter(r => r.type === 'EQUITY' && r.balance !== 0);

    const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
    const totalLiabilities = liabilities.reduce((s, l) => s + l.balance, 0);
    const totalEquities = equities.reduce((s, e) => s + e.balance, 0);

    return {
      asOf: trial.asOf,
      assets,
      liabilities,
      equities,
      totalAssets,
      totalLiabilities,
      totalEquities,
      // The accounting equation: Assets = Liabilities + Equities
      // We might need to add net income to equities
    };
  }

  async createManualJournal(tenantId: string, data: { date: string; description: string; reference?: string; lines: { accountId: string; debit: number; credit: number }[] }) {
    const totalDebit = data.lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = data.lines.reduce((s, l) => s + l.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error('Borç ve Alacak toplamı eşit olmalıdır.');
    }

    return this.prisma.journalEntry.create({
      data: {
        tenantId,
        date: new Date(data.date),
        description: data.description,
        reference: data.reference,
        sourceType: 'MANUAL',
        lines: {
          create: data.lines.map(l => ({
            accountId: l.accountId,
            debit: l.debit,
            credit: l.credit,
          })),
        },
      },
      include: {
        lines: { include: { account: true } },
      },
    });
  }

  async getTaxReport(tenantId: string, startDate: string, endDate: string) {
    const endOfDay = endDate + 'T23:59:59';
    // Simplified tax report: aggregates balances of tax-related accounts (e.g. 191, 391 for VAT)
    const tb = await this.getTrialBalance(tenantId, endOfDay);
    
    // Indirilecek KDV (191) and Hesaplanan KDV (391)
    const kdv191 = tb.rows.find((r) => r.code.startsWith('191'))?.balance || 0;
    const kdv391 = tb.rows.find((r) => r.code.startsWith('391'))?.balance || 0;
    
    return {
      period: { startDate, endDate },
      vat: {
        indirilecekKdv: Math.abs(kdv191),
        hesaplananKdv: Math.abs(kdv391),
        odenecekKdv: kdv391 < 0 && Math.abs(kdv391) > Math.abs(kdv191) ? Math.abs(kdv391) - Math.abs(kdv191) : 0,
        devredenKdv: kdv191 > 0 && Math.abs(kdv191) > Math.abs(kdv391) ? Math.abs(kdv191) - Math.abs(kdv391) : 0,
      },
    };
  }
  async getBaBsReport(tenantId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    // Fetch all invoices for the period
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        date: { gte: start, lte: end },
        status: { in: ['APPROVED', 'PAID'] }
      },
      include: { contact: true }
    });

    const baList = {}; // Purchases (Alış)
    const bsList = {}; // Sales (Satış)

    for (const inv of invoices) {
      if (!inv.contact) continue;
      const taxId = inv.contact.taxNo || 'Bilinmiyor';
      const map = inv.type === 'PURCHASE' ? baList : inv.type === 'SALES' ? bsList : null;
      if (!map) continue;

      if (!map[taxId]) {
        map[taxId] = {
          name: inv.contact.name,
          taxNumber: taxId,
          documentCount: 0,
          totalAmount: 0 // subtotal without VAT
        };
      }
      map[taxId].documentCount++;
      map[taxId].totalAmount += inv.subtotal;
    }

    // Filter over 5000 limit
    const filter5000 = (list: any) => Object.values(list).filter((i: any) => i.totalAmount >= 5000);

    return {
      year,
      month,
      ba: filter5000(baList), // Alışlar
      bs: filter5000(bsList)  // Satışlar
    };
  }

  async closePeriod(tenantId: string, endDateStr: string) {
    // A simplified period closing: zero out Income/Expense (6xx) accounts to Retained Earnings (590)
    const endOfDay = endDateStr + 'T23:59:59';
    const tb = await this.getTrialBalance(tenantId, endOfDay);
    
    let netIncome = 0;
    const closingLines: { code: string; debit: number; credit: number }[] = [];

    for (const row of tb.rows) {
      if (row.code.startsWith('6')) {
        if (row.balance > 0) { // debit balance -> expense
          closingLines.push({ code: row.code, debit: 0, credit: row.balance });
          netIncome -= row.balance;
        } else if (row.balance < 0) { // credit balance -> income
          closingLines.push({ code: row.code, debit: Math.abs(row.balance), credit: 0 });
          netIncome += Math.abs(row.balance);
        }
      }
    }

    if (closingLines.length === 0) return { success: false, message: 'Kapatılacak 6xx hesabı bulunamadı.' };

    // Transfer net income to 590
    if (netIncome > 0) {
      closingLines.push({ code: '590', debit: 0, credit: netIncome });
    } else if (netIncome < 0) {
      closingLines.push({ code: '590', debit: Math.abs(netIncome), credit: 0 }); // Actually 591, but keeping simple
    }

    await this.createEntry(tenantId, {
      description: `Dönem Sonu Kapanışı (${endDateStr})`,
      reference: `CLOSE-${endDateStr}`,
      sourceType: 'MANUAL',
      sourceId: `CLOSE-${Date.now()}`,
      date: new Date(endDateStr),
      lines: closingLines
    });

    return { success: true, message: 'Dönem sonu işlemleri tamamlandı.', netIncome };
  }
}
