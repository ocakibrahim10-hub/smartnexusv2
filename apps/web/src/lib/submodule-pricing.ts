import { MODULE_CATALOG, expandLegacyModules, getModuleLabel } from './modules';

export type SubmodulePriceRow = {
  moduleId: string;
  yearlyPrice: number;
  sellableExtra?: boolean;
  isActive?: boolean;
  label?: string;
};

export function businessSubmoduleIds(): string[] {
  return MODULE_CATALOG.filter((g) => g.id !== 'DEALER').flatMap((g) =>
    g.children.map((c) => c.id),
  );
}

export function sumSubmodulePrices(
  moduleIds: string[],
  rows: SubmodulePriceRow[] | Record<string, SubmodulePriceRow>,
): number {
  const map =
    rows instanceof Array
      ? Object.fromEntries(rows.map((r) => [r.moduleId, r]))
      : rows;
  let total = 0;
  for (const id of expandLegacyModules(moduleIds)) {
    const row = map[id];
    if (row && row.isActive !== false) total += row.yearlyPrice ?? 0;
  }
  return Math.round(total * 100) / 100;
}

export function purchasableExtraModulesFromPricing(
  pricing: {
    plans?: Array<{ plan: string; modules?: string[]; purchasableExtraModules?: SubmodulePriceRow[] }>;
    submodulePricing?: SubmodulePriceRow[];
  } | null,
  selectedPlan: string,
): SubmodulePriceRow[] {
  const planRow = pricing?.plans?.find((p) => p.plan === selectedPlan);
  if (planRow?.purchasableExtraModules?.length) {
    return planRow.purchasableExtraModules.map((m) => ({
      ...m,
      label: m.label ?? getModuleLabel(m.moduleId),
    }));
  }

  const included = new Set(expandLegacyModules(planRow?.modules ?? []));
  return (pricing?.submodulePricing ?? [])
    .filter(
      (r) =>
        r.isActive !== false &&
        r.sellableExtra !== false &&
        (r.yearlyPrice ?? 0) > 0 &&
        !included.has(r.moduleId),
    )
    .map((r) => ({
      ...r,
      label: r.label ?? getModuleLabel(r.moduleId),
      groupId: r.moduleId.split('.')[0],
    }))
    .sort((a, b) => (a.label ?? '').localeCompare(b.label ?? '', 'tr'));
}

export function submodulePriceMap(
  rows: SubmodulePriceRow[],
): Record<string, SubmodulePriceRow> {
  return Object.fromEntries(rows.map((r) => [r.moduleId, r]));
}
