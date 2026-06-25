import { ForbiddenException, Injectable } from '@nestjs/common';
import { PlanType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { formatLimitMessage, getPlanLimits, BRANCH_PLATFORM_REVIEW_THRESHOLD } from './plan-limits';

@Injectable()
export class PlanLimitsService {
  constructor(private prisma: PrismaService) {}

  async getUsage(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true, type: true },
    });
    if (!tenant) return null;

    const limits = getPlanLimits(tenant.plan);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [users, warehouses, branches, eInvoicesThisMonth] = await Promise.all([
      this.prisma.user.count({ where: { tenantId, isActive: true } }),
      this.prisma.warehouse.count({ where: { tenantId } }),
      tenant.type === 'BUSINESS'
        ? this.prisma.tenant.count({ where: { parentId: tenantId, type: 'BRANCH' } })
        : Promise.resolve(0),
      this.prisma.invoice.count({
        where: {
          tenantId,
          eInvoiceId: { not: null },
          updatedAt: { gte: startOfMonth },
        },
      }),
    ]);

    return {
      plan: tenant.plan,
      limits,
      usage: { users, warehouses, branches, eInvoicesThisMonth },
    };
  }

  async assertCanAddUser(tenantId: string, plan: PlanType) {
    const { maxUsers } = getPlanLimits(plan);
    if (maxUsers === null) return;
    const count = await this.prisma.user.count({ where: { tenantId, isActive: true } });
    if (count >= maxUsers) {
      throw new ForbiddenException(
        formatLimitMessage('Kullanıcı', count, maxUsers, plan),
      );
    }
  }

  async assertCanAddWarehouse(tenantId: string, plan: PlanType) {
    const { maxWarehouses } = getPlanLimits(plan);
    if (maxWarehouses === null) return;
    const count = await this.prisma.warehouse.count({ where: { tenantId } });
    if (count >= maxWarehouses) {
      throw new ForbiddenException(
        formatLimitMessage('Depo', count, maxWarehouses, plan),
      );
    }
  }

  async assertCanAddBranch(businessId: string, plan: PlanType) {
    const [sub, template, count] = await Promise.all([
      this.prisma.subscription.findUnique({ where: { tenantId: businessId } }),
      this.prisma.planTemplate.findUnique({ where: { plan } }),
      this.prisma.tenant.count({ where: { parentId: businessId, type: 'BRANCH' } })
    ]);

    // DB'de PlanTemplate yoksa fallback olarak: PRO = 1, PLATINUM = 5, BASIC = 0
    let baseMax = template?.maxBranches;
    if (baseMax === undefined || baseMax === null) {
      if (plan === 'PROFESSIONAL') baseMax = 1;
      else if (plan === 'PLATINUM') baseMax = 5;
      else baseMax = 0;
    }

    // Platinum pakette sınırsız olsa bile belli sayıda platform onayı
    if (baseMax >= 9999) {
      if (count >= BRANCH_PLATFORM_REVIEW_THRESHOLD) {
        throw new ForbiddenException(
          `${BRANCH_PLATFORM_REVIEW_THRESHOLD} şubeden fazlası için SmartNexus platform onayı gerekir. destek@smartnexus.com ile iletişime geçin.`,
        );
      }
      return;
    }

    const extra = sub?.extraBranches ?? 0;
    const maxBranches = baseMax + extra;

    if (maxBranches === 0) {
      throw new ForbiddenException(
        `${plan} paketinde şube açılamaz. Lütfen paketinizi yükseltin veya ekstra şube hakkı satın alın.`,
      );
    }

    if (count >= maxBranches) {
      throw new ForbiddenException(
        `Şube limiti doldu (${count}/${maxBranches}). Lütfen paketinizi yükseltin veya ekstra şube hakkı satın alın.`,
      );
    }
  }

  async assertCanSendEInvoice(tenantId: string, plan: PlanType) {
    const { eInvoicePerMonth } = getPlanLimits(plan);
    if (eInvoicePerMonth === null) return;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const count = await this.prisma.invoice.count({
      where: {
        tenantId,
        eInvoiceId: { not: null },
        updatedAt: { gte: startOfMonth },
      },
    });
    if (count >= eInvoicePerMonth) {
      throw new ForbiddenException(
        formatLimitMessage('E-Fatura (aylık)', count, eInvoicePerMonth, plan),
      );
    }
  }
}
