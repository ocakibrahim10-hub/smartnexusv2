import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionType } from '@prisma/client';
import { parsePagination } from '../../common/pagination';
import { TR_BANKS } from '../../common/tr-banks';
import { OpenBankingService } from '../integrations/open-banking/open-banking.service';

@Injectable()
export class CashService {
  constructor(
    private prisma: PrismaService,
    private openBanking: OpenBankingService,
  ) {}

  // ─── KASA ─────────────────────────────────────────────────────────────────

  async getCashAccounts(tenantId: string) {
    return this.prisma.cashAccount.findMany({
      where: { tenantId, isActive: true },
      include: {
        _count: { select: { transactions: true } },
      },
    });
  }

  async createCashAccount(
    tenantId: string,
    dto: { name: string; code?: string; openingBalance?: number; isDefault?: boolean },
  ) {
    if (dto.isDefault) {
      await this.prisma.cashAccount.updateMany({ where: { tenantId }, data: { isDefault: false } });
    }
    return this.prisma.cashAccount.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        balance: dto.openingBalance || 0,
        isDefault: dto.isDefault || false,
      },
    });
  }

  async getCashTransactions(
    tenantId: string,
    cashAccountId: string,
    query: { startDate?: string; endDate?: string; page?: number; limit?: number },
  ) {
    const { startDate, endDate } = query;
    const { page, limit, skip } = parsePagination(query);

    const where = {
      tenantId,
      cashAccountId,
      ...((startDate || endDate) && {
        createdAt: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
      }),
    };

    const [data, total, summary] = await Promise.all([
      this.prisma.cashTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { contact: { select: { name: true } } },
      }),
      this.prisma.cashTransaction.count({ where }),
      this.prisma.cashTransaction.groupBy({
        by: ['type'],
        where,
        _sum: { amount: true },
      }),
    ]);

    const income = summary.find((s) => s.type === TransactionType.INCOME)?._sum.amount || 0;
    const expense = summary.find((s) => s.type === TransactionType.EXPENSE)?._sum.amount || 0;

    return {
      data,
      total,
      page,
      pages: Math.ceil(total / limit),
      income,
      expense,
      net: income - expense,
    };
  }

  async addCashTransaction(
    tenantId: string,
    dto: {
      cashAccountId: string;
      type: TransactionType;
      amount: number;
      description?: string;
      reference?: string;
      contactId?: string;
    },
  ) {
    const account = await this.prisma.cashAccount.findFirst({
      where: { id: dto.cashAccountId, tenantId },
    });
    if (!account) throw new NotFoundException('Kasa hesabı bulunamadı');

    const transaction = await this.prisma.cashTransaction.create({ data: { tenantId, ...dto } });

    const balanceChange = dto.type === TransactionType.INCOME ? dto.amount : -dto.amount;
    await this.prisma.cashAccount.update({
      where: { id: dto.cashAccountId },
      data: { balance: { increment: balanceChange } },
    });

    return transaction;
  }

  // ─── BANKA ────────────────────────────────────────────────────────────────

  async getBankAccounts(tenantId: string) {
    return this.prisma.bankAccount.findMany({ where: { tenantId, isActive: true } });
  }

  async createBankAccount(
    tenantId: string,
    dto: {
      name: string;
      bankName?: string;
      iban?: string;
      accountNo?: string;
      branchCode?: string;
      openingBalance?: number;
      isDefault?: boolean;
    },
  ) {
    if (dto.isDefault) {
      await this.prisma.bankAccount.updateMany({ where: { tenantId }, data: { isDefault: false } });
    }
    return this.prisma.bankAccount.create({
      data: { tenantId, ...dto, balance: dto.openingBalance || 0 },
    });
  }

  async getBankTransactions(tenantId: string, bankAccountId: string, query: any) {
    const { page, limit, skip } = parsePagination(query);
    const where = { tenantId, bankAccountId };

    const [data, total] = await Promise.all([
      this.prisma.bankTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { contact: { select: { name: true } } },
      }),
      this.prisma.bankTransaction.count({ where }),
    ]);

    return { data, total, page, pages: Math.ceil(total / limit) };
  }

  async addBankTransaction(
    tenantId: string,
    dto: {
      bankAccountId: string;
      type: TransactionType;
      amount: number;
      description?: string;
      contactId?: string;
      checkNo?: string;
      checkStatus?: string;
      dueDate?: string;
      reference?: string;
    },
  ) {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id: dto.bankAccountId, tenantId },
    });
    if (!account) throw new NotFoundException('Banka hesabı bulunamadı');

    const transaction = await this.prisma.bankTransaction.create({
      data: {
        tenantId,
        bankAccountId: dto.bankAccountId,
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        contactId: dto.contactId,
        checkNo: dto.checkNo,
        checkStatus: dto.checkStatus as any,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        reference: dto.reference,
      },
    });

    const balanceChange = dto.type === TransactionType.INCOME ? dto.amount : -dto.amount;
    await this.prisma.bankAccount.update({
      where: { id: dto.bankAccountId },
      data: { balance: { increment: balanceChange } },
    });

    return transaction;
  }

  // Virman: Kasa → Banka veya Banka → Kasa
  async transfer(
    tenantId: string,
    dto: {
      fromType: 'CASH' | 'BANK';
      fromId: string;
      toType: 'CASH' | 'BANK';
      toId: string;
      amount: number;
      description?: string;
    },
  ) {
    const desc = dto.description || 'Virman';

    if (dto.fromType === 'CASH') {
      await this.addCashTransaction(tenantId, {
        cashAccountId: dto.fromId,
        type: TransactionType.EXPENSE,
        amount: dto.amount,
        description: desc,
      });
    } else {
      await this.addBankTransaction(tenantId, {
        bankAccountId: dto.fromId,
        type: TransactionType.EXPENSE,
        amount: dto.amount,
        description: desc,
      });
    }

    if (dto.toType === 'CASH') {
      await this.addCashTransaction(tenantId, {
        cashAccountId: dto.toId,
        type: TransactionType.INCOME,
        amount: dto.amount,
        description: desc,
      });
    } else {
      await this.addBankTransaction(tenantId, {
        bankAccountId: dto.toId,
        type: TransactionType.INCOME,
        amount: dto.amount,
        description: desc,
      });
    }

    return { success: true, amount: dto.amount };
  }

  // Nakit akış raporu
  async getCashFlow(tenantId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const cashAccounts = await this.prisma.cashAccount.findMany({
      where: { tenantId, isActive: true },
    });
    const bankAccounts = await this.prisma.bankAccount.findMany({
      where: { tenantId, isActive: true },
    });

    const totalCash = cashAccounts.reduce((s, a) => s + a.balance, 0);
    const totalBank = bankAccounts.reduce((s, a) => s + a.balance, 0);

    // Günlük bazda hareket
    const daily = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const start = new Date(d.setHours(0, 0, 0, 0));
      const end = new Date(d.setHours(23, 59, 59, 999));

      const [cashIn, cashOut] = await Promise.all([
        this.prisma.cashTransaction.aggregate({
          where: { tenantId, type: 'INCOME', createdAt: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        this.prisma.cashTransaction.aggregate({
          where: { tenantId, type: 'EXPENSE', createdAt: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
      ]);

      daily.push({
        date: start.toLocaleDateString('tr-TR'),
        income: cashIn._sum.amount || 0,
        expense: cashOut._sum.amount || 0,
        net: (cashIn._sum.amount || 0) - (cashOut._sum.amount || 0),
      });
    }

    return {
      totalCash,
      totalBank,
      total: totalCash + totalBank,
      cashAccounts,
      bankAccounts,
      daily,
    };
  }

  // ─── ÇEK RAPORU ───────────────────────────────────────────────────────────

  async getChecksReport(tenantId: string, query: { status?: string; daysAhead?: number } = {}) {
    const daysAhead = query.daysAhead ?? 30;
    const now = new Date();
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + daysAhead);

    const where: any = {
      tenantId,
      checkNo: { not: null },
      ...(query.status && { checkStatus: query.status as any }),
    };

    const checks = await this.prisma.bankTransaction.findMany({
      where,
      include: {
        contact: { select: { id: true, name: true, code: true, taxNo: true } },
        bankAccount: { select: { id: true, name: true, bankName: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });

    const byStatus = checks.reduce(
      (acc, c) => {
        const st = c.checkStatus || 'PENDING';
        if (!acc[st]) acc[st] = { count: 0, amount: 0 };
        acc[st].count += 1;
        acc[st].amount += c.amount;
        return acc;
      },
      {} as Record<string, { count: number; amount: number }>,
    );

    const pending = checks.filter((c) => c.checkStatus === 'PENDING' || !c.checkStatus);
    const upcoming = pending.filter((c) => c.dueDate && c.dueDate >= now && c.dueDate <= horizon);
    const overdue = pending.filter((c) => c.dueDate && c.dueDate < now);

    const incoming = checks.filter((c) => c.type === 'INCOME');
    const outgoing = checks.filter((c) => c.type === 'EXPENSE');

    return {
      summary: {
        totalCount: checks.length,
        totalAmount: checks.reduce((s, c) => s + c.amount, 0),
        pendingCount: pending.length,
        pendingAmount: pending.reduce((s, c) => s + c.amount, 0),
        upcomingCount: upcoming.length,
        upcomingAmount: upcoming.reduce((s, c) => s + c.amount, 0),
        overdueCount: overdue.length,
        overdueAmount: overdue.reduce((s, c) => s + c.amount, 0),
        incomingCount: incoming.length,
        incomingAmount: incoming.reduce((s, c) => s + c.amount, 0),
        outgoingCount: outgoing.length,
        outgoingAmount: outgoing.reduce((s, c) => s + c.amount, 0),
      },
      byStatus,
      upcoming: upcoming.map((c) => this.mapCheckRow(c)),
      overdue: overdue.map((c) => this.mapCheckRow(c)),
      all: checks.map((c) => this.mapCheckRow(c)),
    };
  }

  private mapCheckRow(c: any) {
    const daysToDue = c.dueDate
      ? Math.ceil((new Date(c.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;
    return {
      id: c.id,
      checkNo: c.checkNo,
      amount: c.amount,
      type: c.type,
      checkStatus: c.checkStatus || 'PENDING',
      dueDate: c.dueDate,
      daysToDue,
      contactName: c.contact?.name || '—',
      contactId: c.contact?.id,
      bankAccount: c.bankAccount?.name,
      bankName: c.bankAccount?.bankName,
      description: c.description,
      reference: c.reference,
      createdAt: c.createdAt,
    };
  }

  async updateCheckStatus(tenantId: string, id: string, status: string) {
    const tx = await this.prisma.bankTransaction.findFirst({
      where: { id, tenantId, checkNo: { not: null } },
    });
    if (!tx) throw new NotFoundException('Çek kaydı bulunamadı');

    return this.prisma.bankTransaction.update({
      where: { id },
      data: { checkStatus: status as any },
    });
  }

  /** Çek defteri — alınan/verilen çekler */
  async getCheckRegister(
    tenantId: string,
    query: { direction?: string; status?: string; search?: string } = {},
  ) {
    const where: any = { tenantId };
    if (query.direction) where.direction = query.direction;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { checkNo: { contains: query.search, mode: 'insensitive' } },
        { drawerName: { contains: query.search, mode: 'insensitive' } },
        { payeeName: { contains: query.search, mode: 'insensitive' } },
        { contact: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const checks = await this.prisma.checkRegister.findMany({
      where,
      include: {
        contact: { select: { id: true, name: true, code: true, taxNo: true } },
        invoice: { select: { id: true, series: true, number: true, externalNumber: true, type: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });

    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    dayAfterTomorrow.setHours(0, 0, 0, 0);

    const pending = checks.filter((c) => c.status === 'PENDING');
    const dueTomorrow = pending.filter((c) => {
      if (!c.dueDate) return false;
      const d = new Date(c.dueDate);
      d.setHours(0, 0, 0, 0);
      const t = new Date(now);
      t.setHours(0, 0, 0, 0);
      const tm = new Date(tomorrow);
      tm.setHours(0, 0, 0, 0);
      return d.getTime() === tm.getTime();
    });

    return {
      summary: {
        total: checks.length,
        pending: pending.length,
        incoming: checks.filter((c) => c.direction === 'INCOMING').length,
        outgoing: checks.filter((c) => c.direction === 'OUTGOING').length,
        dueTomorrow: dueTomorrow.length,
        overdue: pending.filter((c) => c.dueDate && new Date(c.dueDate) < now).length,
      },
      alerts: dueTomorrow.map((c) => this.mapCheckRegisterRow(c)),
      incoming: checks.filter((c) => c.direction === 'INCOMING').map((c) => this.mapCheckRegisterRow(c)),
      outgoing: checks.filter((c) => c.direction === 'OUTGOING').map((c) => this.mapCheckRegisterRow(c)),
      all: checks.map((c) => this.mapCheckRegisterRow(c)),
    };
  }

  async getCheckAlerts(tenantId: string) {
    const report = await this.getCheckRegister(tenantId, { status: 'PENDING' });
    return {
      count: report.summary.dueTomorrow,
      checks: report.alerts,
    };
  }

  async updateCheckRegisterStatus(tenantId: string, id: string, status: string) {
    const check = await this.prisma.checkRegister.findFirst({ where: { id, tenantId } });
    if (!check) throw new NotFoundException('Çek kaydı bulunamadı');
    return this.prisma.checkRegister.update({
      where: { id },
      data: {
        status: status as any,
        clearedAt: status === 'CLEARED' ? new Date() : undefined,
      },
    });
  }

  private mapCheckRegisterRow(c: any) {
    const daysToDue = c.dueDate
      ? Math.ceil((new Date(c.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;
    return {
      id: c.id,
      direction: c.direction,
      checkNo: c.checkNo,
      amount: c.amount,
      status: c.status,
      dueDate: c.dueDate,
      daysToDue,
      contactName: c.contact?.name,
      contactId: c.contact?.id,
      drawerName: c.drawerName,
      payeeName: c.payeeName,
      bankName: c.bankName,
      branchName: c.branchName,
      description: c.description,
      invoiceNo: c.invoice ? `${c.invoice.series}${c.invoice.number}` : null,
      externalNumber: c.invoice?.externalNumber,
      receivedAt: c.receivedAt,
      givenAt: c.givenAt,
      clearedAt: c.clearedAt,
      createdAt: c.createdAt,
    };
  }

  // ─── BANKA ENTEGRASYONU (Faz 2 temel) ─────────────────────────────────────

  getSupportedBanks() {
    return TR_BANKS;
  }

  /** CSV/JSON ekstre satırlarını içe aktarır — Open Banking öncesi standart ERP adımı */
  async importBankStatement(
    tenantId: string,
    bankAccountId: string,
    lines: Array<{
      date?: string;
      description?: string;
      amount: number;
      reference?: string;
    }>,
  ) {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id: bankAccountId, tenantId },
    });
    if (!account) throw new NotFoundException('Banka hesabı bulunamadı');

    let imported = 0;
    let skipped = 0;
    let balanceDelta = 0;

    for (const line of lines) {
      const externalRef =
        line.reference?.trim() ||
        `IMP-${line.date || 'nodate'}-${line.amount}-${(line.description || '').slice(0, 40)}`;

      const exists = await this.prisma.bankTransaction.findFirst({
        where: { tenantId, bankAccountId, externalRef },
      });
      if (exists) {
        skipped++;
        continue;
      }

      const type = line.amount >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE;
      const amount = Math.abs(line.amount);

      await this.prisma.bankTransaction.create({
        data: {
          tenantId,
          bankAccountId,
          type,
          amount,
          description: line.description || 'Banka ekstresi',
          reference: line.reference,
          externalRef,
          importSource: 'CSV_IMPORT',
          createdAt: line.date ? new Date(line.date) : new Date(),
        },
      });

      balanceDelta += line.amount;
      imported++;
    }

    if (imported > 0) {
      await this.prisma.bankAccount.update({
        where: { id: bankAccountId },
        data: {
          balance: { increment: balanceDelta },
          lastStatementSync: new Date(),
        },
      });
    }

    return { imported, skipped, total: lines.length };
  }

  async getUnreconciledBankTransactions(tenantId: string, bankAccountId: string) {
    return this.prisma.bankTransaction.findMany({
      where: {
        tenantId,
        bankAccountId,
        reconciledAt: null,
        importSource: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async reconcileBankTransaction(
    tenantId: string,
    transactionId: string,
    dto: { invoiceId?: string; contactId?: string },
  ) {
    const tx = await this.prisma.bankTransaction.findFirst({
      where: { id: transactionId, tenantId },
    });
    if (!tx) throw new NotFoundException('Banka hareketi bulunamadı');

    return this.prisma.bankTransaction.update({
      where: { id: transactionId },
      data: {
        reconciledAt: new Date(),
        invoiceId: dto.invoiceId || tx.invoiceId,
        contactId: dto.contactId || tx.contactId,
      },
    });
  }

  /** Open Banking üzerinden banka hareketlerini çeker ve ekstre olarak içe aktarır */
  async syncOpenBanking(
    tenantId: string,
    bankAccountId: string,
    query?: { dateFrom?: string; dateTo?: string },
  ) {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id: bankAccountId, tenantId },
    });
    if (!account) throw new NotFoundException('Banka hesabı bulunamadı');
    if (!account.bankCode) throw new NotFoundException('Banka kodu tanımlı değil');

    const accountRef = account.iban || account.accountNo || bankAccountId;
    const lines = await this.openBanking.fetchTransactions(
      tenantId,
      account.bankCode,
      accountRef,
      query?.dateFrom,
      query?.dateTo,
    );

    const result = await this.importBankStatement(tenantId, bankAccountId, lines);

    await this.prisma.bankAccount.update({
      where: { id: bankAccountId },
      data: { integrationProvider: 'OPEN_BANKING', lastStatementSync: new Date() },
    });

    return { ...result, source: 'OPEN_BANKING' };
  }

  async addQuickSaleCheck(tenantId: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fatura Oluştur (Satış Faturası)
      const invCount = await tx.invoice.count({ where: { tenantId } });
      const nextNum = (invCount + 1).toString().padStart(5, '0');
      
      const invoice = await tx.invoice.create({
        data: {
          tenantId,
          contactId: dto.contactId,
          type: 'SALES',
          status: 'PAID', // Hemen ödenecek
          date: new Date(),
          dueDate: new Date(dto.dueDate),
          total: dto.amount,
          vatTotal: dto.amount * 0.2, // Varsayılan %20 KDV
          subtotal: dto.amount * 0.8,
          notes: 'Hızlı Satış ve Çek Tahsilatı',
          series: 'HZL',
          number: Number(nextNum),
        }
      });

      // 2. Fatura Ödemesi (Çek Türünde)
      const payment = await tx.invoicePayment.create({
        data: {
          tenantId,
          invoiceId: invoice.id,
          paymentType: 'CHECK',
          amount: dto.amount,
          checkNo: dto.checkNo,
          checkDueDate: new Date(dto.dueDate),
          reference: dto.checkNo,
          notes: 'Hızlı Satış Tahsilatı',
          paidAt: new Date()
        }
      });

      // 3. Çek Portföyü Kaydı
      const register = await tx.checkRegister.create({
        data: {
          tenantId,
          direction: 'INCOMING',
          checkNo: dto.checkNo,
          amount: dto.amount,
          dueDate: new Date(dto.dueDate),
          status: 'PENDING',
          contactId: dto.contactId,
          bankName: dto.bankName,
          description: 'Hızlı Satış Çeki',
          invoicePaymentId: payment.id,
          collectionMethod: dto.collectionMethod,
          collectionBankId: dto.collectionBankId || null,
          endorsedContactId: dto.endorsedContactId || null,
          receivedAt: new Date()
        }
      });

      // 4. Eğer Bankaya verildiyse BankTransaction da atılabilir
      if (dto.collectionMethod === 'BANK_COLLECTION' && dto.collectionBankId) {
        await tx.bankTransaction.create({
          data: {
            tenantId,
            bankAccountId: dto.collectionBankId,
            type: 'INCOME',
            amount: dto.amount,
            description: `Müşteri Çeki / Senet Tahsilatı - ${dto.checkNo}`
          }
        });
      }

      return { invoice, payment, register };
    });
  }
}
