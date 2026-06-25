import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceType, InvoiceStatus, Prisma } from '@prisma/client';
import { parsePagination } from '../../common/pagination';
import { PlanLimitsService } from '../../common/plan-limits.service';
import { LedgerService } from '../../common/ledger.service';
import { EInvoiceProviderFactory } from './einvoice/einvoice-provider.factory';
import { decrementStock, incrementStock } from '../../common/stock.util';
import { UyumsoftSoapClient } from '../integrations/einvoice/uyumsoft-soap.client';
import { ConfigService } from '@nestjs/config';
import { parseUblInvoiceXml } from '../../common/ubl-tr.parser';

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private planLimits: PlanLimitsService,
    private eInvoiceFactory: EInvoiceProviderFactory,
    private ledger: LedgerService,
    private uyumsoft: UyumsoftSoapClient,
    private config: ConfigService,
  ) {}

  async findAll(
    tenantId: string,
    query: {
      type?: InvoiceType;
      status?: InvoiceStatus;
      contactId?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
      search?: string;
    },
  ) {
    const { type, status, contactId, startDate, endDate, search } = query;
    const { page, limit, skip } = parsePagination(query);

    const where: Prisma.InvoiceWhereInput = {
      tenantId,
      ...(type && { type }),
      ...(status && { status }),
      ...(contactId && { contactId }),
      ...((startDate || endDate) && {
        date: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
      }),
      ...(search && { OR: [{ contact: { name: { contains: search, mode: 'insensitive' } } }] }),
    };

    const [rawData, total, summary] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          contact: { select: { name: true, taxNo: true } },
          payments: { select: { amount: true } },
        },
      }),
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.aggregate({
        where,
        _sum: { total: true, vatTotal: true, subtotal: true },
        _count: true,
      }),
    ]);

    const data = rawData.map(({ payments, ...inv }) => ({
      ...inv,
      invoiceNo: `${inv.series}${inv.number}`,
      paidAmount: payments.reduce((s, p) => s + p.amount, 0),
    }));

    return { data, total, page, limit, pages: Math.ceil(total / limit), summary: summary._sum };
  }

  async findOne(tenantId: string, id: string) {
    const inv = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        contact: true,
        lines: {
          include: {
            product: { select: { id: true, name: true, code: true, unit: true, barcode: true, vatRate: true } },
          },
        },
        payments: true,
      },
    });
    if (!inv) throw new NotFoundException('Fatura bulunamadı');
    return {
      ...inv,
      invoiceNo: `${inv.series}${inv.number}`,
    };
  }

  async create(
    tenantId: string,
    dto: {
      type: InvoiceType;
      contactId: string;
      date: string;
      dueDate?: string;
      series?: string;
      externalNumber?: string;
      notes?: string;
      autoCreateProducts?: boolean;
      lines: {
        productId?: string;
        description: string;
        barcode?: string;
        unit?: string;
        quantity: number;
        unitPrice: number;
        vatRate: number;
        autoCreate?: boolean;
      }[];
    },
  ) {
    const resolvedLines = await Promise.all(
      dto.lines.map(async (l) => {
        const match = await this.resolveProductLine(tenantId, l, dto.autoCreateProducts !== false);
        return { ...l, productId: match.productId, _created: match.created, _warning: match.warning };
      }),
    );

    const warnings = resolvedLines.filter((l) => l._warning).map((l) => l._warning);

    // Sıradaki fatura numarası
    const lastInvoice = await this.prisma.invoice.findFirst({
      where: { tenantId, type: dto.type, series: dto.series || 'SNX' },
      orderBy: { number: 'desc' },
    });
    const number = (lastInvoice?.number || 0) + 1;

    // Satır hesaplamaları
    const lines = resolvedLines.map((l) => {
      const vatAmount = (l.quantity * l.unitPrice * l.vatRate) / 100;
      const total = l.quantity * l.unitPrice + vatAmount;
      return { ...l, vatAmount, total };
    });

    const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
    const vatTotal = lines.reduce((s, l) => s + l.vatAmount, 0);
    const total = subtotal + vatTotal;

    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId,
        type: dto.type,
        status: InvoiceStatus.DRAFT,
        series: dto.series || 'SNX',
        number,
        externalNumber: dto.externalNumber || null,
        date: new Date(dto.date),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        contactId: dto.contactId,
        notes: dto.notes,
        subtotal,
        vatTotal,
        total,
        lines: {
          create: lines.map((l) => ({
            productId: l.productId || null,
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            vatRate: l.vatRate,
            vatAmount: l.vatAmount,
            total: l.total,
          })),
        },
      },
      include: { lines: true, contact: true },
    });

    // Stok hareketi
    if (dto.type === InvoiceType.SALES) {
      await this.createStockMovements(tenantId, invoice.id, lines, 'OUT');
    } else if (dto.type === InvoiceType.PURCHASE) {
      await this.createStockMovements(tenantId, invoice.id, lines, 'IN');
      // Alış fiyatını güncelle
      for (const line of lines) {
        if (line.productId) {
          await this.prisma.product.update({
            where: { id: line.productId },
            data: { purchasePrice: line.unitPrice },
          });
        }
      }
    }

    return { ...invoice, warnings, createdProducts: resolvedLines.filter((l) => l._created).length };
  }

  /** Gelen e-faturadan alış faturası oluşturur */
  async importPurchaseFromEInvoice(
    tenantId: string,
    dto: {
      contactId: string;
      date?: string;
      dueDate?: string;
      externalNumber?: string;
      eInvoiceId?: string;
      series?: string;
      notes?: string;
      autoCreateProducts?: boolean;
      lines: Array<{
        description: string;
        barcode?: string;
        unit?: string;
        quantity: number;
        unitPrice: number;
        vatRate: number;
      }>;
    },
  ) {
    return this.create(tenantId, {
      type: InvoiceType.PURCHASE,
      contactId: dto.contactId,
      date: dto.date || new Date().toISOString().split('T')[0],
      dueDate: dto.dueDate,
      series: dto.series || 'AF',
      externalNumber: dto.externalNumber || dto.eInvoiceId,
      notes: dto.notes || (dto.eInvoiceId ? `E-Fatura: ${dto.eInvoiceId}` : undefined),
      autoCreateProducts: dto.autoCreateProducts !== false,
      lines: dto.lines,
    });
  }

  /** Uyumsoft gelen kutusundan alış faturalarını çeker */
  async syncInboxPurchases(
    tenantId: string,
    opts?: { startDate?: string; endDate?: string; autoApprove?: boolean },
  ) {
    const endDate = opts?.endDate || new Date().toISOString().split('T')[0];
    const startDate =
      opts?.startDate ||
      new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

    const inbox = await this.uyumsoft.getInboxInvoices(startDate, endDate);
    const result = {
      startDate,
      endDate,
      total: inbox.length,
      imported: 0,
      skipped: 0,
      errors: [] as { id: string; message: string }[],
      invoices: [] as { id: string; invoiceId: string; number: string }[],
    };

    for (const item of inbox) {
      const existingLog = await this.prisma.eDocumentSyncLog.findUnique({
        where: {
          tenantId_documentType_externalId: {
            tenantId,
            documentType: 'INBOX_INVOICE',
            externalId: item.id,
          },
        },
      });
      if (existingLog?.status === 'SYNCED') {
        result.skipped++;
        continue;
      }

      try {
        const xml = await this.uyumsoft.getInboxInvoiceData(item.id);
        const parsed = parseUblInvoiceXml(xml);
        const externalRef = parsed.uuid || item.id;
        const extNumber = parsed.invoiceNumber || externalRef;

        const dup = await this.prisma.invoice.findFirst({
          where: {
            tenantId,
            type: InvoiceType.PURCHASE,
            OR: [{ externalNumber: extNumber }, { notes: { contains: externalRef } }],
          },
        });
        if (dup) {
          await this.prisma.eDocumentSyncLog.upsert({
            where: {
              tenantId_documentType_externalId: {
                tenantId,
                documentType: 'INBOX_INVOICE',
                externalId: item.id,
              },
            },
            create: {
              tenantId,
              documentType: 'INBOX_INVOICE',
              externalId: item.id,
              localRef: dup.id,
              status: 'DUPLICATE',
            },
            update: { localRef: dup.id, status: 'DUPLICATE' },
          });
          result.skipped++;
          continue;
        }

        const taxNo = parsed.supplierTaxNo || item.senderVkn || undefined;
        let contact = taxNo
          ? await this.prisma.contact.findFirst({
              where: { tenantId, taxNo },
            })
          : null;
        if (!contact) {
          contact = await this.prisma.contact.create({
            data: {
              tenantId,
              name: parsed.supplierName || item.senderName || 'Tedarikçi',
              taxNo,
              type: 'SUPPLIER',
            },
          });
        }

        const invoice = await this.importPurchaseFromEInvoice(tenantId, {
          contactId: contact.id,
          date: parsed.issueDate || item.date,
          externalNumber: extNumber,
          eInvoiceId: externalRef,
          notes: `E-Fatura: ${externalRef}`,
          autoCreateProducts: true,
          lines: parsed.lines.length ? parsed.lines : [{ description: 'Kalem', quantity: 1, unitPrice: parsed.subtotal || 0, vatRate: 20 }],
        });

        if (opts?.autoApprove && invoice.id) {
          await this.approve(tenantId, invoice.id);
        }

        await this.prisma.eDocumentSyncLog.upsert({
          where: {
            tenantId_documentType_externalId: {
              tenantId,
              documentType: 'INBOX_INVOICE',
              externalId: item.id,
            },
          },
          create: {
            tenantId,
            documentType: 'INBOX_INVOICE',
            externalId: item.id,
            localRef: invoice.id,
            status: 'SYNCED',
          },
          update: { localRef: invoice.id, status: 'SYNCED' },
        });

        result.imported++;
        result.invoices.push({ id: item.id, invoiceId: invoice.id, number: extNumber });
      } catch (err: any) {
        result.errors.push({ id: item.id, message: err?.message || 'İçe aktarma hatası' });
      }
    }

    return result;
  }

  /** Ürün adı/barkod ile eşleştirme — autocomplete için */
  async matchProducts(tenantId: string, q: string, limit = 10) {
    if (!q || q.length < 1) return [];
    return this.prisma.product.findMany({
      where: {
        tenantId,
        deletedAt: null,
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { code: { contains: q, mode: 'insensitive' } },
          { barcode: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: limit,
      select: {
        id: true,
        name: true,
        code: true,
        barcode: true,
        unit: true,
        vatRate: true,
        purchasePrice: true,
        salePrice: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  private async resolveProductLine(
    tenantId: string,
    line: {
      productId?: string;
      description: string;
      barcode?: string;
      unit?: string;
      unitPrice?: number;
      vatRate?: number;
      autoCreate?: boolean;
    },
    defaultAutoCreate: boolean,
  ): Promise<{ productId?: string; created?: boolean; warning?: string }> {
    if (line.productId) return { productId: line.productId };

    if (line.barcode) {
      const byBarcode = await this.prisma.product.findFirst({
        where: { tenantId, barcode: line.barcode, deletedAt: null },
      });
      if (byBarcode) return { productId: byBarcode.id };
    }

    const name = line.description?.trim();
    if (name) {
      const exact = await this.prisma.product.findFirst({
        where: { tenantId, deletedAt: null, name: { equals: name, mode: 'insensitive' } },
      });
      if (exact) return { productId: exact.id };

      const fuzzy = await this.prisma.product.findMany({
        where: { tenantId, deletedAt: null, name: { contains: name, mode: 'insensitive' } },
        take: 2,
      });
      if (fuzzy.length === 1) return { productId: fuzzy[0].id };
    }

    const shouldCreate = line.autoCreate ?? defaultAutoCreate;
    if (!shouldCreate) {
      return { warning: `"${name}" stok kartında bulunamadı` };
    }

    const barcode = line.barcode || (await this.generateNextBarcode(tenantId));
    const last = await this.prisma.product.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: { code: true },
    });
    const num = last?.code?.match(/\d+/)?.[0];
    const code = `PRD-${String(parseInt(num || '0') + 1).padStart(4, '0')}`;

    const product = await this.prisma.product.create({
      data: {
        tenantId,
        code,
        name: name || 'İsimsiz Ürün',
        barcode,
        unit: line.unit || 'ADET',
        vatRate: line.vatRate ?? 20,
        purchasePrice: line.unitPrice ?? 0,
        salePrice: 0,
        type: 'PRODUCT',
      },
    });

    const warehouse = await this.prisma.warehouse.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { isDefault: 'desc' },
    });
    if (warehouse) {
      await this.prisma.stockItem.upsert({
        where: {
          productId_warehouseId_tenantId: {
            productId: product.id,
            warehouseId: warehouse.id,
            tenantId,
          },
        },
        create: { tenantId, productId: product.id, warehouseId: warehouse.id, quantity: 0 },
        update: {},
      });
    }

    return { productId: product.id, created: true };
  }

  private async generateNextBarcode(tenantId: string): Promise<string> {
    const count = await this.prisma.product.count({ where: { tenantId } });
    const base = String(count + 1).padStart(8, '0');
    return `869${base}${String((count * 7) % 10)}`;
  }

  async approve(tenantId: string, id: string) {
    const inv = await this.findOne(tenantId, id);
    if (inv.status !== InvoiceStatus.DRAFT)
      throw new BadRequestException('Sadece taslak faturalar onaylanabilir');
    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.APPROVED },
    });
    await this.ledger.postInvoice(tenantId, id);
    return updated;
  }

  async addPayment(
    tenantId: string,
    invoiceId: string,
    dto: {
      paymentType: string;
      amount: number;
      paidAt?: string;
      cashAccountId?: string;
      bankAccountId?: string;
      reference?: string;
      notes?: string;
      checkNo?: string;
      checkDueDate?: string;
      drawerName?: string;
      payeeName?: string;
      bankName?: string;
    },
  ) {
    const inv = await this.findOne(tenantId, invoiceId);
    const totalPaid = inv.payments.reduce((s, p) => s + p.amount, 0);
    if (totalPaid + dto.amount > inv.total + 0.01)
      throw new BadRequestException('Ödeme tutarı fatura toplamını aşıyor');

    const paymentType = (dto.paymentType || 'CASH') as any;
    if (paymentType === 'CHECK' && (!dto.checkNo || !dto.checkDueDate)) {
      throw new BadRequestException('Çek ödemesi için çek no ve vade tarihi zorunludur');
    }

    const isPurchase =
      inv.type === InvoiceType.PURCHASE || inv.type === InvoiceType.RETURN_SALES;
    const isOutgoing = isPurchase;
    const cashTxType = isOutgoing ? 'EXPENSE' : 'INCOME';
    const invoiceLabel = `${inv.series}${inv.number}`;

    const payment = await this.prisma.invoicePayment.create({
      data: {
        tenantId,
        invoiceId,
        paymentType,
        amount: dto.amount,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
        cashAccountId: dto.cashAccountId,
        bankAccountId: dto.bankAccountId,
        reference: dto.reference,
        notes: dto.notes,
        checkNo: dto.checkNo,
        checkDueDate: dto.checkDueDate ? new Date(dto.checkDueDate) : null,
      },
    });

    // Kasa hareketi
    if (dto.cashAccountId) {
      await this.prisma.cashTransaction.create({
        data: {
          tenantId,
          cashAccountId: dto.cashAccountId,
          type: cashTxType as any,
          amount: dto.amount,
          description: isOutgoing
            ? `Alış faturası ödemesi: ${invoiceLabel}`
            : `Fatura tahsilat: ${invoiceLabel}`,
          reference: invoiceLabel,
          contactId: inv.contactId,
          invoiceId,
        },
      });
      await this.prisma.cashAccount.update({
        where: { id: dto.cashAccountId },
        data: { balance: isOutgoing ? { decrement: dto.amount } : { increment: dto.amount } },
      });
    }

    // Banka hareketi (EFT, kredi kartı, çek)
    if (dto.bankAccountId && paymentType !== 'CASH') {
      await this.prisma.bankTransaction.create({
        data: {
          tenantId,
          bankAccountId: dto.bankAccountId,
          type: cashTxType as any,
          amount: dto.amount,
          description: isOutgoing
            ? `Alış faturası ödemesi: ${invoiceLabel}`
            : `Fatura tahsilat: ${invoiceLabel}`,
          reference: dto.reference || invoiceLabel,
          contactId: inv.contactId,
          invoiceId,
          checkNo: paymentType === 'CHECK' ? dto.checkNo : undefined,
          checkStatus: paymentType === 'CHECK' ? 'PENDING' : undefined,
          dueDate: paymentType === 'CHECK' && dto.checkDueDate ? new Date(dto.checkDueDate) : undefined,
        },
      });
      await this.prisma.bankAccount.update({
        where: { id: dto.bankAccountId },
        data: { balance: isOutgoing ? { decrement: dto.amount } : { increment: dto.amount } },
      });
    }

    // Çek defteri
    if (paymentType === 'CHECK' && dto.checkDueDate) {
      await this.prisma.checkRegister.create({
        data: {
          tenantId,
          direction: isOutgoing ? 'OUTGOING' : 'INCOMING',
          checkNo: dto.checkNo!,
          amount: dto.amount,
          dueDate: new Date(dto.checkDueDate),
          status: 'PENDING',
          contactId: inv.contactId,
          drawerName: dto.drawerName,
          payeeName: dto.payeeName,
          bankName: dto.bankName,
          description: dto.notes,
          invoiceId,
          invoicePaymentId: payment.id,
          receivedAt: isOutgoing ? undefined : new Date(),
          givenAt: isOutgoing ? new Date() : undefined,
        },
      });
    }

    // Fatura durumu
    const newTotal = totalPaid + dto.amount;
    const newStatus =
      newTotal >= inv.total - 0.01
        ? InvoiceStatus.PAID
        : newTotal > 0
          ? ('PARTIAL' as InvoiceStatus)
          : inv.status;
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: newStatus },
    });

    // Cari bakiye
    await this.prisma.contact.update({
      where: { id: inv.contactId },
      data: { balance: isOutgoing ? { increment: dto.amount } : { decrement: dto.amount } },
    });

    return payment;
  }

  async cancel(tenantId: string, id: string, reason?: string) {
    const inv = await this.findOne(tenantId, id);
    if (inv.status === InvoiceStatus.CANCELLED)
      throw new BadRequestException('Fatura zaten iptal edilmiş');
    return this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.CANCELLED, notes: reason ? `İptal: ${reason}` : inv.notes },
    });
  }

  // ─── E-Dönüşüm ────────────────────────────────────────────────────────────

  async sendEInvoice(tenantId: string, id: string) {
    const inv = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        contact: { select: { name: true, taxNo: true, email: true } },
        lines: true,
      },
    });
    if (!inv) throw new NotFoundException('Fatura bulunamadı');
    if (inv.status === InvoiceStatus.DRAFT)
      throw new BadRequestException('Taslak fatura e-fatura olarak gönderilemez');
    if ((inv as any).eStatus === 'SENT' || (inv as any).eStatus === 'ACCEPTED')
      throw new BadRequestException('Fatura zaten gönderildi');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (tenant) await this.planLimits.assertCanSendEInvoice(tenantId, tenant.plan);

    const provider = this.eInvoiceFactory.getProvider();
    const result = await provider.send({
      id: inv.id,
      code: `${inv.series}-${inv.number}`,
      type: inv.type,
      total: inv.total,
      vatTotal: inv.vatTotal,
      contact: inv.contact,
      lines: inv.lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        vatRate: l.vatRate,
        total: l.total,
      })),
    });

    return this.prisma.invoice.update({
      where: { id },
      data: { eInvoiceId: result.eInvoiceId, eStatus: result.eStatus as any },
    });
  }

  async cancelEInvoice(tenantId: string, id: string) {
    const inv = await this.findOne(tenantId, id);
    if (!(inv as any).eInvoiceId) throw new BadRequestException('Bu fatura e-fatura değil');
    const provider = this.eInvoiceFactory.getProvider();
    if (provider.name !== 'mock') {
      await provider.cancel((inv as any).eInvoiceId);
    }
    return this.prisma.invoice.update({
      where: { id },
      data: { eStatus: 'CANCELLED' as any },
    });
  }

  async acceptEInvoice(tenantId: string, id: string) {
    const inv = await this.findOne(tenantId, id);
    if ((inv as any).eStatus !== 'SENT')
      throw new BadRequestException('Sadece gönderilmiş e-faturalar kabul edilebilir');
    return this.prisma.invoice.update({
      where: { id },
      data: { eStatus: 'ACCEPTED' as any },
    });
  }

  async rejectEInvoice(tenantId: string, id: string) {
    const inv = await this.findOne(tenantId, id);
    if ((inv as any).eStatus !== 'SENT')
      throw new BadRequestException('Sadece gönderilmiş e-faturalar reddedilebilir');
    return this.prisma.invoice.update({
      where: { id },
      data: { eStatus: 'REJECTED' as any },
    });
  }

  async getEInvoiceStats(tenantId: string) {
    const [sent, accepted, rejected, pending] = await Promise.all([
      this.prisma.invoice.count({ where: { tenantId, eStatus: 'SENT' as any } }),
      this.prisma.invoice.count({ where: { tenantId, eStatus: 'ACCEPTED' as any } }),
      this.prisma.invoice.count({ where: { tenantId, eStatus: 'REJECTED' as any } }),
      this.prisma.invoice.count({ where: { tenantId, eStatus: 'PENDING' as any } }),
    ]);
    return { sent, accepted, rejected, pending, total: sent + accepted + rejected + pending };
  }

  private async createStockMovements(
    tenantId: string,
    invoiceId: string,
    lines: { productId?: string; quantity: number; unitPrice?: number }[],
    direction: 'IN' | 'OUT',
  ) {
    for (const line of lines) {
      if (!line.productId) continue;
      const opts = {
        reference: invoiceId,
        description: direction === 'OUT' ? 'Satış faturası çıkışı' : 'Alış faturası girişi',
        unitCost: line.unitPrice,
      };
      if (direction === 'OUT') {
        await decrementStock(this.prisma, tenantId, line.productId, line.quantity, opts);
      } else {
        await incrementStock(this.prisma, tenantId, line.productId, line.quantity, opts);
      }
    }
  }
}
