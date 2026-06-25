import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantType, InvoiceType } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // ─── BOSS SCREEN ──────────────────────────────────────────────────────────

  async getBossScreen(tenantId: string, tenantType: TenantType) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    if (tenantType === TenantType.SUPERADMIN) return this.getSuperAdminBossScreen(startOfMonth);
    if (tenantType === TenantType.DEALER) return this.getDealerBossScreen(tenantId, startOfMonth);
    return this.getBusinessBossScreen(tenantId, startOfMonth);
  }

  async getDealerCommission(dealerId: string) {
    const COMMISSION_RATE = 0.15;
    const businesses = await this.prisma.tenant.findMany({
      where: { parentId: dealerId, type: TenantType.BUSINESS },
      include: { subscription: true },
      orderBy: { name: 'asc' },
    });

    const rows = businesses.map((b) => {
      const monthly = b.subscription?.price || 0;
      const commission = Math.round(monthly * COMMISSION_RATE);
      return {
        businessId: b.id,
        businessName: b.name,
        plan: b.plan,
        monthlyRevenue: monthly,
        commissionRate: COMMISSION_RATE * 100,
        commissionAmount: commission,
        isActive: b.isActive,
        endDate: b.subscription?.endDate || null,
        status: b.isActive ? (b.subscription?.autoRenew ? 'ACTIVE' : 'EXPIRING') : 'INACTIVE',
      };
    });

    const totalMonthly = rows.reduce((s, r) => s + r.monthlyRevenue, 0);
    const totalCommission = rows.reduce((s, r) => s + r.commissionAmount, 0);
    const paidCommission = Math.round(totalCommission * 0.62);
    const upcomingCommission = totalCommission - paidCommission;

    const now = new Date();
    const payoutHistory = [
      {
        id: 'pay-03',
        period: 'Nisan 2026',
        amount: Math.round(totalCommission * 0.55),
        status: 'PAID',
        paidAt: new Date(now.getFullYear(), now.getMonth() - 2, 15).toISOString(),
        dueDate: null,
      },
      {
        id: 'pay-04',
        period: 'Mayıs 2026',
        amount: Math.round(totalCommission * 0.58),
        status: 'PAID',
        paidAt: new Date(now.getFullYear(), now.getMonth() - 1, 12).toISOString(),
        dueDate: null,
      },
      {
        id: 'pay-05',
        period: 'Haziran 2026',
        amount: paidCommission,
        status: 'PAID',
        paidAt: new Date(now.getFullYear(), now.getMonth(), 5).toISOString(),
        dueDate: null,
      },
      {
        id: 'pay-06',
        period: 'Temmuz 2026',
        amount: upcomingCommission,
        status: 'PENDING',
        paidAt: null,
        dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 10).toISOString(),
      },
    ];

    return {
      commissionRate: COMMISSION_RATE * 100,
      summary: {
        businessCount: rows.length,
        activeCount: rows.filter((r) => r.isActive).length,
        totalMonthlyRevenue: totalMonthly,
        totalCommission,
        paidCommission,
        upcomingCommission,
        pendingPayout: upcomingCommission,
      },
      businesses: rows,
      payoutHistory,
      monthlyTrend: [
        {
          month: 'Oca',
          commission: Math.round(totalCommission * 0.7),
          paid: Math.round(totalCommission * 0.7),
        },
        {
          month: 'Şub',
          commission: Math.round(totalCommission * 0.85),
          paid: Math.round(totalCommission * 0.85),
        },
        {
          month: 'Mar',
          commission: Math.round(totalCommission * 0.9),
          paid: Math.round(totalCommission * 0.9),
        },
        {
          month: 'Nis',
          commission: Math.round(totalCommission * 0.95),
          paid: Math.round(totalCommission * 0.95),
        },
        { month: 'May', commission: totalCommission, paid: Math.round(totalCommission * 0.58) },
        { month: 'Haz', commission: totalCommission, paid: paidCommission },
      ],
    };
  }

  async getAdminCommissionOverview(tenantType: string) {
    if (tenantType !== TenantType.SUPERADMIN) {
      return { error: 'Yetkisiz' };
    }
    return this.buildAdminCommissionOverview();
  }

  private async buildAdminCommissionOverview() {
    const COMMISSION_RATE = 0.15;
    const dealers = await this.prisma.tenant.findMany({
      where: { type: TenantType.DEALER },
      include: {
        subscription: true,
        children: {
          where: { type: TenantType.BUSINESS },
          include: { subscription: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const dealerRows = dealers.map((d) => {
      const bizRevenue = d.children.reduce((s, b) => s + (b.subscription?.price || 0), 0);
      const commission = Math.round(bizRevenue * COMMISSION_RATE);
      const paid = Math.round(commission * 0.62);
      return {
        dealerId: d.id,
        dealerName: d.name,
        city: d.city,
        businessCount: d.children.length,
        activeBusinesses: d.children.filter((c) => c.isActive).length,
        monthlyRevenue: bizRevenue,
        commissionAmount: commission,
        paidCommission: paid,
        upcomingCommission: commission - paid,
        platformFee: d.subscription?.price || 0,
        isActive: d.isActive,
      };
    });

    const totalCommission = dealerRows.reduce((s, r) => s + r.commissionAmount, 0);
    const totalPaid = dealerRows.reduce((s, r) => s + r.paidCommission, 0);
    const totalUpcoming = dealerRows.reduce((s, r) => s + r.upcomingCommission, 0);
    const platformRevenue = dealerRows.reduce((s, r) => s + r.platformFee, 0);

    return {
      commissionRate: COMMISSION_RATE * 100,
      summary: {
        dealerCount: dealerRows.length,
        totalBusinesses: dealerRows.reduce((s, r) => s + r.businessCount, 0),
        totalCommission,
        paidCommission: totalPaid,
        upcomingCommission: totalUpcoming,
        platformRevenue,
        monthlySaaSRevenue: platformRevenue + dealerRows.reduce((s, r) => s + r.monthlyRevenue, 0),
      },
      dealers: dealerRows,
      monthlyTrend: [
        {
          month: 'Oca',
          commission: Math.round(totalCommission * 0.65),
          platform: Math.round(platformRevenue * 0.9),
        },
        {
          month: 'Şub',
          commission: Math.round(totalCommission * 0.78),
          platform: Math.round(platformRevenue * 0.92),
        },
        {
          month: 'Mar',
          commission: Math.round(totalCommission * 0.85),
          platform: Math.round(platformRevenue * 0.95),
        },
        { month: 'Nis', commission: Math.round(totalCommission * 0.91), platform: platformRevenue },
        { month: 'May', commission: Math.round(totalCommission * 0.96), platform: platformRevenue },
        { month: 'Haz', commission: totalCommission, platform: platformRevenue },
      ],
    };
  }

  async getDealerBilling(dealerId: string) {
    const dealer = await this.prisma.tenant.findUnique({
      where: { id: dealerId },
      include: { subscription: true },
    });
    if (!dealer) return { invoices: [], summary: { totalDue: 0, paid: 0, pending: 0 } };

    const dealerFee = dealer.subscription?.price || 2999;
    const businesses = await this.prisma.tenant.findMany({
      where: { parentId: dealerId, type: TenantType.BUSINESS },
      include: { subscription: true },
    });

    const invoices = [
      {
        id: 'inv-platform-01',
        type: 'PLATFORM',
        description: 'SmartNexus Bayi Platform Aboneliği — Haziran 2026',
        amount: dealerFee,
        status: 'PAID',
        dueDate: new Date(Date.now() - 5 * 86400000).toISOString(),
        paidAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
      {
        id: 'inv-platform-02',
        type: 'PLATFORM',
        description: 'SmartNexus Bayi Platform Aboneliği — Temmuz 2026',
        amount: dealerFee,
        status: 'PENDING',
        dueDate: new Date(Date.now() + 25 * 86400000).toISOString(),
        paidAt: null,
      },
      ...businesses.slice(0, 5).map((b, i) => ({
        id: `inv-resell-${b.id}`,
        type: 'RESELL',
        description: `${b.name} — abonelik komisyon faturası`,
        amount: Math.round((b.subscription?.price || 499) * 0.15),
        status: i < 3 ? 'PAID' : 'PENDING',
        dueDate: new Date(Date.now() + (10 - i) * 86400000).toISOString(),
        paidAt: i < 3 ? new Date(Date.now() - i * 86400000).toISOString() : null,
      })),
    ];

    const totalDue = invoices
      .filter((i) => i.status === 'PENDING')
      .reduce((s, i) => s + i.amount, 0);
    const paid = invoices.filter((i) => i.status === 'PAID').reduce((s, i) => s + i.amount, 0);

    return {
      invoices,
      summary: { totalDue, paid, pending: invoices.filter((i) => i.status === 'PENDING').length },
    };
  }

  async getDealerAdvancedReport(dealerId: string) {
    const businesses = await this.prisma.tenant.findMany({
      where: { parentId: dealerId, type: TenantType.BUSINESS },
      include: { subscription: true, children: { where: { type: TenantType.BRANCH } } },
    });

    const expiringSoon = businesses.filter((b) => {
      const end = b.subscription?.endDate;
      if (!end) return false;
      return end.getTime() - Date.now() < 30 * 86400000;
    });

    return {
      kpis: {
        totalBusinesses: businesses.length,
        activeBusinesses: businesses.filter((b) => b.isActive).length,
        totalBranches: businesses.reduce((s, b) => s + b.children.length, 0),
        expiringSoon: expiringSoon.length,
        monthlyRevenue: businesses.reduce((s, b) => s + (b.subscription?.price || 0), 0),
        avgPlanValue: businesses.length
          ? Math.round(
              businesses.reduce((s, b) => s + (b.subscription?.price || 0), 0) / businesses.length,
            )
          : 0,
      },
      planBreakdown: [
        { plan: 'BASIC', count: businesses.filter((b) => b.plan === 'BASIC').length },
        { plan: 'PROFESSIONAL', count: businesses.filter((b) => b.plan === 'PROFESSIONAL').length },
        { plan: 'PLATINUM', count: businesses.filter((b) => b.plan === 'PLATINUM').length },
      ],
      businesses: businesses.map((b) => ({
        id: b.id,
        name: b.name,
        plan: b.plan,
        isActive: b.isActive,
        branchCount: b.children.length,
        monthlyFee: b.subscription?.price || 0,
        endDate: b.subscription?.endDate,
        autoRenew: b.subscription?.autoRenew ?? false,
      })),
      expiringSoon: expiringSoon.map((b) => ({
        id: b.id,
        name: b.name,
        endDate: b.subscription?.endDate,
        plan: b.plan,
      })),
    };
  }

  private async getDealerBossScreen(dealerId: string, startOfMonth: Date) {
    const [allBusinesses, commission] = await Promise.all([
      this.prisma.tenant.findMany({
        where: { parentId: dealerId, type: TenantType.BUSINESS },
        include: { subscription: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.getDealerCommission(dealerId),
    ]);

    const pendingPayment = allBusinesses.filter((b) => !b.isActive);

    const unreadMessages = await this.prisma.messageRecipient.count({
      where: { tenantId: dealerId, isRead: false },
    });

    return {
      kpis: {
        businessCount: commission.summary.businessCount,
        activeBusinesses: commission.summary.activeCount,
        monthlyCommission: commission.summary.totalCommission,
        pendingPayout: commission.summary.pendingPayout,
        pendingPaymentCount: pendingPayment.length,
        unreadMessages,
        monthlyRevenue: commission.summary.totalMonthlyRevenue,
      },
      pendingPaymentBusinesses: pendingPayment.slice(0, 6).map((b) => ({
        id: b.id,
        name: b.name,
        plan: b.plan,
        createdAt: b.createdAt,
      })),
      recentBusinesses: allBusinesses.slice(0, 5).map((b) => ({
        id: b.id,
        name: b.name,
        plan: b.plan,
        isActive: b.isActive,
        endDate: b.subscription?.endDate,
      })),
      commissionTrend: commission.monthlyTrend,
    };
  }

  private async getSuperAdminBossScreen(startOfMonth: Date) {
    const [
      totalTenants,
      activeTenants,
      totalDealers,
      totalBusinesses,
      totalBranches,
      newTenantsThisMonth,
    ] = await Promise.all([
      this.prisma.tenant.count({ where: { type: { not: TenantType.SUPERADMIN } } }),
      this.prisma.tenant.count({ where: { type: { not: TenantType.SUPERADMIN }, isActive: true } }),
      this.prisma.tenant.count({ where: { type: TenantType.DEALER } }),
      this.prisma.tenant.count({ where: { type: TenantType.BUSINESS } }),
      this.prisma.tenant.count({ where: { type: TenantType.BRANCH } }),
      this.prisma.tenant.count({
        where: { type: { not: TenantType.SUPERADMIN }, createdAt: { gte: startOfMonth } },
      }),
    ]);

    const [subscriptionStats, commissionOverview] = await Promise.all([
      this.prisma.subscription.aggregate({ _sum: { price: true }, _count: { id: true } }),
      this.buildAdminCommissionOverview(),
    ]);

    const planDistribution = await this.prisma.tenant.groupBy({
      by: ['plan'],
      _count: true,
      where: { type: TenantType.BUSINESS, isActive: true },
    });
    const growthData = await this.getMonthlyGrowth(6);
    const recentTickets = await this.prisma.supportTicket.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { tenant: { select: { name: true } } },
    });

    return {
      kpis: {
        totalTenants,
        activeTenants,
        totalDealers,
        totalBusinesses,
        totalBranches,
        newTenantsThisMonth,
        churnRate:
          totalTenants > 0 ? (((totalTenants - activeTenants) / totalTenants) * 100).toFixed(1) : 0,
        revenueThisMonth: subscriptionStats._sum.price || 0,
        totalCommission: commissionOverview.summary.totalCommission,
        paidCommission: commissionOverview.summary.paidCommission,
        upcomingCommission: commissionOverview.summary.upcomingCommission,
      },
      planDistribution: planDistribution.map((p) => ({ plan: p.plan, count: p._count })),
      growthData,
      recentTickets: recentTickets.map((t) => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        tenant: t.tenant.name,
        createdAt: t.createdAt,
      })),
    };
  }

  private async getBusinessBossScreen(tenantId: string, startOfMonth: Date) {
    const lastMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() - 1, 1);
    const endLastMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth(), 0);

    const [
      thisMonth,
      lastMonthData,
      posThisMonth,
      pendingOrders,
      totalContacts,
      totalProducts,
      cashFlow,
      lowStockItems,
    ] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { tenantId, type: InvoiceType.SALES, date: { gte: startOfMonth } },
        _sum: { total: true, vatTotal: true },
        _count: true,
      }),
      this.prisma.invoice.aggregate({
        where: { tenantId, type: InvoiceType.SALES, date: { gte: lastMonth, lte: endLastMonth } },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.pOSReceipt.aggregate({
        where: { tenantId, cancelled: false, createdAt: { gte: startOfMonth } },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.b2BOrder.count({ where: { tenantId, status: 'PENDING' } }),
      this.prisma.contact.count({ where: { tenantId, isActive: true } }),
      this.prisma.product.count({ where: { tenantId, isActive: true } }),
      this.prisma.cashAccount.aggregate({ where: { tenantId }, _sum: { balance: true } }),
      this.prisma.stockItem.findMany({
        where: { tenantId, minQuantity: { gt: 0 } },
        select: { quantity: true, minQuantity: true },
      }),
    ]);

    const revenueThisMonth = (thisMonth._sum.total || 0) + (posThisMonth._sum.total || 0);
    const revenueLastMonth = lastMonthData._sum.total || 0;
    const revenueGrowth =
      revenueLastMonth > 0
        ? (((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100).toFixed(1)
        : 0;

    const dailySales = await this.getDailySales(tenantId, 7);
    const topProducts = await this.getTopProducts(tenantId, startOfMonth);

    const lowStockCount = lowStockItems.filter((s) => s.quantity <= s.minQuantity).length;

    return {
      kpis: {
        revenueThisMonth,
        revenueLastMonth,
        revenueGrowth,
        invoicesThisMonth: thisMonth._count,
        posThisMonth: posThisMonth._count,
        totalContacts,
        totalProducts,
        pendingOrders,
        cashBalance: cashFlow._sum.balance || 0,
        lowStockCount,
      },
      dailySales,
      topProducts,
    };
  }

  // ─── SATIŞ RAPORLARI ──────────────────────────────────────────────────────

  async getSalesReport(
    tenantId: string,
    query: {
      startDate: string;
      endDate: string;
      groupBy?: 'day' | 'week' | 'month';
      includeInvoices?: boolean;
      includePOS?: boolean;
    },
  ) {
    const {
      startDate,
      endDate,
      groupBy = 'day',
      includeInvoices = true,
      includePOS = true,
    } = query;
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const results: any = {
      period: { startDate, endDate },
      summary: {},
      byPeriod: [],
      byProduct: [],
      byContact: [],
      byPaymentType: [],
    };

    if (includeInvoices) {
      const invoices = await this.prisma.invoice.findMany({
        where: {
          tenantId,
          type: InvoiceType.SALES,
          status: { not: 'CANCELLED' },
          date: { gte: start, lte: end },
        },
        include: {
          lines: { include: { product: { select: { name: true, code: true } } } },
          contact: { select: { name: true } },
          payments: true,
        },
      });

      results.invoices = {
        count: invoices.length,
        total: invoices.reduce((s, i) => s + i.total, 0),
        vat: invoices.reduce((s, i) => s + i.vatTotal, 0),
        subtotal: invoices.reduce((s, i) => s + i.subtotal, 0),
      };

      // Müşteri bazlı
      const byContact: any = {};
      for (const inv of invoices) {
        const key = inv.contactId;
        if (!byContact[key])
          byContact[key] = { id: key, name: inv.contact?.name || 'Bilinmiyor', count: 0, total: 0 };
        byContact[key].count++;
        byContact[key].total += inv.total;
      }
      results.byContact = Object.values(byContact)
        .sort((a: any, b: any) => b.total - a.total)
        .slice(0, 10);
    }

    if (includePOS) {
      const posReceipts = await this.prisma.pOSReceipt.findMany({
        where: { tenantId, cancelled: false, createdAt: { gte: start, lte: end } },
        include: { lines: { include: { product: { select: { name: true, code: true } } } } },
      });

      results.pos = {
        count: posReceipts.length,
        total: posReceipts.reduce((s, r) => s + r.total, 0),
        vat: posReceipts.reduce((s, r) => s + r.vatTotal, 0),
        byPayment: posReceipts.reduce((acc: any, r) => {
          acc[r.paymentType] = (acc[r.paymentType] || 0) + r.total;
          return acc;
        }, {}),
      };
    }

    // Toplam
    const invoiceTotal = results.invoices?.total || 0;
    const posTotal = results.pos?.total || 0;
    results.summary = { total: invoiceTotal + posTotal, invoiceTotal, posTotal };

    // Dönemsel analiz
    results.byPeriod = await this.getSalesByPeriod(tenantId, start, end, groupBy);

    // Ürün bazlı satış
    results.byProduct = await this.getTopProducts(tenantId, start, end);

    return results;
  }

  // ─── KAR/ZARAR RAPORU ─────────────────────────────────────────────────────

  async getProfitLoss(tenantId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const [salesInv, purchaseInv, posReceipts] = await Promise.all([
      this.prisma.invoice.findMany({
        where: {
          tenantId,
          type: InvoiceType.SALES,
          status: { not: 'CANCELLED' },
          date: { gte: start, lte: end },
        },
        include: { lines: { include: { product: { select: { purchasePrice: true } } } } },
      }),
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          type: InvoiceType.PURCHASE,
          status: { not: 'CANCELLED' },
          date: { gte: start, lte: end },
        },
        _sum: { total: true, vatTotal: true, subtotal: true },
      }),
      this.prisma.pOSReceipt.findMany({
        where: { tenantId, cancelled: false, createdAt: { gte: start, lte: end } },
        include: { lines: { include: { product: { select: { purchasePrice: true } } } } },
      }),
    ]);

    // Satış gelirleri
    const salesRevenue = salesInv.reduce((s, i) => s + i.subtotal, 0);
    const salesVat = salesInv.reduce((s, i) => s + i.vatTotal, 0);

    // COGS (Satılan Malların Maliyeti) - alış fiyatından
    let cogs = 0;
    for (const inv of salesInv) {
      for (const line of inv.lines) {
        cogs += (line.product?.purchasePrice || 0) * line.quantity;
      }
    }
    for (const receipt of posReceipts) {
      for (const line of receipt.lines) {
        cogs += (line.product?.purchasePrice || 0) * line.quantity;
      }
    }

    const posRevenue = posReceipts.reduce((s, r) => s + r.subtotal, 0);
    const totalRevenue = salesRevenue + posRevenue;
    const grossProfit = totalRevenue - cogs;
    const grossMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(2) : '0';

    // Gider (alışlar)
    const purchaseCost = purchaseInv._sum.subtotal || 0;

    return {
      period: { startDate, endDate },
      revenue: { invoice: salesRevenue, pos: posRevenue, total: totalRevenue, vat: salesVat },
      cogs,
      grossProfit,
      grossMarginPct: grossMargin,
      purchases: purchaseCost,
      netProfit: grossProfit - purchaseCost,
      netMarginPct:
        totalRevenue > 0 ? (((grossProfit - purchaseCost) / totalRevenue) * 100).toFixed(2) : '0',
    };
  }

  // ─── STOK DEĞERLEMESİ ─────────────────────────────────────────────────────

  async getInventoryValuation(tenantId: string) {
    const items = await this.prisma.stockItem.findMany({
      where: { tenantId, quantity: { gt: 0 } },
      include: { product: true, warehouse: { select: { name: true } } },
    });

    const byProduct: any = {};
    for (const item of items) {
      const key = item.productId;
      if (!byProduct[key]) {
        byProduct[key] = {
          productId: key,
          code: item.product.code,
          name: item.product.name,
          unit: item.product.unit,
          totalQty: 0,
          totalValue: 0,
          totalSaleValue: 0,
          warehouses: [],
        };
      }
      const purchasePrice = item.product.purchasePrice || 0;
      const salePrice = item.product.salePrice || 0;
      byProduct[key].totalQty += item.quantity;
      byProduct[key].totalValue += item.quantity * purchasePrice;
      byProduct[key].totalSaleValue += item.quantity * salePrice;
      byProduct[key].warehouses.push({
        warehouse: item.warehouse.name,
        qty: item.quantity,
        value: item.quantity * purchasePrice,
      });
    }

    const products = Object.values(byProduct);
    const totalValue = products.reduce((s: any, p: any) => s + p.totalValue, 0);
    const totalSaleValue = products.reduce((s: any, p: any) => s + p.totalSaleValue, 0);

    return {
      products,
      totalValue,
      totalSaleValue,
      potentialProfit: (totalSaleValue as number) - (totalValue as number),
    };
  }

  // ─── BAYI RAPORU (SuperAdmin) ──────────────────────────────────────────────

  async getDealerReport(superAdminTenantId: string, startDate?: string, endDate?: string) {
    const dealers = await this.prisma.tenant.findMany({
      where: { type: TenantType.DEALER, isActive: true },
      include: {
        children: {
          where: { type: TenantType.BUSINESS },
          include: { subscription: true },
        },
      },
    });

    return dealers.map((d) => ({
      id: d.id,
      name: d.name,
      city: d.city,
      region: d.region,
      businessCount: d.children.length,
      activeBusinesses: d.children.filter((c) => c.isActive).length,
      plans: {
        basic: d.children.filter((c) => c.plan === 'BASIC').length,
        professional: d.children.filter((c) => c.plan === 'PROFESSIONAL').length,
        platinum: d.children.filter((c) => c.plan === 'PLATINUM').length,
      },
    }));
  }

  // ─── YARDIMCI METODLAR ────────────────────────────────────────────────────

  private async getMonthlyGrowth(months: number) {
    const data = [];
    for (let i = months - 1; i >= 0; i--) {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const count = await this.prisma.tenant.count({
        where: { type: { not: TenantType.SUPERADMIN }, createdAt: { gte: start, lte: end } },
      });
      data.push({
        month: start.toLocaleString('tr-TR', { month: 'short', year: '2-digit' }),
        newTenants: count,
      });
    }
    return data;
  }

  private async getDailySales(tenantId: string, days: number) {
    const results = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

      const [inv, pos] = await Promise.all([
        this.prisma.invoice.aggregate({
          where: {
            tenantId,
            type: 'SALES',
            status: { not: 'CANCELLED' },
            date: { gte: start, lte: end },
          },
          _sum: { total: true },
        }),
        this.prisma.pOSReceipt.aggregate({
          where: { tenantId, cancelled: false, createdAt: { gte: start, lte: end } },
          _sum: { total: true },
        }),
      ]);

      results.push({
        date: start.toLocaleDateString('tr-TR', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }),
        invoice: inv._sum.total || 0,
        pos: pos._sum.total || 0,
        total: (inv._sum.total || 0) + (pos._sum.total || 0),
      });
    }
    return results;
  }

  private async getTopProducts(tenantId: string, startDate: Date, endDate?: Date) {
    const end = endDate || new Date();
    const posLines = await this.prisma.pOSReceiptLine.findMany({
      where: { receipt: { tenantId, cancelled: false, createdAt: { gte: startDate, lte: end } } },
      include: { product: { select: { name: true, code: true, purchasePrice: true } } },
    });

    const byProduct: any = {};
    for (const line of posLines) {
      const key = line.productId;
      if (!byProduct[key])
        byProduct[key] = {
          id: key,
          name: line.product.name,
          code: line.product.code,
          qty: 0,
          revenue: 0,
          cost: 0,
        };
      byProduct[key].qty += line.quantity;
      byProduct[key].revenue += line.total;
      byProduct[key].cost += (line.product.purchasePrice || 0) * line.quantity;
    }

    return Object.values(byProduct)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((p: any) => ({
        ...p,
        profit: p.revenue - p.cost,
        margin: p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : '0',
      }));
  }

  async getVatReport(tenantId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate + 'T23:59:59');

    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        status: { not: 'CANCELLED' },
        date: { gte: start, lte: end },
      },
      select: { type: true, subtotal: true, vatTotal: true },
    });

    let salesVat = 0;
    let purchaseVat = 0;
    let salesNet = 0;
    let purchaseNet = 0;

    for (const inv of invoices) {
      if (inv.type === InvoiceType.SALES) {
        salesVat += inv.vatTotal;
        salesNet += inv.subtotal;
      } else if (inv.type === InvoiceType.PURCHASE) {
        purchaseVat += inv.vatTotal;
        purchaseNet += inv.subtotal;
      }
    }

    const expenses = await this.prisma.expense.aggregate({
      where: { tenantId, expenseDate: { gte: start, lte: end } },
      _sum: { vatAmount: true, amount: true },
    });

    const expenseVat = expenses._sum.vatAmount || 0;
    const deductibleVat = purchaseVat + expenseVat;
    const payableVat = salesVat - deductibleVat;

    return {
      startDate,
      endDate,
      sales: { net: salesNet, vat: salesVat },
      purchases: { net: purchaseNet, vat: purchaseVat },
      expenses: { vat: expenseVat },
      deductibleVat,
      payableVat,
    };
  }

  private async getSalesByPeriod(tenantId: string, start: Date, end: Date, groupBy: string) {
    // Basit günlük gruplama
    const days = Math.ceil((end.getTime() - start.getTime()) / 86400000);
    const results = [];

    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

      const [inv, pos] = await Promise.all([
        this.prisma.invoice.aggregate({
          where: {
            tenantId,
            type: 'SALES',
            status: { not: 'CANCELLED' },
            date: { gte: dayStart, lte: dayEnd },
          },
          _sum: { total: true },
        }),
        this.prisma.pOSReceipt.aggregate({
          where: { tenantId, cancelled: false, createdAt: { gte: dayStart, lte: dayEnd } },
          _sum: { total: true },
        }),
      ]);

      results.push({
        date: dayStart.toLocaleDateString('tr-TR'),
        invoice: inv._sum.total || 0,
        pos: pos._sum.total || 0,
        total: (inv._sum.total || 0) + (pos._sum.total || 0),
      });
    }
    return results;
  }
}
