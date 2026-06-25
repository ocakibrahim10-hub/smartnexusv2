import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DEFAULT_PLAN_MODULES,
  DEALER_DEFAULT_MODULES,
  DEALER_PLAN_MODULES,
} from '../../common/plan-modules';
import { expandLegacyModules } from '../../common/module-catalog';
import { PlanLimitsService } from '../../common/plan-limits.service';
import { subscriptionRemainingDays } from '../../common/pricing.util';
import { normalizePhone } from '../../common/phone.util';
import {
  documentsForContext,
  LEGAL_DOCUMENT_VERSION,
} from '../../common/legal-documents';

type AuthUser = {
  id: string;
  tenantId: string;
  tenantType: string;
  role: string;
};

@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    private planLimits: PlanLimitsService,
  ) {}

  private async getScopeIds(user: AuthUser): Promise<string[] | 'ALL'> {
    if (user.tenantType === 'SUPERADMIN') return 'ALL';

    if (user.tenantType === 'DEALER') {
      const tree = await this.prisma.tenant.findMany({
        where: {
          OR: [
            { id: user.tenantId },
            { parentId: user.tenantId },
            { parent: { parentId: user.tenantId } },
          ],
        },
        select: { id: true },
      });
      return tree.map((t) => t.id);
    }

    if (user.tenantType === 'BUSINESS') {
      const tree = await this.prisma.tenant.findMany({
        where: { OR: [{ id: user.tenantId }, { parentId: user.tenantId }] },
        select: { id: true },
      });
      return tree.map((t) => t.id);
    }

    return [user.tenantId];
  }

  private assertInScope(user: AuthUser, tenantId: string, scope: string[] | 'ALL') {
    if (scope === 'ALL') return;
    if (!scope.includes(tenantId)) {
      throw new ForbiddenException('Bu kayda erişim yetkiniz yok');
    }
  }

  async getSuperAdminDashboard(user: AuthUser) {
    if (user.tenantType !== 'SUPERADMIN') {
      throw new ForbiddenException('Sadece platform yöneticisi erişebilir');
    }
    const [tenantCounts, subscriptionStats, recentTenants, ticketStats] = await Promise.all([
      this.prisma.tenant.groupBy({ by: ['type'], _count: { id: true } }),
      this.prisma.subscription.aggregate({ _sum: { price: true }, _count: { id: true } }),
      this.prisma.tenant.findMany({
        where: { type: { not: 'SUPERADMIN' } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          type: true,
          plan: true,
          isActive: true,
          createdAt: true,
          city: true,
        },
      }),
      this.prisma.supportTicket.groupBy({ by: ['status'], _count: { id: true } }),
    ]);

    const counts: Record<string, number> = {};
    for (const g of tenantCounts) counts[g.type] = g._count.id;

    const ticketCounts: Record<string, number> = {};
    for (const g of ticketStats) ticketCounts[g.status] = g._count.id;

    return {
      dealers: counts['DEALER'] || 0,
      businesses: counts['BUSINESS'] || 0,
      branches: counts['BRANCH'] || 0,
      totalSubscriptions: subscriptionStats._count.id,
      monthlyRevenue: subscriptionStats._sum.price || 0,
      openTickets: ticketCounts['OPEN'] || 0,
      inProgressTickets: ticketCounts['IN_PROGRESS'] || 0,
      recentTenants,
    };
  }

  async getDealers(user: AuthUser, query: { search?: string; isActive?: string }) {
    if (user.tenantType !== 'SUPERADMIN') {
      throw new ForbiddenException('Bayi listesine sadece platform yöneticisi erişebilir');
    }

    const where: any = { type: 'DEALER' };
    if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.tenant.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        children: {
          where: { type: { in: ['BUSINESS', 'BRANCH'] } },
          select: { id: true, type: true, name: true, isActive: true },
        },
        subscription: { select: { plan: true, endDate: true, price: true, modules: true } },
      },
    });
  }

  async getBusinesses(
    user: AuthUser,
    query: { search?: string; isActive?: string; dealerId?: string },
  ) {
    const where: any = { type: 'BUSINESS' };

    if (user.tenantType === 'SUPERADMIN') {
      if (query.dealerId) where.parentId = query.dealerId;
    } else if (user.tenantType === 'DEALER') {
      where.parentId = user.tenantId;
    } else if (user.tenantType === 'BUSINESS') {
      where.id = user.tenantId;
    } else {
      return [];
    }

    if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
        { taxNo: { contains: query.search } },
      ];
    }

    return this.prisma.tenant.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        parent: { select: { id: true, name: true } },
        subscription: {
          select: { plan: true, endDate: true, autoRenew: true, price: true, modules: true },
        },
        children: {
          where: { type: 'BRANCH' },
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            code: true,
            isActive: true,
            city: true,
            phone: true,
            email: true,
            address: true,
            createdAt: true,
            users: {
              where: { role: { in: ['OWNER', 'ADMIN'] } },
              orderBy: { createdAt: 'asc' },
              take: 1,
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                isActive: true,
              },
            },
          },
        },
      },
    });
  }

  async getBranches(
    user: AuthUser,
    query: { search?: string; isActive?: string; businessId?: string },
  ) {
    const scope = await this.getScopeIds(user);
    const where: any = { type: 'BRANCH' };

    if (scope !== 'ALL') {
      where.id = { in: scope };
    }

    if (user.tenantType === 'DEALER') {
      where.parent = { parentId: user.tenantId };
    } else if (user.tenantType === 'BUSINESS') {
      where.parentId = user.tenantId;
    }

    if (query.businessId) where.parentId = query.businessId;
    if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.tenant.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        parent: { select: { id: true, name: true, parent: { select: { id: true, name: true } } } },
        subscription: { select: { plan: true, endDate: true, price: true, modules: true } },
        users: {
          where: { role: { in: ['OWNER', 'ADMIN'] } },
          orderBy: { createdAt: 'asc' },
          take: 3,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
          },
        },
      },
    });
  }

  async getTenant(user: AuthUser, id: string) {
    const scope = await this.getScopeIds(user);
    this.assertInScope(user, id, scope);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true, type: true } },
        children: { select: { id: true, name: true, type: true, isActive: true, city: true } },
        subscription: true,
        users: {
          select: { id: true, name: true, email: true, role: true, isActive: true },
          take: 10,
        },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant bulunamadı');
    return tenant;
  }

  async createTenant(user: AuthUser, dto: any) {
    if (user.tenantType === 'BRANCH') {
      throw new ForbiddenException('Şube hesabı yeni işletme veya bayi oluşturamaz');
    }

    let plan = dto.plan || 'BASIC';
    let parentId = dto.parentId || null;
    let parentSubscription: { plan: any; modules: string[]; endDate: Date } | null = null;

    if (user.tenantType === 'BUSINESS') {
      if (dto.type !== 'BRANCH') {
        throw new ForbiddenException('İşletme yalnızca şube oluşturabilir');
      }
      parentId = user.tenantId;
    }

    if (user.tenantType === 'DEALER') {
      if (dto.type !== 'BUSINESS' && dto.type !== 'BRANCH') {
        throw new ForbiddenException('Bayi sadece işletme veya şube oluşturabilir');
      }
      if (dto.type === 'BUSINESS') parentId = user.tenantId;
      if (dto.type === 'BRANCH') {
        const business = await this.prisma.tenant.findFirst({
          where: { id: dto.parentId, type: 'BUSINESS', parentId: user.tenantId },
        });
        if (!business) throw new ForbiddenException('Geçersiz işletme');
        await this.planLimits.assertCanAddBranch(business.id, business.plan);
        parentId = dto.parentId;
      }
    }

    if (dto.type === 'BRANCH') {
      if (!dto.managerName?.trim() || !dto.managerEmail?.trim()) {
        throw new BadRequestException('Şube yetkilisi adı ve e-posta zorunludur');
      }
      if (!parentId) {
        throw new BadRequestException('Şube için bağlı işletme gerekli');
      }
      const business = await this.prisma.tenant.findFirst({
        where: { id: parentId, type: 'BUSINESS' },
        include: { subscription: true },
      });
      if (!business) throw new BadRequestException('Geçersiz işletme');
      if (user.tenantType === 'BUSINESS' || user.tenantType === 'DEALER') {
        await this.planLimits.assertCanAddBranch(business.id, business.plan);
      }
      plan = business.plan;
      if (business.subscription) {
        parentSubscription = {
          plan: business.subscription.plan,
          modules: business.subscription.modules,
          endDate: business.subscription.endDate,
        };
      }
    }

    const code = `${String(dto.type).substring(0, 3)}-${Date.now().toString(36).toUpperCase()}`;
    const isDealer = dto.type === 'DEALER';
    const requiresPayment =
      dto.requiresPayment === true ||
      (user.tenantType === 'DEALER' && dto.type === 'BUSINESS');

    const taxNoNorm = dto.taxNo?.trim() || null;
    if (taxNoNorm && ['BUSINESS', 'DEALER'].includes(dto.type)) {
      const dup = await this.prisma.tenant.findFirst({
        where: { taxNo: taxNoNorm, type: dto.type, isActive: true },
      });
      if (dup) {
        throw new ConflictException('Bu vergi numarası ile aktif kayıt zaten mevcut');
      }
    }

    if (requiresPayment && user.tenantType === 'DEALER' && dto.type === 'BUSINESS') {
      const required = documentsForContext('dealer_business').map((d) => d.id);
      const accepted: string[] = dto.acceptedDocuments || [];
      if (!required.every((id) => accepted.includes(id))) {
        throw new BadRequestException('İşletme kaydı için tüm sözleşmeleri kabul etmelisiniz');
      }
    }

    const template = isDealer
      ? { modules: DEALER_DEFAULT_MODULES, price: DEALER_PLAN_MODULES.price }
      : await this.getPlanTemplateModules(plan);

    const tenant = await this.prisma.tenant.create({
      data: {
        code,
        type: dto.type,
        name: dto.name,
        parentId,
        plan,
        phone: dto.phone || dto.managerPhone || null,
        email: dto.email || dto.managerEmail || null,
        address: dto.address || null,
        city: dto.city || null,
        region: dto.region || null,
        taxNo: taxNoNorm,
        taxOffice: dto.taxOffice || null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        isActive: !requiresPayment,
      },
    });

    const endDate = parentSubscription?.endDate ? new Date(parentSubscription.endDate) : new Date();
    if (!requiresPayment && !parentSubscription) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    const businessParent = parentId
      ? await this.prisma.tenant.findUnique({ where: { id: parentId }, select: { parentId: true } })
      : null;

    await this.prisma.subscription.create({
      data: {
        tenantId: tenant.id,
        plan: parentSubscription?.plan || plan,
        startDate: new Date(),
        endDate,
        autoRenew: !requiresPayment,
        price: requiresPayment ? null : dto.type === 'BRANCH' ? null : template.price,
        modules:
          requiresPayment && !parentSubscription
            ? []
            : (parentSubscription?.modules ?? dto.modules ?? template.modules),
        dealerId:
          user.tenantType === 'DEALER'
            ? user.tenantId
            : businessParent?.parentId || parentId,
      },
    });

    if (dto.type === 'BRANCH') {
      const email = String(dto.managerEmail).trim().toLowerCase();
      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (existing) throw new ConflictException('Yetkili e-posta adresi zaten kayıtlı');

      const managerPhone = normalizePhone(dto.managerPhone || dto.phone);
      if (!managerPhone) {
        throw new BadRequestException('Şube yetkilisi için geçerli cep telefonu zorunludur');
      }

      const rawPassword =
        dto.managerPassword?.trim() ||
        `Sn${Math.random().toString(36).slice(2, 8)}!`;
      const password = await argon2.hash(rawPassword);
      const managerName = String(dto.managerName).trim();
      const personnelCode = `PRS-${Date.now().toString(36).toUpperCase()}`;

      await this.prisma.$transaction(async (tx) => {
        const contact = await tx.contact.create({
          data: {
            tenantId: tenant.id,
            type: 'BOTH',
            name: managerName,
            code: personnelCode,
            phone: managerPhone,
            email,
            isPersonnel: true,
            personnelRole: 'ADMIN',
            isActive: true,
          },
        });

        await tx.user.create({
          data: {
            tenantId: tenant.id,
            name: managerName,
            email,
            phone: managerPhone,
            password,
            role: 'ADMIN',
            contactId: contact.id,
          },
        });
      });
    }

    if (requiresPayment && user.tenantType === 'DEALER' && dto.type === 'BUSINESS') {
      const required = documentsForContext('dealer_business').map((d) => d.id);
      await this.prisma.legalAcceptance.createMany({
        data: required.map((documentId) => ({
          userId: user.id,
          tenantId: tenant.id,
          documentId,
          documentVersion: LEGAL_DOCUMENT_VERSION,
          context: 'dealer_business',
        })),
      });
    }

    return tenant;
  }

  async getPlanUsage(tenantId: string) {
    return this.planLimits.getUsage(tenantId);
  }

  async updateTenant(user: AuthUser, id: string, dto: any) {
    const scope = await this.getScopeIds(user);
    this.assertInScope(user, id, scope);

    const existing = await this.getTenant(user, id);
    if (user.tenantType === 'DEALER' && existing.type === 'DEALER') {
      throw new ForbiddenException('Bayi kaydı düzenlenemez');
    }

    return this.prisma.tenant.update({
      where: { id },
      data: {
        name: dto.name,
        plan: dto.plan,
        isActive: dto.isActive,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        city: dto.city,
        region: dto.region,
        taxNo: dto.taxNo,
        taxOffice: dto.taxOffice,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
  }

  async deactivateTenant(user: AuthUser, id: string) {
    const scope = await this.getScopeIds(user);
    this.assertInScope(user, id, scope);
    return this.prisma.tenant.update({ where: { id }, data: { isActive: false } });
  }

  async getSubscriptions(user: AuthUser, query: { plan?: string; search?: string }) {
    const scope = await this.getScopeIds(user);
    const where: any = {};

    if (scope !== 'ALL') {
      where.tenantId = { in: scope };
    }

    if (query.plan) where.plan = query.plan;
    if (query.search) {
      where.tenant = { name: { contains: query.search, mode: 'insensitive' } };
    }

    return this.prisma.subscription.findMany({
      where,
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            type: true,
            city: true,
            isActive: true,
            parent: { select: { name: true } },
          },
        },
      },
      orderBy: { endDate: 'asc' },
    });
  }

  async getPlanTemplates() {
    const rows = await this.prisma.planTemplate.findMany({ orderBy: { plan: 'asc' } });
    if (rows.length === 0) {
      return Object.entries(DEFAULT_PLAN_MODULES).map(([plan, cfg]) => ({
        plan,
        modules: cfg.modules,
        price: cfg.price,
        discountPercent: cfg.discountPercent ?? 0,
        description: cfg.description,
        maxBranches: cfg.maxBranches ?? 0,
        extraBranchPrice: cfg.extraBranchPrice ?? 0,
      }));
    }
    return rows;
  }

  async updatePlanTemplate(
    user: AuthUser,
    plan: string,
    dto: { modules: string[]; price?: number; description?: string; discountPercent?: number; maxBranches?: number; extraBranchPrice?: number },
  ) {
    if (user.tenantType !== 'SUPERADMIN') {
      throw new ForbiddenException('Paket şablonlarını sadece platform yöneticisi düzenleyebilir');
    }

    const modules = expandLegacyModules(dto.modules);

    const template = await this.prisma.planTemplate.upsert({
      where: { plan: plan as any },
      update: {
        modules,
        price: dto.price,
        description: dto.description,
        discountPercent: dto.discountPercent ?? undefined,
        maxBranches: dto.maxBranches,
        extraBranchPrice: dto.extraBranchPrice,
      },
      create: {
        plan: plan as any,
        modules,
        price: dto.price ?? DEFAULT_PLAN_MODULES[plan]?.price ?? 0,
        discountPercent: dto.discountPercent ?? DEFAULT_PLAN_MODULES[plan]?.discountPercent ?? 0,
        description: dto.description ?? DEFAULT_PLAN_MODULES[plan]?.description,
        maxBranches: dto.maxBranches ?? DEFAULT_PLAN_MODULES[plan]?.maxBranches ?? 0,
        extraBranchPrice: dto.extraBranchPrice ?? DEFAULT_PLAN_MODULES[plan]?.extraBranchPrice ?? 0,
      },
    });

    await this.prisma.subscription.updateMany({
      where: {
        plan: plan as any,
        tenant: { type: { in: ['BUSINESS', 'BRANCH'] } },
      },
      data: {
        modules,
        price: dto.price,
      },
    });

    await this.prisma.tenant.updateMany({
      where: { type: { in: ['BUSINESS', 'BRANCH'] }, subscription: { is: { plan: plan as any } } },
      data: { plan: plan as any },
    });

    return template;
  }

  private async getPlanTemplateModules(plan: string) {
    const row = await this.prisma.planTemplate.findUnique({ where: { plan: plan as any } });
    if (row) return { modules: row.modules, price: row.price ?? 0 };
    const fallback = DEFAULT_PLAN_MODULES[plan] ?? DEFAULT_PLAN_MODULES.BASIC;
    return { modules: fallback.modules, price: fallback.price };
  }

  async upsertSubscription(user: AuthUser, tenantId: string, dto: any) {
    const scope = await this.getScopeIds(user);
    this.assertInScope(user, tenantId, scope);

    if (user.tenantType === 'DEALER') {
      const target = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!target || target.parentId !== user.tenantId) {
        throw new ForbiddenException(
          'Sadece kendi işletmelerinizin aboneliğini düzenleyebilirsiniz',
        );
      }
    }

    const modules = expandLegacyModules(
      dto.modules ?? (await this.getPlanTemplateModules(dto.plan)).modules,
    );

    const sub = await this.prisma.subscription.upsert({
      where: { tenantId },
      update: {
        plan: dto.plan,
        price: dto.price,
        modules,
        autoRenew: dto.autoRenew ?? undefined,
        extraBranches: dto.extraBranches,
      },
      create: {
        tenantId,
        plan: dto.plan,
        startDate: new Date(),
        endDate: dto.endDate
          ? new Date(dto.endDate)
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        price: dto.price,
        autoRenew: dto.autoRenew ?? true,
        modules,
        extraBranches: dto.extraBranches ?? 0,
        dealerId: user.tenantType === 'DEALER' ? user.tenantId : undefined,
      },
    });

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { plan: dto.plan },
    });

    return sub;
  }

  async renewSubscription(user: AuthUser, tenantId: string, months: number = 12) {
    const scope = await this.getScopeIds(user);
    this.assertInScope(user, tenantId, scope);

    const sub = await this.prisma.subscription.findUnique({ where: { tenantId } });
    if (!sub) throw new NotFoundException('Abonelik bulunamadı');
    const newEnd = new Date(sub.endDate);
    newEnd.setMonth(newEnd.getMonth() + months);
    return this.prisma.subscription.update({
      where: { tenantId },
      data: { endDate: newEnd },
    });
  }

  async getSubscriptionStatus(user: AuthUser, tenantId?: string) {
    const targetId = tenantId || user.tenantId;
    const scope = await this.getScopeIds(user);
    this.assertInScope(user, targetId, scope);

    const sub = await this.prisma.subscription.findUnique({
      where: { tenantId: targetId },
      include: { tenant: { select: { name: true, plan: true, type: true } } },
    });
    if (!sub) {
      return { active: false, remainingDays: 0, plan: null, endDate: null, purchasedAddons: [] };
    }

    const remainingDays = subscriptionRemainingDays(sub.endDate);

    return {
      active: remainingDays > 0,
      remainingDays,
      plan: sub.plan,
      startDate: sub.startDate,
      endDate: sub.endDate,
      price: sub.price,
      modules: sub.modules,
      purchasedAddons: sub.purchasedAddons,
      autoRenew: sub.autoRenew,
      tenantName: sub.tenant.name,
    };
  }
}
