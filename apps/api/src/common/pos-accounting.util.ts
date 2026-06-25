import { PrismaService } from '../prisma/prisma.service';
import { InvoiceStatus, InvoiceType, PaymentType, Prisma } from '@prisma/client';

type DbClient = PrismaService | Prisma.TransactionClient;

const RETAIL_CONTACT_CODE = 'PERAKENDE';

export async function ensureRetailContact(db: DbClient, tenantId: string) {
  const existing = await db.contact.findFirst({
    where: { tenantId, code: RETAIL_CONTACT_CODE },
  });
  if (existing) return existing;

  return db.contact.create({
    data: {
      tenantId,
      code: RETAIL_CONTACT_CODE,
      name: 'Perakende Müşteri',
      type: 'CUSTOMER',
      isActive: true,
    },
  });
}

export async function ensureDefaultCashAccount(db: DbClient, tenantId: string) {
  let account = await db.cashAccount.findFirst({
    where: { tenantId, isDefault: true, isActive: true },
  });
  if (account) return account;

  account = await db.cashAccount.findFirst({
    where: { tenantId, isActive: true },
    orderBy: { createdAt: 'asc' },
  });
  if (account) {
    await db.cashAccount.updateMany({ where: { tenantId }, data: { isDefault: false } });
    return db.cashAccount.update({ where: { id: account.id }, data: { isDefault: true } });
  }

  return db.cashAccount.create({
    data: {
      tenantId,
      name: 'Ana Kasa',
      code: 'KSA-001',
      currency: 'TRY',
      balance: 0,
      isDefault: true,
      isActive: true,
    },
  });
}

export async function ensureDefaultBankAccount(db: DbClient, tenantId: string) {
  let account = await db.bankAccount.findFirst({
    where: { tenantId, isDefault: true, isActive: true },
  });
  if (account) return account;

  account = await db.bankAccount.findFirst({
    where: { tenantId, isActive: true },
    orderBy: { createdAt: 'asc' },
  });
  if (account) {
    await db.bankAccount.updateMany({ where: { tenantId }, data: { isDefault: false } });
    return db.bankAccount.update({ where: { id: account.id }, data: { isDefault: true } });
  }

  return db.bankAccount.create({
    data: {
      tenantId,
      name: 'Ana Banka Hesabı',
      bankName: 'Banka',
      currency: 'TRY',
      balance: 0,
      isDefault: true,
      isActive: true,
    },
  });
}

export async function resolvePosContact(db: DbClient, tenantId: string, contactId?: string | null) {
  if (contactId) {
    const contact = await db.contact.findFirst({
      where: { id: contactId, tenantId, isActive: true },
    });
    if (contact) return contact;
  }
  return ensureRetailContact(db, tenantId);
}

type PosLine = {
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  vatRate: number;
  vatAmount: number;
  total: number;
};

export async function createPosSalesInvoice(
  tx: Prisma.TransactionClient,
  tenantId: string,
  params: {
    contactId: string;
    receiptNo: string;
    subtotal: number;
    vatTotal: number;
    total: number;
    lines: PosLine[];
    paymentType: PaymentType;
  },
) {
  const lastInvoice = await tx.invoice.findFirst({
    where: { tenantId, type: InvoiceType.SALES, series: 'POS' },
    orderBy: { number: 'desc' },
  });
  const number = (lastInvoice?.number || 0) + 1;
  const isCredit = params.paymentType === PaymentType.CREDIT;

  return tx.invoice.create({
    data: {
      tenantId,
      type: InvoiceType.SALES,
      status: isCredit ? InvoiceStatus.APPROVED : InvoiceStatus.PAID,
      series: 'POS',
      number,
      date: new Date(),
      contactId: params.contactId,
      subtotal: params.subtotal,
      vatTotal: params.vatTotal,
      total: params.total,
      notes: `POS Satış: ${params.receiptNo}`,
      lines: {
        create: params.lines.map((l) => ({
          productId: l.productId,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice * (1 - l.discount / 100),
          vatRate: l.vatRate,
          vatAmount: l.vatAmount,
          total: l.total,
        })),
      },
    },
  });
}

export async function recordPosPayment(
  tx: Prisma.TransactionClient,
  tenantId: string,
  params: {
    invoiceId: string;
    contactId: string;
    receiptId: string;
    receiptNo: string;
    paymentType: PaymentType;
    amount: number;
    cardRef?: string;
    wireRef?: string;
    checkNo?: string;
    checkDueDate?: Date;
  },
) {
  const { paymentType, amount } = params;
  if (paymentType === PaymentType.CREDIT) {
    await tx.contact.update({
      where: { id: params.contactId },
      data: { balance: { increment: amount } },
    });
    return;
  }

  let cashAccountId: string | undefined;
  let bankAccountId: string | undefined;
  let reference = params.receiptNo;

  if (paymentType === PaymentType.CASH) {
    const cash = await ensureDefaultCashAccount(tx, tenantId);
    cashAccountId = cash.id;
    await tx.cashTransaction.create({
      data: {
        tenantId,
        cashAccountId: cash.id,
        type: 'INCOME',
        amount,
        description: `POS Satış: ${params.receiptNo}`,
        reference: params.receiptNo,
        contactId: params.contactId,
        invoiceId: params.invoiceId,
        posReceiptId: params.receiptId,
      },
    });
    await tx.cashAccount.update({
      where: { id: cash.id },
      data: { balance: { increment: amount } },
    });
  } else if (
    paymentType === PaymentType.CARD ||
    paymentType === PaymentType.WIRE ||
    paymentType === PaymentType.CHECK
  ) {
    const bank = await ensureDefaultBankAccount(tx, tenantId);
    bankAccountId = bank.id;
    reference = params.cardRef || params.wireRef || params.checkNo || params.receiptNo;
    await tx.bankTransaction.create({
      data: {
        tenantId,
        bankAccountId: bank.id,
        type: 'INCOME',
        amount,
        description: `POS Satış (${paymentType}): ${params.receiptNo}`,
        reference,
        contactId: params.contactId,
        invoiceId: params.invoiceId,
        checkNo: params.checkNo,
        checkStatus: paymentType === PaymentType.CHECK ? 'PENDING' : undefined,
        dueDate: params.checkDueDate,
      },
    });
    await tx.bankAccount.update({
      where: { id: bank.id },
      data: { balance: { increment: amount } },
    });
  }

  await tx.invoicePayment.create({
    data: {
      tenantId,
      invoiceId: params.invoiceId,
      paymentType,
      amount,
      cashAccountId,
      bankAccountId,
      reference,
      notes: `POS: ${params.receiptNo}`,
    },
  });
}
