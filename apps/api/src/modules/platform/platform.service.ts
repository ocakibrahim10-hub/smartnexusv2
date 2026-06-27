import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentService } from '../integrations/payments/payment.service';
import {
  DEFAULT_PLAN_MODULES,
  getModuleLabel,
} from '../../common/plan-modules';
import { applyDiscount, subscriptionRemainingDays, buildSubscriptionQuoteBreakdown } from '../../common/pricing.util';
import { mergeAddonModules } from '../../common/addon-module-map';
import { expandLegacyModules } from '../../common/module-catalog';
import {
  CHATBOT_SETTING_KEY,
  DEFAULT_CHATBOT_CONFIG,
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_OLLAMA_MODEL,
  isOllamaMemoryError,
  isMaskedSecret,
  maskSecret,
  normalizeOllamaModel,
  OLLAMA_FALLBACK_MODELS,
  OLLAMA_LIGHT_MODEL,
  ollamaMemoryHelp,
  parseChatbotConfig,
  type ChatbotConfig,
} from '../../common/chatbot-config';
import {
  TenantType,
  AddonModuleCode,
  CommissionInvoiceStatus,
  PlatformNotificationType,
} from '@prisma/client';
import {
  documentsForContext,
  LEGAL_DOCUMENTS,
  LEGAL_DOCUMENT_VERSION,
  type LegalDocumentId,
} from '../../common/legal-documents';

import {
  SUBSCRIPTION_SELLABLE_CODES,
  filterAddonsForPlan,
  isAddonPurchasableForPlan,
} from '../../common/subscription-addons.util';
import {
  buildDefaultSubmodulePricing,
  getPurchasableExtraModules,
  isExtraModulePurchasable,
  pricingMap,
  sumSubmodulePrices,
  type SubmodulePricingRow,
} from '../../common/submodule-pricing.util';
import {
  edocumentKontorCodes,
  mergeKontorModulesForDisplay,
} from '../../common/kontor-display.util';

const KONTOR_LOW_THRESHOLD = 50;
const KONTOR_MODULE_CODES: AddonModuleCode[] = ['EINVOICE', 'EARCHIVE', 'SMS'];

function isKontorModule(code: AddonModuleCode, flag?: boolean) {
  return flag === true || KONTOR_MODULE_CODES.includes(code);
}

type Period = 'day' | 'week' | 'month' | 'year';

