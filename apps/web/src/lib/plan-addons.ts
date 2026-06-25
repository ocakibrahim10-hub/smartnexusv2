import { filterAddonsForPlan, isAddonPurchasableForPlan } from './addon-module-map';

export { filterAddonsForPlan, isAddonPurchasableForPlan };

export function planModulesFromPricing(
  pricing: { plans?: { plan: string; modules?: string[] }[] } | null,
  selectedPlan: string,
): string[] {
  const row = pricing?.plans?.find((p) => p.plan === selectedPlan);
  return row?.modules ?? [];
}
