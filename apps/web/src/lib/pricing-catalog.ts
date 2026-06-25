import { applyDiscount } from '@/lib/pricing';
import { resolvePricingModuleLabels } from '@/lib/pricing-module-labels';
import type { PricingAddon, PricingPlan } from '@/components/PricingPlanCards';
import { PLAN_ORDER } from '@/lib/plans';

export function buildPlansFromTemplates(planTemplates: Array<{
  plan: string;
  modules?: string[];
  price?: number;
  discountPercent?: number;
  description?: string;
}>): PricingPlan[] {
  return PLAN_ORDER.map((key) => {
    const tpl = planTemplates.find((p) => p.plan === key);
    const modules: string[] = tpl?.modules ?? [];
    const listPrice = tpl?.price ?? 0;
    const discountPercent = tpl?.discountPercent ?? 0;
    const pricing = applyDiscount(listPrice, discountPercent);
    return {
      plan: key,
      price: listPrice,
      ...pricing,
      description: tpl?.description,
      modules,
      moduleLabels: resolvePricingModuleLabels({ modules }),
    };
  });
}

export function mapAddonsForPricing(
  modules: Array<{
    id: string;
    code: string;
    name: string;
    description?: string | null;
    basePrice?: number | null;
    discountPercent?: number;
  }>,
): PricingAddon[] {
  return modules.map((m) => {
    const pricing = applyDiscount(m.basePrice ?? 0, m.discountPercent ?? 0);
    return {
      id: m.id,
      code: m.code,
      name: m.name,
      description: m.description,
      basePrice: m.basePrice,
      ...pricing,
    };
  });
}
