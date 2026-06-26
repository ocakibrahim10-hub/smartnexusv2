import { MODULE_CATALOG, expandLegacyModules, getModuleLabel } from './modules';
import { ADDON_CODE_TO_MODULES } from './addon-module-map';

export type SubmodulePriceRow = {
  moduleId: string;
  yearlyPrice: number;
  sellableExtra?: boolean;
  isActive?: boolean;
  label?: string;
};

const ADDON_BASE_PRICES: Partial<Record<string, number>> = {
  POS_YAZARKASA: 299,
  API_ACCESS: 499,
  MARKETPLACE: 399,
  HR_PAYROLL: 349,
  ADVANCED_CRM: 299,
  MOBILE_ACCESS: 199,
  AI_FEATURES: 449,
  B2C_ECOMMERCE: 399,
  MANUFACTURING: 549,
};

let defaultPriceByModuleCache: Record<string, number> | null = null;

export function getDefaultSubmodulePriceMap(): Record<string, number> {
  if (defaultPriceByModuleCache) return defaultPriceByModuleCache;
  const priceByModule: Record<string, number> = {};
  for (const [code, moduleIds] of Object.entries(ADDON_CODE_TO_MODULES)) {
    const base = ADDON_BASE_PRICES[code];
    if (!base || !moduleIds.length) continue;
    const each = Math.round((base / moduleIds.length) * 100) / 100;
    for (const id of moduleIds) priceByModule[id] = each;
  }
  const defaultYearly = 199;
  for (const moduleId of businessSubmoduleIds()) {
    if (priceByModule[moduleId] == null) priceByModule[moduleId] = defaultYearly;
  }
  defaultPriceByModuleCache = priceByModule;
  return priceByModule;
}

export function effectiveSubmodulePrice(row: Pick<SubmodulePriceRow, 'moduleId' | 'yearlyPrice'>): number {
  if ((row.yearlyPrice ?? 0) > 0) return row.yearlyPrice;
  return getDefaultSubmodulePriceMap()[row.moduleId] ?? 0;
}

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
  const included = new Set(expandLegacyModules(planRow?.modules ?? []));

  return (pricing?.submodulePricing ?? [])
    .filter((r) => {
      if (r.isActive === false || r.sellableExtra === false) return false;
      if (included.has(r.moduleId)) return false;
      const groupId = r.moduleId.split('.')[0] ?? r.moduleId;
      if (groupId === 'DEALER') return false;
      return effectiveSubmodulePrice(r) > 0;
    })
    .map((r) => {
      const yearlyPrice = effectiveSubmodulePrice(r);
      return {
        ...r,
        yearlyPrice,
        label: r.label ?? getModuleLabel(r.moduleId),
        groupId: r.moduleId.split('.')[0],
      };
    })
    .sort((a, b) => (a.label ?? '').localeCompare(b.label ?? '', 'tr'));
}

export function prorataModulePrice(yearlyPrice: number, remainingDays: number): number {
  if (remainingDays <= 0 || yearlyPrice <= 0) return yearlyPrice;
  return Math.round((yearlyPrice / 365) * remainingDays * 100) / 100;
}

export function submodulePriceMap(
  rows: SubmodulePriceRow[],
): Record<string, SubmodulePriceRow> {
  return Object.fromEntries(rows.map((r) => [r.moduleId, r]));
}
