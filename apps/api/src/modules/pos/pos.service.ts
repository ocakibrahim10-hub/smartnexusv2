import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HuginService } from '../hugin/hugin.service';
import { PaymentType } from '@prisma/client';
import {
  assertSufficientStock,
  resolveSaleQuantityInBase,
  getDefaultWarehouse,
} from '../../common/stock.util';
import { parsePagination } from '../../common/pagination';
import { convertFromBaseUnit } from '../../common/unit-conversion';
import {
  createPosSalesInvoice,
  recordPosPayment,
  resolvePosContact,
} from '../../common/pos-accounting.util';
import { PaymentService } from '../integrations/payments/payment.service';

export interface POSCartLine {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount?: number; // yüzde
  vatRate: number;
  saleUnit?: string;
}

import { HuginModule } from '../hugin/hugin.module';

export interface POSCheckoutDto {
  contactId?: string;
  lines: POSCartLine[];
  paymentType: PaymentType;
  cashGiven?: number;
  cardRef?: string;
  checkNo?: string;
  checkDueDate?: string;
  wireRef?: string;
  printToHugin?: boolean;
  sessionId?: string;
  discount?: number;
  usePaymentGateway?: boolean;
  paymentCard?: {
    holderName: string;
    number: string;
    expireMonth: string;
    expireYear: string;
    cvc: string;
  };
}

@Injectable()
export class POSService {
  constructor(
    private prisma: PrismaService,
    private hugin: HuginService,
    private payments: PaymentService,
  ) {}