@Injectable()
export class PlatformService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => PaymentService))
    private paymentService: PaymentService,
  ) {}

  private periodStart(period: Period): Date {
    const now = new Date();
    if (period === 'day') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (period === 'week') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d;
    }
    if (period === 'year') return new Date(now.getFullYear(), 0, 1);
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  // ─── System Health ────────────────────────────────────────────────────────

  async getSystemHealth() {
    const checks = [
      { id: 'api', name: 'API Sunucusu', status: 'OK', latencyMs: 12 },
      { id: 'db', name: 'PostgreSQL', status: 'OK', latencyMs: 8 },
    ];

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      checks[1].status = 'ERROR';
    }

    const integrations = await this.prisma.tenantIntegration.groupBy({
      by: ['type', 'provider'],
      _count: { id: true },
      where: { isActive: true },
    });

    const moduleHealth = [
      { code: 'EINVOICE', name: 'E-Fatura / E-Arşiv', status: 'OK', activeTenants: 0 },
      { code: 'OPEN_BANKING', name: 'Open Banking', status: 'OK', activeTenants: 0 },
      { code: 'PAYMENT', name: 'Ödeme (PayTR/iyzico)', status: 'OK', activeTenants: 0 },
      { code: 'EMAIL', name: 'E-posta (Resend)', status: 'OK', activeTenants: 0 },
      { code: 'SMS', name: 'SMS (Netgsm)', status: 'OK', activeTenants: 0 },
    ].map((m) => {
      const match = integrations.find((i) => i.type === m.code);
      return { ...m, activeTenants: match?._count.id ?? 0, status: match ? 'OK' : 'WARNING' };
    });

    const errors = await this.prisma.tenantIntegration.findMany({
      where: { lastError: { not: null } },
      take: 10,
      select: { tenantId: true, type: true, provider: true, lastError: true, lastSyncAt: true },
    });

    const failedPayments = await this.prisma.paymentTransaction.count({
      where: { status: 'FAILED', createdAt: { gte: this.periodStart('day') } },
    });

    return {
      overall: checks.every((c) => c.status === 'OK') ? 'HEALTHY' : 'DEGRADED',
      checkedAt: new Date().toISOString(),
      infrastructure: checks,
      modules: moduleHealth,
      recentErrors: errors,
      stats: {
        failedPaymentsToday: failedPayments,
        openTickets: await this.prisma.supportTicket.count({ where: { status: 'OPEN' } }),
      },
    };
  }

  // ─── Addon Modules & Kontor Packages ──────────────────────────────────────

  async listAddonModules() {
    return this.prisma.addonModule.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { kontorPackages: { where: { isActive: true }, orderBy: { quantity: 'asc' } } },
    });
  }

  async listSubscriptionAddons() {
    return this.prisma.addonModule.findMany({
      where: {
        code: { in: SUBSCRIPTION_SELLABLE_CODES },
        isActive: true,
        isKontorBased: false,
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async listKontorModules() {
    const rows = await this.prisma.addonModule.findMany({
      where: { code: { in: KONTOR_MODULE_CODES }, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { kontorPackages: { where: { isActive: true }, orderBy: { quantity: 'asc' } } },
    });
    return mergeKontorModulesForDisplay(rows as any);
  }

  async getPublicPricing() {
    const submoduleRows = await this.ensureSubmodulePricing();
    const priceMap = pricingMap(submoduleRows);
    
    const activeCampaigns = await this.getActivePriceCampaigns();

    const applyCampaign = (price: number, targetId: string, isPlan: boolean) => {
      let newPrice = price;
      let maxDiscount = 0;
      for (const camp of activeCampaigns) {
        const isMatch = camp.target === 'ALL' || 
                       (camp.target === 'PLAN' && isPlan && (camp.targetIds.length === 0 || camp.targetIds.includes(targetId))) || 
                       (camp.target === 'MODULE' && !isPlan && (camp.targetIds.length === 0 || camp.targetIds.includes(targetId)));
        
        if (isMatch) {
          if (camp.type === 'DISCOUNT') {
            maxDiscount = Math.max(maxDiscount, camp.percent);
          } else if (camp.type === 'INCREASE') {
            newPrice = newPrice * (1 + camp.percent / 100);
          }
        }
      }
      return { adjustedPrice: newPrice, extraDiscount: maxDiscount };
    };

    const templates = await this.prisma.planTemplate.findMany({ orderBy: { plan: 'asc' } });
    const plans =
      templates.length > 0
        ? templates.map((t) => {
            const { adjustedPrice, extraDiscount } = applyCampaign(t.price ?? DEFAULT_PLAN_MODULES[t.plan]?.price ?? 0, t.plan, true);
            return {
              plan: t.plan,
              price: adjustedPrice,
              discountPercent: Math.min(100, (t.discountPercent ?? 0) + extraDiscount),
              description: t.description ?? DEFAULT_PLAN_MODULES[t.plan]?.description ?? '',
              modules: t.modules,
              maxBranches: t.maxBranches ?? DEFAULT_PLAN_MODULES[t.plan]?.maxBranches ?? 0,
              extraBranchPrice: t.extraBranchPrice ?? DEFAULT_PLAN_MODULES[t.plan]?.extraBranchPrice ?? 0,
            };
          })
        : Object.entries(DEFAULT_PLAN_MODULES).map(([plan, cfg]) => {
            const { adjustedPrice, extraDiscount } = applyCampaign(cfg.price, plan, true);
            return {
              plan,
              price: adjustedPrice,
              discountPercent: Math.min(100, (cfg.discountPercent ?? 0) + extraDiscount),
              description: cfg.description,
              modules: cfg.modules,
              maxBranches: cfg.maxBranches ?? 0,
              extraBranchPrice: cfg.extraBranchPrice ?? 0,
            };
          });

    const addons = await this.listSubscriptionAddons();
    const kontorModules = await this.listKontorModules();
    const addonRows = addons.map((a) => {
      const { adjustedPrice, extraDiscount } = applyCampaign(a.basePrice ?? 0, a.code, false);
      const totalDiscount = Math.min(100, (a.discountPercent ?? 0) + extraDiscount);
      const pricing = applyDiscount(adjustedPrice, totalDiscount);
      return { ...a, ...pricing, billingPeriod: 'yearly' };
    });

    return {
      billingPeriod: 'yearly',
      submodulePricing: submoduleRows.map((r) => {
        const { adjustedPrice } = applyCampaign(r.yearlyPrice, r.moduleId, false);
        return {
          ...r,
          yearlyPrice: adjustedPrice,
          label: getModuleLabel(r.moduleId),
        };
      }),
      plans: plans.map((p) => {
        const pricing = applyDiscount(p.price, p.discountPercent);
        const purchasableAddons = filterAddonsForPlan(p.modules, addonRows);
        
        // Sum module prices using the adjusted priceMap
        let computedModuleTotal = 0;
        for (const modId of p.modules) {
           const pPrice = priceMap[modId] ?? 0;
           const { adjustedPrice } = applyCampaign(pPrice, modId, false);
           computedModuleTotal += adjustedPrice;
        }

        const purchasableExtraModules = getPurchasableExtraModules(p.modules, submoduleRows);
        return {
          ...p,
          ...pricing,
          moduleLabels: p.modules.map((id: string) => getModuleLabel(id)),
          displayMode: p.plan === 'BASIC' ? 'grouped' : 'listed',
          purchasableAddons,
          purchasableExtraModules,
          computedModuleTotal,
        };
      }),
      addons: addonRows,
      kontorModules,
    };
  }

  async listSubmodulePricing() {
    return this.ensureSubmodulePricing();
  }

  async upsertSubmodulePricingBulk(
    items: Array<{
      moduleId: string;
      yearlyPrice: number;
      sellableExtra?: boolean;
      isActive?: boolean;
    }>,
  ) {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.submodulePricing.upsert({
          where: { moduleId: item.moduleId },
          create: {
            moduleId: item.moduleId,
            yearlyPrice: item.yearlyPrice ?? 0,
            sellableExtra: item.sellableExtra ?? true,
            isActive: item.isActive ?? true,
          },
          update: {
            yearlyPrice: item.yearlyPrice ?? 0,
            sellableExtra: item.sellableExtra ?? true,
            isActive: item.isActive ?? true,
          },
        }),
      ),
    );
    return this.listSubmodulePricing();
  }

  private async ensureSubmodulePricing(): Promise<SubmodulePricingRow[]> {
    const existing = await this.prisma.submodulePricing.findMany();
    if (existing.length === 0) {
      const defaults = buildDefaultSubmodulePricing();
      await this.prisma.submodulePricing.createMany({
        data: defaults,
        skipDuplicates: true,
      });
      return defaults;
    }
    return existing.map((r) => ({
      moduleId: r.moduleId,
      yearlyPrice: r.yearlyPrice,
      sellableExtra: r.sellableExtra,
      isActive: r.isActive,
    }));
  }

  async upsertAddonModule(dto: {
    code: AddonModuleCode;
    name: string;
    description?: string;
    basePrice?: number;
    discountPercent?: number;
    isKontorBased?: boolean;
    isActive?: boolean;
    sortOrder?: number;
  }) {
    return this.prisma.addonModule.upsert({
      where: { code: dto.code },
      create: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        basePrice: dto.basePrice,
        discountPercent: dto.discountPercent ?? 0,
        isKontorBased:
          dto.isKontorBased ??
          !SUBSCRIPTION_SELLABLE_CODES.includes(dto.code as AddonModuleCode),
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
      update: {
        name: dto.name,
        description: dto.description,
        basePrice: dto.basePrice,
        discountPercent: dto.discountPercent,
        isKontorBased: dto.isKontorBased,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async createKontorPackage(dto: {
    addonModuleId: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }) {
    const mod = await this.prisma.addonModule.findUnique({ where: { id: dto.addonModuleId } });
    if (!mod || !isKontorModule(mod.code, mod.isKontorBased)) {
      throw new BadRequestException('Kontör paketi yalnızca kontör tabanlı modüllere eklenebilir');
    }
    const totalPrice = Math.round(dto.quantity * dto.unitPrice * 100) / 100;
    return this.prisma.kontorPackage.create({
      data: { ...dto, totalPrice },
    });
  }

  async updateKontorPackage(id: string, dto: Partial<{ name: string; quantity: number; unitPrice: number; isActive: boolean }>) {
    const existing = await this.prisma.kontorPackage.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Kontör paketi bulunamadı');
    const quantity = dto.quantity ?? existing.quantity;
    const unitPrice = dto.unitPrice ?? existing.unitPrice;
    return this.prisma.kontorPackage.update({
      where: { id },
      data: {
        ...dto,
        totalPrice: Math.round(quantity * unitPrice * 100) / 100,
      },
    });
  }

  async setPlanModules(plan: string, moduleCodes: AddonModuleCode[]) {
    const modules = await this.prisma.addonModule.findMany({
      where: { code: { in: moduleCodes } },
    });
    await this.prisma.planModuleItem.deleteMany({ where: { plan: plan as any } });
    if (modules.length === 0) return [];
    await this.prisma.planModuleItem.createMany({
      data: modules.map((m) => ({ plan: plan as any, addonModuleId: m.id, included: true })),
    });
    return this.getPlanModules(plan);
  }

  async getPlanModules(plan: string) {
    return this.prisma.planModuleItem.findMany({
      where: { plan: plan as any },
      include: { addonModule: true },
    });
  }

  // ─── Kontor Balance & Purchase ────────────────────────────────────────────

  async getKontorBalances(tenantId: string) {
    return this.getKontorSummary(tenantId);
  }

  async getKontorSummary(tenantId: string) {
    const kontorModules = await this.prisma.addonModule.findMany({
      where: { code: { in: KONTOR_MODULE_CODES }, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    const balances = await this.prisma.tenantKontorBalance.findMany({ where: { tenantId } });
    const purchases = await this.prisma.kontorPurchase.groupBy({
      by: ['moduleCode'],
      where: { tenantId, status: 'SUCCESS' },
      _sum: { quantity: true },
    });

    const items = kontorModules.map((m) => {
      const balance = balances.find((b) => b.moduleCode === m.code)?.balance ?? 0;
      const totalPurchased = purchases.find((p) => p.moduleCode === m.code)?._sum.quantity ?? 0;
      const totalUsed = Math.max(0, totalPurchased - balance);
      return {
        moduleCode: m.code,
        moduleName: m.name,
        balance,
        totalPurchased,
        totalUsed,
        lowBalance: balance <= KONTOR_LOW_THRESHOLD,
      };
    });

    const anyLow = items.some((i) => i.lowBalance);
    return { items, anyLow, threshold: KONTOR_LOW_THRESHOLD };
  }

  async initiateKontorPurchase(
    tenantId: string,
    userId: string,
    packageId: string,
    buyer: { email: string; name: string; phone?: string; ip?: string },
  ) {
    const pkg = await this.prisma.kontorPackage.findUnique({
      where: { id: packageId },
      include: { addonModule: true },
    });
    if (!pkg || !pkg.isActive) throw new NotFoundException('Kontör paketi bulunamadı');
    if (!isKontorModule(pkg.addonModule.code, pkg.addonModule.isKontorBased)) {
      throw new BadRequestException('Bu modül kontör ile satılmaz; ek paket olarak abone olun');
    }

    const merchantOid = `kontor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const purchase = await this.prisma.kontorPurchase.create({
      data: {
        tenantId,
        userId,
        packageId: pkg.id,
        moduleCode: pkg.addonModule.code,
        quantity: pkg.quantity,
        amount: pkg.totalPrice,
        status: 'PENDING',
        gatewayRef: merchantOid,
      },
    });

    const result = await this.paymentService.charge({
      tenantId,
      amount: pkg.totalPrice,
      currency: 'TRY',
      conversationId: merchantOid,
      sourceType: 'KONTOR',
      sourceId: purchase.id,
      buyer: {
        id: userId,
        email: buyer.email,
        name: buyer.name.split(' ')[0] || buyer.name,
        surname: buyer.name.split(' ').slice(1).join(' ') || '-',
        phone: buyer.phone,
        ip: buyer.ip,
      },
      basketItems: [{ id: pkg.id, name: `${pkg.addonModule.name} ${pkg.name}`, price: pkg.totalPrice }],
      callbackUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/isletme/kontor?payment=ok`,
    });

    return { purchaseId: purchase.id, ...result };
  }

  async creditKontorOnPayment(merchantOid: string, status: string) {
    if (status !== 'SUCCESS') return;
    const purchase = await this.prisma.kontorPurchase.findFirst({
      where: { gatewayRef: merchantOid },
    });
    if (!purchase || purchase.status === 'SUCCESS') return;

    await this.prisma.$transaction([
      this.prisma.kontorPurchase.update({
        where: { id: purchase.id },
        data: { status: 'SUCCESS', completedAt: new Date() },
      }),
      ...edocumentKontorCodes().includes(purchase.moduleCode)
        ? edocumentKontorCodes().map((moduleCode) =>
            this.prisma.tenantKontorBalance.upsert({
              where: {
                tenantId_moduleCode: { tenantId: purchase.tenantId, moduleCode },
              },
              create: {
                tenantId: purchase.tenantId,
                moduleCode,
                balance: purchase.quantity,
              },
              update: { balance: { increment: purchase.quantity } },
            }),
          )
        : [
            this.prisma.tenantKontorBalance.upsert({
              where: {
                tenantId_moduleCode: {
                  tenantId: purchase.tenantId,
                  moduleCode: purchase.moduleCode,
                },
              },
              create: {
                tenantId: purchase.tenantId,
                moduleCode: purchase.moduleCode,
                balance: purchase.quantity,
              },
              update: { balance: { increment: purchase.quantity } },
            }),
          ],
    ]);

    await this.createNotification({
      type: 'KONTOR_PURCHASE',
      title: 'Kontör yüklendi',
      body: `${purchase.quantity} adet kontör bakiyenize eklendi.`,
      targetTenantId: purchase.tenantId,
      metadata: { purchaseId: purchase.id, quantity: purchase.quantity },
    });
  }

  private async resolvePlanPricing(plan: string) {
    const row = await this.prisma.planTemplate.findUnique({ where: { plan: plan as any } });
    const defaults = DEFAULT_PLAN_MODULES[plan];
    const listPrice = row?.price ?? defaults?.price ?? 0;
    const discountPercent = row?.discountPercent ?? defaults?.discountPercent ?? 0;
    const modules = row?.modules ?? defaults?.modules ?? [];
    const maxBranches = row?.maxBranches ?? defaults?.maxBranches ?? 0;
    const extraBranchPrice = row?.extraBranchPrice ?? defaults?.extraBranchPrice ?? 0;
    return {
      ...applyDiscount(listPrice, discountPercent),
      modules,
      maxBranches,
      extraBranchPrice,
    };
  }

  async getTenantSubscriptionQuoteContext(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { subscription: true },
    });
    if (!tenant?.subscription) return null;
    const sub = tenant.subscription;
    const remainingDays = subscriptionRemainingDays(sub.endDate);
    if (!tenant.isActive && remainingDays <= 0) return null;

    const currentAnnualTotal = await this.resolveSubscriptionAnnualTotal(sub);

    return {
      plan: sub.plan,
      price: sub.price ?? 0,
      currentAnnualTotal,
      endDate: sub.endDate,
      remainingDays,
      isActive: tenant.isActive,
      purchasedAddons: sub.purchasedAddons,
      extraBranches: sub.extraBranches,
      modules: sub.modules,
    };
  }

  /** Mevcut aboneliğin güncel yıllık tutarı (plan + ek paketler + şubeler + alt modüller) */
  private async resolveSubscriptionAnnualTotal(sub: {
    plan: string;
    purchasedAddons: AddonModuleCode[];
    extraBranches: number;
    modules: string[];
  }): Promise<number> {
    const planPricing = await this.resolvePlanPricing(sub.plan);
    const planModuleSet = new Set(expandLegacyModules(planPricing.modules));
    const extraModuleIds = sub.modules.filter(
      (m) => m.includes('.') && !planModuleSet.has(m),
    );
    const addonCodes = sub.purchasedAddons.filter((c) => c !== 'EXTRA_BRANCH');
    const { annualTotal } = await this.computeAnnualSubscriptionTotal(
      sub.plan,
      addonCodes,
      sub.extraBranches,
      extraModuleIds,
    );
    return annualTotal;
  }

  private async computeAnnualSubscriptionTotal(
    plan: string,
    addonCodes: AddonModuleCode[],
    extraBranchCount: number,
    extraModuleIds: string[],
  ) {
    const planPricing = await this.resolvePlanPricing(plan);
    const submoduleRows = await this.ensureSubmodulePricing();
    const subPriceMap = pricingMap(submoduleRows);

    const codesToFetch = [...addonCodes];
    const usePlanBranchPrice = planPricing.extraBranchPrice > 0;
    if (extraBranchCount > 0 && !usePlanBranchPrice) {
      codesToFetch.push('EXTRA_BRANCH');
    }

    const addons = await this.prisma.addonModule.findMany({
      where: { code: { in: codesToFetch.filter((c) => SUBSCRIPTION_SELLABLE_CODES.includes(c)) } },
    });

    let addonsFinal = 0;
    let extraModulesAmount = 0;
    let extraBranchAmount = 0;

    for (const id of extraModuleIds) {
      extraModulesAmount += subPriceMap.get(id)?.yearlyPrice ?? 0;
    }
    extraModulesAmount = Math.round(extraModulesAmount * 100) / 100;

    for (const a of addons) {
      const p = applyDiscount(a.basePrice ?? 0, a.discountPercent ?? 0);
      if (a.code === 'EXTRA_BRANCH') {
        addonsFinal += p.finalPrice * extraBranchCount;
      } else {
        addonsFinal += p.finalPrice;
      }
    }

    if (extraBranchCount > 0 && usePlanBranchPrice) {
      extraBranchAmount = Math.round(planPricing.extraBranchPrice * extraBranchCount * 100) / 100;
      addonsFinal += extraBranchAmount;
    }

    const yearlyExtras = addonsFinal + extraModulesAmount;
    const annualTotal = Math.round((planPricing.finalPrice + yearlyExtras) * 100) / 100;

    return {
      planPricing,
      annualTotal,
      yearlyExtras,
      extraModulesAmount,
      extraBranchAmount,
    };
  }

  private parsePurchaseGatewayMeta(gatewayRef: string | null | undefined) {
    const extensionMonths = Number(gatewayRef?.match(/#ext=(\d+)/)?.[1] ?? 0);
    const includeAnnualRenewal = !gatewayRef?.includes('#renew=0');
    return { extensionMonths, includeAnnualRenewal };
  }

  async quoteSubscription(
    plan: string,
    addonCodes: AddonModuleCode[] = [],
    extraBranchCount: number = 0,
    options?: {
      currentSubscription?: {
        plan: string;
        price: number;
        currentAnnualTotal?: number;
        endDate: Date;
      };
      extensionMonths?: number;
      billingMode?: 'new' | 'upgrade' | 'renewal';
      extraModuleIds?: string[];
      includeAnnualRenewal?: boolean;
    },
  ) {
    const extensionMonths = options?.extensionMonths ?? 0;
    const billingMode = options?.billingMode ?? 'new';
    const currentSubscription = options?.currentSubscription;
    const extraModuleIds = options?.extraModuleIds ?? [];
    const includeAnnualRenewal =
      options?.includeAnnualRenewal ?? (billingMode === 'new' || billingMode === 'renewal');

    const { planPricing, annualTotal, yearlyExtras, extraModulesAmount, extraBranchAmount } =
      await this.computeAnnualSubscriptionTotal(
        plan,
        addonCodes,
        extraBranchCount,
        extraModuleIds,
      );

    const submoduleRows = await this.ensureSubmodulePricing();
    const subPriceMap = pricingMap(submoduleRows);

    for (const id of extraModuleIds) {
      if (!isExtraModulePurchasable(planPricing.modules, id, subPriceMap)) {
        throw new BadRequestException(`Ek modül bu plan için satın alınamaz: ${id}`);
      }
    }

    const addons = await this.prisma.addonModule.findMany({
      where: {
        code: {
          in: [...addonCodes, ...(extraBranchCount > 0 && planPricing.extraBranchPrice <= 0 ? (['EXTRA_BRANCH'] as AddonModuleCode[]) : [])].filter(
            (c) => SUBSCRIPTION_SELLABLE_CODES.includes(c),
          ),
        },
      },
    });

    let addonsListPrice = 0;
    let addonsFinal = yearlyExtras;
    for (const a of addons) {
      const p = applyDiscount(a.basePrice ?? 0, a.discountPercent ?? 0);
      if (a.code === 'EXTRA_BRANCH') {
        addonsListPrice += p.listPrice * extraBranchCount;
      } else {
        addonsListPrice += p.listPrice;
      }
    }
    if (extraBranchAmount > 0) addonsListPrice += extraBranchAmount;

    const remainingDays = currentSubscription
      ? subscriptionRemainingDays(currentSubscription.endDate)
      : 0;

    const currentAnnualTotal =
      currentSubscription?.currentAnnualTotal ?? currentSubscription?.price ?? 0;

    const billing = buildSubscriptionQuoteBreakdown({
      billingMode,
      includeAnnualRenewal,
      extensionMonths,
      newAnnualTotal: annualTotal,
      currentAnnualTotal,
      remainingDays,
    });

    const baseEnd =
      currentSubscription && currentSubscription.endDate > new Date()
        ? new Date(currentSubscription.endDate)
        : new Date();
    const projectedEndDate = new Date(baseEnd);
    if (includeAnnualRenewal && billingMode !== 'upgrade') {
      projectedEndDate.setFullYear(projectedEndDate.getFullYear() + 1);
    }
    if (extensionMonths > 0) {
      projectedEndDate.setMonth(projectedEndDate.getMonth() + extensionMonths);
    }

    const discountAmount =
      Math.round((planPricing.discountAmount + (addonsListPrice - addonsFinal)) * 100) / 100;

    return {
      billingPeriod: 'yearly',
      billingMode,
      plan,
      planAmount: planPricing.finalPrice,
      planListPrice: planPricing.listPrice,
      planDiscountPercent: planPricing.discountPercent,
      addonsAmount: yearlyExtras,
      addonsListPrice,
      extraModulesAmount,
      extraBranchAmount,
      extraModuleIds,
      annualRenewalAmount: billing.annualRenewalAmount,
      proratedAmount: billing.proratedAmount,
      extensionMonths,
      extensionAmount: billing.extensionAmount,
      planCharge: billing.planCharge,
      includeAnnualRenewal,
      discountAmount,
      totalAmount: billing.totalAmount,
      remainingDays,
      currentAnnualTotal,
      newAnnualTotal: annualTotal,
      projectedEndDate: projectedEndDate.toISOString(),
      modules: planPricing.modules,
      addonCodes: addons.filter((a) => a.code !== 'EXTRA_BRANCH').map((a) => a.code),
      extraBranchCount,
    };
  }

  async initiateSubscriptionPurchase(
    actor: { id: string; tenantId: string; tenantType: TenantType; email: string; name?: string },
    dto: {
      tenantId: string;
      plan: string;
      addonCodes?: AddonModuleCode[];
      extraModuleIds?: string[];
      extraBranchCount?: number;
      buyer?: { email: string; name: string; phone?: string; ip?: string };
      extensionMonths?: number;
      includeAnnualRenewal?: boolean;
      billingMode?: 'new' | 'upgrade' | 'renewal';
      acceptedDocuments?: LegalDocumentId[];
    },
  ) {
    const requiredLegal = documentsForContext('subscription_checkout').map((d) => d.id);
    const accepted: string[] = dto.acceptedDocuments || [];
    if (!requiredLegal.every((id) => accepted.includes(id))) {
      throw new BadRequestException('Ödeme için tüm sözleşmeleri kabul etmelisiniz');
    }

    const target = await this.prisma.tenant.findUnique({
      where: { id: dto.tenantId },
      include: { subscription: true },
    });
    if (!target || !['BUSINESS', 'BRANCH'].includes(target.type)) {
      throw new BadRequestException('Geçersiz işletme');
    }

    if (actor.tenantType === TenantType.DEALER) {
      if (target.parentId !== actor.tenantId) {
        throw new ForbiddenException('Sadece kendi işletmelerinize paket tanımlayabilirsiniz');
      }
    } else if (actor.tenantType !== TenantType.SUPERADMIN && actor.tenantId !== dto.tenantId) {
      throw new ForbiddenException('Bu işletme için ödeme yetkiniz yok');
    }

    const addonCodes = (dto.addonCodes || []).filter((c) => SUBSCRIPTION_SELLABLE_CODES.includes(c));
    const planPricing = await this.resolvePlanPricing(dto.plan);
    for (const code of addonCodes) {
      if (!isAddonPurchasableForPlan(planPricing.modules, code)) {
        throw new BadRequestException(`Ek paket bu plan için uygun değil: ${code}`);
      }
    }
    const extraModuleIds = [...new Set(dto.extraModuleIds || [])];
    const submoduleRows = await this.ensureSubmodulePricing();
    const subPriceMap = pricingMap(submoduleRows);
    for (const id of extraModuleIds) {
      if (!isExtraModulePurchasable(planPricing.modules, id, subPriceMap)) {
        throw new BadRequestException(`Ek modül bu plan için uygun değil: ${id}`);
      }
    }
    const extraBranchCount = dto.extraBranchCount || 0;
    const extensionMonths = dto.extensionMonths ?? 0;
    const billingMode = dto.billingMode ?? 'new';

    let currentSubCtx;
    const quoteCtx = await this.getTenantSubscriptionQuoteContext(dto.tenantId);
    if (quoteCtx) {
      currentSubCtx = {
        plan: quoteCtx.plan,
        price: quoteCtx.price,
        currentAnnualTotal: quoteCtx.currentAnnualTotal,
        endDate: quoteCtx.endDate,
      };
    }

    const quote = await this.quoteSubscription(dto.plan, addonCodes, extraBranchCount, {
      currentSubscription: currentSubCtx,
      extensionMonths,
      billingMode,
      extraModuleIds,
      includeAnnualRenewal: dto.includeAnnualRenewal,
    });

    const includeAnnualRenewal =
      dto.includeAnnualRenewal ?? quote.includeAnnualRenewal ?? billingMode !== 'upgrade';

    const merchantOid = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const gatewayRef = `${merchantOid}#ext=${extensionMonths}#renew=${includeAnnualRenewal ? 1 : 0}`;
    const purchase = await this.prisma.subscriptionPurchase.create({
      data: {
        tenantId: dto.tenantId,
        userId: actor.id,
        plan: dto.plan as any,
        addonCodes,
        extraModuleIds,
        extraBranchCount,
        planAmount: quote.planAmount,
        addonsAmount: Math.round((quote.totalAmount - quote.planAmount) * 100) / 100,
        discountAmount: quote.discountAmount,
        totalAmount: quote.totalAmount,
        status: 'PENDING',
        gatewayRef,
        purchasedByDealerId: actor.tenantType === TenantType.DEALER ? actor.tenantId : null,
      },
    });

    await this.prisma.legalAcceptance.createMany({
      data: requiredLegal.map((documentId) => ({
        userId: actor.id,
        tenantId: dto.tenantId,
        documentId,
        documentVersion: LEGAL_DOCUMENT_VERSION,
        context: 'subscription_checkout',
      })),
    });

    const buyer = dto.buyer || {
      email: actor.email,
      name: actor.name || 'Kullanıcı',
    };

    const panel =
      actor.tenantType === TenantType.DEALER
        ? 'bayi'
        : actor.tenantType === TenantType.SUPERADMIN
          ? 'nexusadmin'
          : 'isletme';

    const returnPath =
      billingMode === 'new'
        ? `/${panel}/dashboard?payment=ok`
        : `/${panel}/subscribe?payment=ok&tenantId=${dto.tenantId}`;

    const result = await this.paymentService.charge({
      tenantId: dto.tenantId,
      amount: quote.totalAmount,
      currency: 'TRY',
      conversationId: merchantOid,
      sourceType: 'SUBSCRIPTION',
      sourceId: purchase.id,
      buyer: {
        id: actor.id,
        email: buyer.email,
        name: buyer.name.split(' ')[0] || buyer.name,
        surname: buyer.name.split(' ').slice(1).join(' ') || '-',
        phone: buyer.phone,
        ip: buyer.ip,
      },
      basketItems: [
        {
          id: dto.plan,
          name: `Yıllık ${dto.plan} paketi`,
          price: quote.totalAmount,
        },
      ],
      callbackUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}${returnPath}`,
    });

    return { purchaseId: purchase.id, quote, ...result };
  }

  async confirmPendingSubscriptionPurchase(
    actor: { id: string; tenantId: string; tenantType: TenantType },
    tenantId: string,
  ) {
    const target = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!target || !['BUSINESS', 'BRANCH'].includes(target.type)) {
      throw new BadRequestException('Geçersiz işletme');
    }

    if (actor.tenantType === TenantType.DEALER) {
      if (target.parentId !== actor.tenantId) {
        throw new ForbiddenException('Sadece kendi işletmelerinize paket tanımlayabilirsiniz');
      }
    } else if (actor.tenantType !== TenantType.SUPERADMIN && actor.tenantId !== tenantId) {
      throw new ForbiddenException('Bu işletme için ödeme yetkiniz yok');
    }

    const latest = await this.prisma.subscriptionPurchase.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    if (!latest) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { subscription: true },
      });
      return {
        activated: !!tenant?.isActive,
        alreadyActive: !!tenant?.isActive,
        remainingDays: tenant?.subscription
          ? subscriptionRemainingDays(tenant.subscription.endDate)
          : 0,
      };
    }

    await this.paymentService.activatePendingSubscriptionPurchase(latest.id);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { subscription: true },
    });

    return {
      activated: !!tenant?.isActive,
      alreadyActive:
        latest.status === 'SUCCESS' &&
        !!tenant?.isActive &&
        !!tenant.subscription &&
        tenant.subscription.endDate > new Date(),
      purchaseId: latest.id,
      remainingDays: tenant?.subscription
        ? subscriptionRemainingDays(tenant.subscription.endDate)
        : 0,
    };
  }

  async activateSubscriptionPurchase(purchaseId: string) {
    const purchase = await this.prisma.subscriptionPurchase.findUnique({
      where: { id: purchaseId },
    });
    if (!purchase) return;

    const target = await this.prisma.tenant.findUnique({
      where: { id: purchase.tenantId },
      include: { subscription: true },
    });

    if (
      purchase.status === 'SUCCESS' &&
      target?.isActive &&
      target.subscription &&
      target.subscription.endDate > new Date()
    ) {
      return;
    }

    const alreadyCompleted = purchase.status === 'SUCCESS';
    const currentSub = target?.subscription;

    const planPricing = await this.resolvePlanPricing(purchase.plan);
    const modules = [
      ...new Set([
        ...mergeAddonModules(planPricing.modules, purchase.addonCodes),
        ...(purchase.extraModuleIds || []),
      ]),
    ];

    const { extensionMonths, includeAnnualRenewal } = this.parsePurchaseGatewayMeta(
      purchase.gatewayRef,
    );

    const startDate = new Date();
    const endDate =
      currentSub && currentSub.endDate > new Date()
        ? new Date(currentSub.endDate)
        : new Date();
    if (includeAnnualRenewal) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }
    if (extensionMonths > 0) {
      endDate.setMonth(endDate.getMonth() + extensionMonths);
    }

    const newExtraBranches = (currentSub?.extraBranches || 0) + (purchase.extraBranchCount || 0);

    await this.prisma.$transaction([
      ...(alreadyCompleted
        ? []
        : [
            this.prisma.subscriptionPurchase.update({
              where: { id: purchase.id },
              data: { status: 'SUCCESS', completedAt: new Date() },
            }),
          ]),
      this.prisma.subscription.upsert({
        where: { tenantId: purchase.tenantId },
        create: {
          tenantId: purchase.tenantId,
          plan: purchase.plan,
          startDate,
          endDate,
          autoRenew: false,
          price: purchase.totalAmount,
          modules,
          purchasedAddons: purchase.addonCodes,
          extraBranches: newExtraBranches,
          dealerId: purchase.purchasedByDealerId,
        },
        update: {
          plan: purchase.plan,
          startDate,
          endDate,
          price: purchase.totalAmount,
          modules,
          purchasedAddons: purchase.addonCodes,
          extraBranches: newExtraBranches,
          dealerId: purchase.purchasedByDealerId ?? undefined,
        },
      }),
      this.prisma.tenant.update({
        where: { id: purchase.tenantId },
        data: { plan: purchase.plan, isActive: true },
      }),
      ...(alreadyCompleted
        ? []
        : [
            this.prisma.subscriptionHistory.create({
              data: {
                tenantId: purchase.tenantId,
                plan: purchase.plan,
                modules,
                price: purchase.totalAmount,
                action: 'PURCHASE',
                note: `PayTR — ${purchase.addonCodes.join(', ') || 'ek paket yok'}${purchase.extraModuleIds?.length ? ` + ${purchase.extraModuleIds.length} alt modül` : ''}`,
                actorUserId: purchase.userId,
              },
            }),
          ]),
    ]);

    await this.createNotification({
      type: 'SUBSCRIPTION',
      title: 'Abonelik aktif',
      body: `Yıllık paketiniz tanımlandı. Bitiş: ${endDate.toLocaleDateString('tr-TR')}`,
      targetTenantId: purchase.tenantId,
      metadata: {
        purchaseId: purchase.id,
        plan: purchase.plan,
        remainingDays: subscriptionRemainingDays(endDate),
      },
    });
  }

  // ─── Dealer Commission Invoices ───────────────────────────────────────────

  async listCommissionInvoices(dealerId: string, tenantType: TenantType) {
    const where =
      tenantType === TenantType.SUPERADMIN ? {} : { dealerId };
    return this.prisma.dealerCommissionInvoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { dealer: { select: { id: true, name: true, code: true } } },
    });
  }

  async createCommissionInvoice(
    dealerId: string,
    dto: {
      periodStart: string;
      periodEnd: string;
      amount: number;
      integratorName: string;
      invoiceNo?: string;
      description?: string;
    },
  ) {
    const invoice = await this.prisma.dealerCommissionInvoice.create({
      data: {
        dealerId,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        amount: dto.amount,
        integratorName: dto.integratorName,
        invoiceNo: dto.invoiceNo,
        description: dto.description,
        status: 'DRAFT',
      },
    });
    return invoice;
  }

  async sendCommissionInvoice(dealerId: string, invoiceId: string) {
    const invoice = await this.prisma.dealerCommissionInvoice.findFirst({
      where: { id: invoiceId, dealerId },
    });
    if (!invoice) throw new NotFoundException('Fatura bulunamadı');
    if (invoice.status !== 'DRAFT' && invoice.status !== 'REJECTED') {
      throw new BadRequestException('Bu fatura zaten gönderilmiş');
    }

    const updated = await this.prisma.dealerCommissionInvoice.update({
      where: { id: invoiceId },
      data: { status: 'SENT', sentAt: new Date() },
      include: { dealer: { select: { name: true } } },
    });

    await this.createNotification({
      type: 'COMMISSION_INVOICE',
      title: 'Yeni hakediş faturası',
      body: `${updated.dealer.name} — ${updated.amount.toLocaleString('tr-TR')} ₺ hakediş faturası gönderdi.`,
      targetTenantId: null,
      metadata: { invoiceId, dealerId, amount: updated.amount },
    });

    return updated;
  }

  async updateCommissionInvoiceStatus(
    invoiceId: string,
    status: CommissionInvoiceStatus,
    rejectedReason?: string,
  ) {
    const data: any = { status };
    if (status === 'APPROVED') data.approvedAt = new Date();
    if (status === 'PAID') data.paidAt = new Date();
    if (status === 'REJECTED') data.rejectedReason = rejectedReason;
    return this.prisma.dealerCommissionInvoice.update({ where: { id: invoiceId }, data });
  }

  // ─── Notifications ────────────────────────────────────────────────────────

  async createNotification(dto: {
    type: PlatformNotificationType;
    title: string;
    body: string;
    targetTenantId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.platformNotification.create({ data: dto as any });
  }

  async listNotifications(tenantId: string | null, tenantType: TenantType) {
    const where =
      tenantType === TenantType.SUPERADMIN
        ? {}
        : { OR: [{ targetTenantId: tenantId }, { targetTenantId: null }] };
    return this.prisma.platformNotification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markNotificationRead(id: string) {
    return this.prisma.platformNotification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  // ─── Enhanced Platform Boss Screen ────────────────────────────────────────

  async getPlatformBossScreen(period: Period = 'month') {
    const since = this.periodStart(period);

    const [dealers, businesses, branches, subscriptions, kontorPurchases, webRegistrations, allTenants] =
      await Promise.all([
        this.prisma.tenant.count({ where: { type: 'DEALER', isActive: true } }),
        this.prisma.tenant.count({ where: { type: 'BUSINESS', isActive: true } }),
        this.prisma.tenant.count({ where: { type: 'BRANCH', isActive: true } }),
        this.prisma.subscription.findMany({
          include: { tenant: { select: { name: true, type: true, parentId: true } } },
        }),
        this.prisma.kontorPurchase.findMany({
          where: { status: 'SUCCESS', completedAt: { gte: since } },
          include: { tenant: { select: { name: true, type: true } } },
        }),
        this.prisma.tenant.count({
          where: { type: 'BUSINESS', createdAt: { gte: since }, parentId: 'ten-root' },
        }),
        this.prisma.tenant.findMany({
          where: { type: { in: ['DEALER', 'BUSINESS', 'BRANCH'] } },
          select: {
            id: true,
            name: true,
            code: true,
            type: true,
            plan: true,
            city: true,
            isActive: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 500,
        }),
      ]);

    const activeSubs = subscriptions.filter((s) => s.endDate >= new Date());
    const mrr = activeSubs.reduce((sum, s) => sum + (s.price || 0), 0);
    const expiringSoon = activeSubs.filter((s) => {
      const days = (s.endDate.getTime() - Date.now()) / 86400000;
      return days <= 30 && days > 0;
    });

    const dealerSales = await this.prisma.tenant.findMany({
      where: { type: 'BUSINESS', createdAt: { gte: since }, parent: { type: 'DEALER' } },
      include: {
        parent: { select: { id: true, name: true } },
        subscription: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const dealerRevenueMap = new Map<string, { name: string; count: number; revenue: number }>();
    for (const b of dealerSales) {
      const key = b.parentId || 'direct';
      const prev = dealerRevenueMap.get(key) || {
        name: b.parent?.name || 'Doğrudan',
        count: 0,
        revenue: 0,
      };
      prev.count += 1;
      prev.revenue += b.subscription?.price || 0;
      dealerRevenueMap.set(key, prev);
    }

    const kontorRevenue = kontorPurchases.reduce((s, p) => s + p.amount, 0);

    return {
      period,
      since: since.toISOString(),
      kpis: {
        dealers,
        businesses,
        branches,
        mrr,
        arr: mrr * 12,
        activeSubscriptions: activeSubs.length,
        expiringSoon: expiringSoon.length,
        webRegistrations,
        dealerSalesCount: dealerSales.length,
        kontorRevenue,
        totalRevenue: mrr + kontorRevenue,
      },
      expiringSubscriptions: expiringSoon.slice(0, 15).map((s) => ({
        tenantId: s.tenantId,
        tenantName: s.tenant.name,
        plan: s.plan,
        endDate: s.endDate,
        price: s.price,
        dealerId: s.dealerId,
      })),
      dealerPerformance: [...dealerRevenueMap.values()].sort((a, b) => b.revenue - a.revenue),
      recentDealerSales: dealerSales.map((b) => ({
        id: b.id,
        name: b.name,
        dealerName: b.parent?.name,
        plan: b.plan,
        price: b.subscription?.price,
        createdAt: b.createdAt,
        source: 'DEALER',
      })),
      kontorPurchases: kontorPurchases.slice(0, 10).map((p) => ({
        tenantName: p.tenant.name,
        moduleCode: p.moduleCode,
        quantity: p.quantity,
        amount: p.amount,
        completedAt: p.completedAt,
      })),
      subscriptionChanges: await this.prisma.subscriptionHistory.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
      allTenants,
    };
  }

  async getPlatformReports(period: Period = 'month') {
    const boss = await this.getPlatformBossScreen(period);
    const planBreakdown = await this.prisma.subscription.groupBy({
      by: ['plan'],
      _count: { id: true },
      _sum: { price: true },
    });

    const lowBalanceTenants = await this.prisma.tenantKontorBalance.findMany({
      where: { balance: { lte: KONTOR_LOW_THRESHOLD } },
      include: { tenant: { select: { id: true, name: true, type: true } } },
      take: 20,
    });

    return {
      ...boss,
      planBreakdown: planBreakdown.map((p) => ({
        plan: p.plan,
        count: p._count.id,
        revenue: p._sum.price ?? 0,
      })),
      lowBalanceAlerts: lowBalanceTenants.map((b) => ({
        tenantId: b.tenantId,
        tenantName: b.tenant.name,
        tenantType: b.tenant.type,
        moduleCode: b.moduleCode,
        balance: b.balance,
      })),
    };
  }

  // ─── Tenant Reports (for admin) ───────────────────────────────────────────

  async getTenantDetailReport(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscription: true,
        parent: { select: { id: true, name: true, type: true } },
        children: { select: { id: true, name: true, type: true, plan: true, isActive: true } },
        users: { select: { id: true, name: true, role: true, phone: true, isActive: true } },
        kontorBalances: true,
      },
    });
    if (!tenant) throw new NotFoundException('Tenant bulunamadı');

    const history = await this.prisma.subscriptionHistory.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const purchases = await this.prisma.kontorPurchase.findMany({
      where: { tenantId, status: 'SUCCESS' },
      orderBy: { completedAt: 'desc' },
      take: 10,
    });

    return { tenant, history, kontorPurchases: purchases };
  }

  assertSuperAdmin(tenantType: TenantType) {
    if (tenantType !== TenantType.SUPERADMIN) {
      throw new ForbiddenException('Bu işlem için platform yöneticisi gerekli');
    }
  }

  // ─── Chatbot (Nexus Asistan) ──────────────────────────────────────────────

  private async loadChatbotConfig(): Promise<ChatbotConfig> {
    const row = await this.prisma.platformSetting.findUnique({
      where: { key: CHATBOT_SETTING_KEY },
    });
    return parseChatbotConfig(row?.value);
  }

  private async saveChatbotConfig(config: ChatbotConfig) {
    await this.prisma.platformSetting.upsert({
      where: { key: CHATBOT_SETTING_KEY },
      create: { key: CHATBOT_SETTING_KEY, value: config as object },
      update: { value: config as object },
    });
  }

  private resolveRuntimeKeys(config: ChatbotConfig) {
    const envOpenAi = process.env.OPENAI_API_KEY || '';
    const envGateway = process.env.AI_GATEWAY_API_KEY || '';
    const envModel = process.env.AI_CHAT_MODEL || config.model || 'openai/gpt-4o-mini';

    if (config.provider === 'openai') {
      return {
        provider: 'openai' as const,
        openaiApiKey: config.openaiApiKey || envOpenAi,
        gatewayApiKey: undefined,
        ollamaBaseUrl: undefined,
        model: config.model || envModel,
      };
    }
    if (config.provider === 'gateway') {
      return {
        provider: 'gateway' as const,
        openaiApiKey: undefined,
        gatewayApiKey: config.gatewayApiKey || envGateway,
        ollamaBaseUrl: undefined,
        model: config.model || envModel,
      };
    }
    if (config.provider === 'ollama') {
      return {
        provider: 'ollama' as const,
        openaiApiKey: undefined,
        gatewayApiKey: undefined,
        ollamaBaseUrl:
          config.ollamaBaseUrl ||
          process.env.OLLAMA_BASE_URL?.replace(/\/$/, '') ||
          DEFAULT_OLLAMA_BASE_URL,
        model: normalizeOllamaModel(
          config.model || process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL,
        ),
      };
    }
    return {
      provider: 'env' as const,
      openaiApiKey: envOpenAi || undefined,
      gatewayApiKey: envGateway || undefined,
      ollamaBaseUrl: undefined,
      model: envModel,
    };
  }

  async getChatbotSettingsAdmin() {
    const config = await this.loadChatbotConfig();
    return {
      enabled: config.enabled,
      provider: config.provider,
      model: config.model,
      extraSystemPrompt: config.extraSystemPrompt || '',
      welcomeMessage: config.welcomeMessage || DEFAULT_CHATBOT_CONFIG.welcomeMessage,
      openaiApiKeyMasked: maskSecret(config.openaiApiKey),
      gatewayApiKeyMasked: maskSecret(config.gatewayApiKey),
      hasOpenaiKey: !!config.openaiApiKey,
      hasGatewayKey: !!config.gatewayApiKey,
      ollamaBaseUrl:
        config.ollamaBaseUrl ||
        process.env.OLLAMA_BASE_URL?.replace(/\/$/, '') ||
        DEFAULT_OLLAMA_BASE_URL,
      envFallback: {
        openai: !!process.env.OPENAI_API_KEY,
        gateway: !!process.env.AI_GATEWAY_API_KEY,
        ollama: !!process.env.OLLAMA_BASE_URL,
        model: process.env.AI_CHAT_MODEL || null,
        ollamaModel: process.env.OLLAMA_MODEL || null,
      },
      updatedAt: (
        await this.prisma.platformSetting.findUnique({ where: { key: CHATBOT_SETTING_KEY } })
      )?.updatedAt,
    };
  }

  async updateChatbotSettings(body: Partial<ChatbotConfig> & { openaiApiKey?: string; gatewayApiKey?: string }) {
    const current = await this.loadChatbotConfig();
    const next: ChatbotConfig = {
      ...current,
      enabled: body.enabled ?? current.enabled,
      provider: body.provider ?? current.provider,
      model: body.model?.trim() || current.model,
      extraSystemPrompt: body.extraSystemPrompt ?? current.extraSystemPrompt,
      welcomeMessage: body.welcomeMessage ?? current.welcomeMessage,
      ollamaBaseUrl: body.ollamaBaseUrl?.trim()
        ? body.ollamaBaseUrl.trim().replace(/\/$/, '')
        : current.ollamaBaseUrl,
    };

    if (body.openaiApiKey && !isMaskedSecret(body.openaiApiKey)) {
      next.openaiApiKey = body.openaiApiKey.trim();
    }
    if (body.gatewayApiKey && !isMaskedSecret(body.gatewayApiKey)) {
      next.gatewayApiKey = body.gatewayApiKey.trim();
    }

    await this.saveChatbotConfig(next);
    return this.getChatbotSettingsAdmin();
  }

  async getChatbotPublicStatus() {
    const config = await this.loadChatbotConfig();
    const keys = this.resolveRuntimeKeys(config);
    const configured =
      keys.provider === 'ollama'
        ? !!keys.ollamaBaseUrl
        : keys.provider === 'env'
          ? !!(keys.gatewayApiKey || keys.openaiApiKey || process.env.OLLAMA_BASE_URL)
          : !!(keys.gatewayApiKey || keys.openaiApiKey);
    return {
      enabled: config.enabled,
      configured,
      welcomeMessage: config.welcomeMessage || DEFAULT_CHATBOT_CONFIG.welcomeMessage,
    };
  }

  async getChatbotRuntimeConfig() {
    const config = await this.loadChatbotConfig();
    const keys = this.resolveRuntimeKeys(config);
    return {
      enabled: config.enabled,
      provider: keys.provider,
      openaiApiKey: keys.openaiApiKey,
      gatewayApiKey: keys.gatewayApiKey,
      ollamaBaseUrl: keys.ollamaBaseUrl,
      model: normalizeOllamaModel(keys.model),
      extraSystemPrompt: config.extraSystemPrompt || '',
    };
  }

  private async ollamaChatOnce(base: string, modelName: string, content: string) {
    const res = await fetch(`${base}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content }],
        stream: false,
        options: {
          num_ctx: 2048,
          num_predict: 256,
        },
      }),
      signal: AbortSignal.timeout(120_000),
    });
    const errText = res.ok ? '' : await res.text();
    const json = res.ok
      ? ((await res.json()) as { choices?: { message?: { content?: string } }[] })
      : null;
    return {
      ok: res.ok,
      status: res.status,
      errText,
      reply: json?.choices?.[0]?.message?.content?.trim() || '',
    };
  }

  async listOllamaModels(baseUrl?: string) {
    const url = (baseUrl || DEFAULT_OLLAMA_BASE_URL).replace(/\/$/, '');
    try {
      const res = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) {
        throw new BadRequestException(`Ollama erişilemedi (${res.status}). Sunucu çalışıyor mu?`);
      }
      const json = (await res.json()) as { models?: { name: string }[] };
      return {
        baseUrl: url,
        models: (json.models || []).map((m) => m.name),
      };
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException(
        `Ollama'ya bağlanılamadı (${url}). ollama serve çalıştırın veya adresi kontrol edin.`,
      );
    }
  }

  async testChatbotConnection() {
    const config = await this.loadChatbotConfig();
    if (!config.enabled) {
      throw new BadRequestException('Asistan panelden kapalı. Önce etkinleştirin.');
    }
    const keys = this.resolveRuntimeKeys(config);

    if (keys.provider === 'ollama') {
      const base = (keys.ollamaBaseUrl || DEFAULT_OLLAMA_BASE_URL).replace(/\/$/, '');
      const primary = normalizeOllamaModel(keys.model || DEFAULT_OLLAMA_MODEL);
      const tryModels = [...new Set([primary, ...OLLAMA_FALLBACK_MODELS])];

      let lastErr = '';
      for (const modelName of tryModels) {
        const attempt = await this.ollamaChatOnce(
          base,
          modelName,
          'Test. Tek kelimeyle yanıt ver: OK',
        );
        if (attempt.ok) {
          const savedModel = (config.model || '').replace(/^openai\//, '').trim();
          const notice =
            modelName !== savedModel && modelName !== primary
              ? `RAM yetersizliği nedeniyle model otomatik olarak "${modelName}" olarak ayarlandı.`
              : savedModel !== modelName
                ? `"${savedModel}" yerine hafif model "${modelName}" kullanılıyor.`
                : undefined;

          if (config.model !== modelName) {
            await this.saveChatbotConfig({ ...config, model: modelName, provider: 'ollama' });
          }

          return {
            ok: true,
            provider: 'ollama',
            model: modelName,
            reply: attempt.reply || 'OK',
            notice,
          };
        }

        lastErr = attempt.errText;
        if (!isOllamaMemoryError(attempt.errText)) break;
      }

      if (isOllamaMemoryError(lastErr)) {
        throw new BadRequestException(ollamaMemoryHelp(primary));
      }
      throw new BadRequestException(
        `Ollama bağlantısı başarısız: ${lastErr.slice(0, 280) || 'bilinmeyen hata'}`,
      );
    }

    const useGateway = keys.provider === 'gateway' || (!!keys.gatewayApiKey && !keys.openaiApiKey);
    const apiKey = useGateway ? keys.gatewayApiKey : keys.openaiApiKey;
    if (!apiKey) {
      throw new BadRequestException(
        'API anahtarı tanımlı değil. Panelden anahtar girin veya .env dosyasına OPENAI_API_KEY / AI_GATEWAY_API_KEY ekleyin.',
      );
    }

    const model = keys.model || 'openai/gpt-4o-mini';
    const baseUrl = useGateway ? 'https://ai-gateway.vercel.sh/v1' : 'https://api.openai.com/v1';
    const modelName = useGateway ? model : model.replace(/^openai\//, '') || 'gpt-4o-mini';

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: 'user',
            content: 'Test. Tek kelimeyle yanıt ver: OK',
          },
        ],
        max_tokens: 8,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new BadRequestException(
        `Bağlantı başarısız (${res.status}): ${errText.slice(0, 240)}`,
      );
    }

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return {
      ok: true,
      provider: useGateway ? 'gateway' : 'openai',
      model: modelName,
      reply: json.choices?.[0]?.message?.content?.trim() || 'OK',
    };
  }

  listLegalDocuments(context?: string) {
    const ctx =
      context === 'subscription_checkout' ? 'subscription_checkout' : 'dealer_business';
    return documentsForContext(ctx).map((d) => ({
      id: d.id,
      title: d.title,
      shortLabel: d.shortLabel,
      version: LEGAL_DOCUMENT_VERSION,
      content: d.content,
    }));
  }

  getLegalDocument(id: string) {
    const doc = LEGAL_DOCUMENTS.find((d) => d.id === id);
    if (!doc) throw new NotFoundException('Sözleşme bulunamadı');
    return {
      id: doc.id,
      title: doc.title,
      shortLabel: doc.shortLabel,
      version: LEGAL_DOCUMENT_VERSION,
      content: doc.content,
    };
  }

  // --- Price Campaigns --------------------------------------------------------

  async createPriceCampaign(data: {
    name: string;
    type: 'DISCOUNT' | 'INCREASE';
    target: 'MODULE' | 'PLAN' | 'ALL';
    targetIds: string[];
    percent: number;
    validFrom: string;
    validTo?: string;
  }) {
    const campaign = await this.prisma.priceCampaign.create({
      data: {
        name: data.name,
        type: data.type,
        target: data.target,
        targetIds: data.targetIds || [],
        percent: data.percent,
        validFrom: new Date(data.validFrom),
        validTo: data.validTo ? new Date(data.validTo) : null,
      },
    });

    // Create a message for tenants
    const actionText = data.type === 'DISCOUNT' ? 'indirim fırsatı' : 'fiyat güncellemesi';
    const targetText = data.target === 'ALL' ? 'Tüm modül ve planlarımızda' :
                       data.target === 'PLAN' ? 'Seçili planlarımızda' : 'Seçili modüllerimizde';
    
    const targetModules = data.targetIds.length > 0 ? ` (${data.targetIds.join(', ')})` : '';

    const message = await this.prisma.message.create({
      data: {
        fromTenantId: 'ten-root',
        title: `Bilgilendirme: ${data.name}`,
        body: `Değerli müşterimiz, ${targetText}${targetModules} ${data.validFrom} tarihinden itibaren geçerli olmak üzere %${data.percent} ${actionText} tanımlanmıştır. Detaylı bilgi için bayiinizle iletişime geçebilir veya fiyatlandırma sayfamızı ziyaret edebilirsiniz.`,
        targetType: 'ALL',
        sentAt: new Date(),
      }
    });

    // Send to all tenants
    const allTenants = await this.prisma.tenant.findMany({
      where: { type: { in: ['BUSINESS', 'DEALER', 'BRANCH'] }, isActive: true }
    });

    await this.prisma.messageRecipient.createMany({
      data: allTenants.map(t => ({
        messageId: message.id,
        tenantId: t.id,
      })),
      skipDuplicates: true,
    });

    await this.prisma.priceCampaign.update({
      where: { id: campaign.id },
      data: { autoMessageSent: true }
    });

    return campaign;
  }

  async listPriceCampaigns() {
    return this.prisma.priceCampaign.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async deletePriceCampaign(id: string) {
    return this.prisma.priceCampaign.delete({ where: { id } });
  }

  async getActivePriceCampaigns() {
    const now = new Date();
    return this.prisma.priceCampaign.findMany({
      where: {
        isActive: true,
        validFrom: { lte: now },
        OR: [
          { validTo: null },
          { validTo: { gte: now } }
        ]
      }
    });
  }

  async getActivePopups(tenantId: string) {
    const now = new Date();
    // Get future INCREASE campaigns
    const futureIncreases = await this.prisma.priceCampaign.findMany({
      where: {
        isActive: true,
        type: 'INCREASE',
        validFrom: { gt: now }
      }
    });

    if (futureIncreases.length === 0) return [];

    const acks = await this.prisma.tenantPopupAck.findMany({
      where: {
        tenantId,
        campaignId: { in: futureIncreases.map(c => c.id) },
        ackType: 'DONT_SHOW_AGAIN'
      }
    });
    
    const ackedIds = new Set(acks.map(a => a.campaignId));
    return futureIncreases.filter(c => !ackedIds.has(c.id));
  }

  async ackPopup(tenantId: string, campaignId: string, ackType: string) {
    return this.prisma.tenantPopupAck.upsert({
      where: { tenantId_campaignId: { tenantId, campaignId } },
      update: { ackType },
      create: { tenantId, campaignId, ackType }
    });
  }
}
