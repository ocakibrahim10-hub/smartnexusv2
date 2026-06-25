import { PlanType } from '@prisma/client';

export type PlanLimitKey = 'maxUsers' | 'maxWarehouses' | 'maxBranches' | 'eInvoicePerMonth';

export type PlanLimits = {
  maxUsers: number | null;
  maxWarehouses: number | null;
  maxBranches: number | null;
  eInvoicePerMonth: number | null;
};

/** PLAN.md paket tablosu — kodda zorunlu limitler */
export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  BASIC: { maxUsers: 3, maxWarehouses: 1, maxBranches: 0, eInvoicePerMonth: 100 },
  PROFESSIONAL: { maxUsers: 10, maxWarehouses: 3, maxBranches: 2, eInvoicePerMonth: 500 },
  PLATINUM: { maxUsers: null, maxWarehouses: null, maxBranches: null, eInvoicePerMonth: null },
};

/** Platinyum pakette platform onayı gerektiren şube üst sınırı (yeniden satış suistimali) */
export const BRANCH_PLATFORM_REVIEW_THRESHOLD = 5;

export function getPlanLimits(plan: PlanType | string): PlanLimits {
  return PLAN_LIMITS[plan as PlanType] ?? PLAN_LIMITS.BASIC;
}

export function formatLimitMessage(
  resource: string,
  current: number,
  max: number,
  plan: string,
): string {
  return `${resource} limiti doldu (${current}/${max}). ${plan} paketinde en fazla ${max} adet. Paket yükseltmesi gerekir.`;
}