  // Ürün arama (barkod veya isim)
  async searchProducts(tenantId: string, q: string) {
    const items = await this.prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        isService: false,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { code: { contains: q, mode: 'insensitive' } },
          { barcode: { contains: q } },
        ],
      },
      include: {
        productUnits: true,
        stockItems: {
          where: { warehouse: { isDefault: true } },
          select: { quantity: true, warehouseId: true },
        },
      },
      take: 20,
    });
    return items.filter((p) => p.stockItems.reduce((s, si) => s + si.quantity, 0) > 0);
  }

  // Tüm kategoriler ve ürünler (POS grid)
  async getProductGrid(tenantId: string, categoryId?: string) {
    const products = await this.prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        isService: false,
        ...(categoryId && { categoryId }),
      },
      include: {
        category: { select: { name: true } },
        productUnits: true,
        stockItems: {
          where: { warehouse: { isDefault: true } },
          select: { quantity: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return products
      .map((p) => {
        const baseStock = p.stockItems.reduce((s, si) => s + si.quantity, 0);
        const saleUnit = p.saleUnit || p.unit;
        let saleStock = baseStock;
        try {
          saleStock = convertFromBaseUnit(baseStock, saleUnit, p.unit, p.productUnits);
        } catch {
          /* keep base */
        }
        return { ...p, baseStock, saleStock, saleUnit };
      })
      .filter((p) => p.baseStock > 0);
  }

  async getCategories(tenantId: string) {
    return this.prisma.productCategory.findMany({
      where: { products: { some: { tenantId, isActive: true } } },
    });
  }

  // Oturum aç
  async openSession(tenantId: string, userId: string, openingCash = 0) {
    return this.prisma.pOSSession.create({
      data: { tenantId, userId, openingCash },
    });
  }

  // Oturum kapat
  async closeSession(tenantId: string, sessionId: string, closingCash: number) {
    const session = await this.prisma.pOSSession.findFirst({ where: { id: sessionId, tenantId } });
    if (!session) throw new NotFoundException('Oturum bulunamadı');

    const receipts = await this.prisma.pOSReceipt.aggregate({
      where: { sessionId, cancelled: false },
      _sum: { total: true },
      _count: true,
    });

    return this.prisma.pOSSession.update({
      where: { id: sessionId },
      data: {
        closedAt: new Date(),
        closingCash,
        totalSales: receipts._sum.total || 0,
        receiptCount: receipts._count,
      },
    });
  }

  // Satış işlemi
  async checkout(tenantId: string, dto: POSCheckoutDto): Promise<any> {
    // Ürün fiyatları ve stok kontrolü
    const productIds = dto.lines.map((l) => l.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, tenantId },
      include: {
        productUnits: true,
        stockItems: { where: { warehouse: { isDefault: true } } },
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Stok kontrolü (satış biriminden temel birime)
    for (const l of dto.lines) {
      const product = productMap.get(l.productId);
      if (!product) throw new NotFoundException(`Ürün bulunamadı: ${l.productId}`);
      if (product.isService || product.type === 'SERVICE') continue;
      const { baseQty } = resolveSaleQuantityInBase(product, l.quantity, l.saleUnit);
      await assertSufficientStock(this.prisma, tenantId, product, baseQty);
    }

    // Satır hesaplamaları
    const lines = dto.lines.map((l) => {
      const product = productMap.get(l.productId);
      if (!product) throw new NotFoundException(`Ürün bulunamadı: ${l.productId}`);

      const discountRate = l.discount || 0;
      const discountedPrice = l.unitPrice * (1 - discountRate / 100);
      const vatRate = l.vatRate ?? product.vatRate ?? 20;
      const vatAmount = (l.quantity * discountedPrice * vatRate) / 100;
      const total = l.quantity * discountedPrice + vatAmount;

      return {
        productId: l.productId,
        description: product.name,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discount: l.discount || 0,
        vatRate,
        vatAmount,
        total,
        _product: product,
      };
    });

    const subtotal = lines.reduce(
      (s, l) => s + l.quantity * l.unitPrice * (1 - l.discount / 100),
      0,
    );
    const vatTotal = lines.reduce((s, l) => s + l.vatAmount, 0);
    const extraDiscount = dto.discount || 0;
    const total = subtotal + vatTotal - extraDiscount;
    const changeAmount = dto.paymentType === 'CASH' && dto.cashGiven ? dto.cashGiven - total : 0;

    let paymentRedirect: string | undefined;
    if (dto.paymentType === 'CARD' && dto.usePaymentGateway) {
      const payResult = await this.payments.charge({
        tenantId,
        amount: total,
        conversationId: `POS-${Date.now()}`,
        buyer: {
          id: dto.contactId || 'guest',
          name: 'Perakende',
          surname: 'Müşteri',
          email: 'pos@smartnexus.local',
        },
        card: dto.paymentCard,
        basketItems: lines.map((l, i) => ({
          id: String(i + 1),
          name: l.description,
          price: l.total,
        })),
        sourceType: 'POS',
        callbackUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pos`,
      });
      if (payResult.status === 'FAILED') {
        throw new BadRequestException(payResult.errorMessage || 'Ödeme başarısız');
      }
      dto.cardRef = payResult.paymentId || payResult.token;
      paymentRedirect = payResult.redirectUrl;
    }

    // Makbuz numarası
    const lastReceipt = await this.prisma.pOSReceipt.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    const receiptNo = `POS-${String((parseInt(lastReceipt?.receiptNo?.replace('POS-', '') || '0') || 0) + 1).padStart(6, '0')}`;

    const defaultWarehouse = await getDefaultWarehouse(this.prisma, tenantId);

    const { receipt, invoice } = await this.prisma.$transaction(async (tx) => {
      const contact = await resolvePosContact(tx, tenantId, dto.contactId);

      const receipt = await tx.pOSReceipt.create({
        data: {
          tenantId,
          sessionId: dto.sessionId || null,
          receiptNo,
          contactId: contact.id,
          subtotal,
          vatTotal,
          discount: extraDiscount,
          total,
          paymentType: dto.paymentType,
          cashGiven: dto.cashGiven,
          changeAmount: changeAmount > 0 ? changeAmount : 0,
          cardRef: dto.cardRef,
          checkNo: dto.checkNo,
          checkDueDate: dto.checkDueDate ? new Date(dto.checkDueDate) : null,
          wireRef: dto.wireRef,
          lines: {
            create: lines.map((l) => ({
              productId: l.productId,
              description: l.description,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              discount: l.discount,
              vatRate: l.vatRate,
              vatAmount: l.vatAmount,
              total: l.total,
            })),
          },
        },
        include: { lines: true, contact: true },
      });

      // Stok düş
      if (defaultWarehouse) {
        for (const line of lines) {
          const product = line._product;
          if (product.isService || product.type === 'SERVICE') continue;
          const cartLine = dto.lines.find((l) => l.productId === line.productId)!;
          const { baseQty, inputUnit, inputQuantity } = resolveSaleQuantityInBase(
            product,
            cartLine.quantity,
            cartLine.saleUnit,
          );
          await tx.stockMovement.create({
            data: {
              tenantId,
              productId: line.productId,
              warehouseId: defaultWarehouse.id,
              type: 'OUT',
              quantity: baseQty,
              inputUnit,
              inputQuantity,
              unitCost: line.unitPrice,
              reference: receiptNo,
              description: 'POS Satış',
            },
          });
          await tx.stockItem.upsert({
            where: {
              productId_warehouseId_tenantId: {
                productId: line.productId,
                warehouseId: defaultWarehouse.id,
                tenantId,
              },
            },
            create: {
              tenantId,
              productId: line.productId,
              warehouseId: defaultWarehouse.id,
              quantity: 0,
            },
            update: { quantity: { decrement: baseQty } },
          });
        }
      }

      // Muhasebe: satış faturası + ödeme (kasa/banka/cari)
      const invoice = await createPosSalesInvoice(tx, tenantId, {
        contactId: contact.id,
        receiptNo,
        subtotal,
        vatTotal,
        total,
        lines,
        paymentType: dto.paymentType,
      });

      await recordPosPayment(tx, tenantId, {
        invoiceId: invoice.id,
        contactId: contact.id,
        receiptId: receipt.id,
        receiptNo,
        paymentType: dto.paymentType,
        amount: total,
        cardRef: dto.cardRef,
        wireRef: dto.wireRef,
        checkNo: dto.checkNo,
        checkDueDate: dto.checkDueDate ? new Date(dto.checkDueDate) : undefined,
      });

      return { receipt, invoice };
    });

    // Hugin S1 yazarkasa
    let huginResult = null;
    if (dto.printToHugin) {
      huginResult = await this.hugin.printReceipt(
        lines.map((l) => ({
          name: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice * (1 - l.discount / 100),
          vatRate: l.vatRate,
          department: 1,
        })),
        [{ type: dto.paymentType === 'CARD' ? 'CARD' : 'CASH', amount: total }],
      );

      if (huginResult.success) {
        await this.prisma.pOSReceipt.update({
          where: { id: receipt.id },
          data: { huginPrinted: true, huginFiscalNo: huginResult.fiscalNo },
        });
      }
    }

    return {
      receipt,
      invoice: {
        id: invoice.id,
        series: invoice.series,
        number: invoice.number,
        status: invoice.status,
      },
      changeAmount: changeAmount > 0 ? changeAmount : 0,
      huginResult,
      paymentRedirect,
    };
  }

  // Makbuz iptal
  async cancelReceipt(tenantId: string, id: string, reason: string) {
    const receipt = await this.prisma.pOSReceipt.findFirst({ where: { id, tenantId } });
    if (!receipt) throw new NotFoundException('Makbuz bulunamadı');
    if (receipt.cancelled) throw new BadRequestException('Makbuz zaten iptal edilmiş');

    // Stok geri al
    const defaultWarehouse = await this.prisma.warehouse.findFirst({
      where: { tenantId, isDefault: true },
    });
    if (defaultWarehouse) {
      const lines = await this.prisma.pOSReceiptLine.findMany({ where: { receiptId: id } });
      for (const line of lines) {
        await this.prisma.stockItem.update({
          where: {
            productId_warehouseId_tenantId: {
              productId: line.productId,
              warehouseId: defaultWarehouse.id,
              tenantId,
            },
          },
          data: { quantity: { increment: line.quantity } },
        });
      }
    }

    return this.prisma.pOSReceipt.update({
      where: { id },
      data: { cancelled: true, cancelReason: reason },
    });
  }

  // Satış geçmişi
  async getHistory(
    tenantId: string,
    query: { page?: number; limit?: number; startDate?: string; endDate?: string },
  ) {
    const { startDate, endDate } = query;
    const { page, limit, skip } = parsePagination(query);

    const where = {
      tenantId,
      ...((startDate || endDate) && {
        createdAt: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
      }),
    };

    const [data, total, summary] = await Promise.all([
      this.prisma.pOSReceipt.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { contact: { select: { name: true } } },
      }),
      this.prisma.pOSReceipt.count({ where }),
      this.prisma.pOSReceipt.aggregate({
        where: { ...where, cancelled: false },
        _sum: { total: true, vatTotal: true },
        _count: true,
      }),
    ]);

    return {
      data,
      total,
      page,
      pages: Math.ceil(total / limit),
      summary: summary._sum,
      count: summary._count,
    };
  }

  async getSessionSummary(tenantId: string, sessionId: string) {
    const session = await this.prisma.pOSSession.findFirst({ where: { id: sessionId, tenantId } });
    if (!session) throw new NotFoundException('Oturum bulunamadı');

    const receipts = await this.prisma.pOSReceipt.findMany({
      where: { sessionId, cancelled: false },
      include: { lines: { include: { product: { select: { name: true } } } } },
    });

    const byPayment = receipts.reduce((acc: any, r) => {
      acc[r.paymentType] = (acc[r.paymentType] || 0) + r.total;
      return acc;
    }, {});

    const total = receipts.reduce((s, r) => s + r.total, 0);
    const vatTotal = receipts.reduce((s, r) => s + r.vatTotal, 0);

    return { session, receipts, byPayment, total, vatTotal, count: receipts.length };
  }
}
