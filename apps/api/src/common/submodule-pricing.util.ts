import { ADDON_CODE_TO_MODULES } from './addon-module-map';
import { DEFAULT_PLAN_MODULES } from './plan-modules';
import {
  MODULE_CATALOG,
  expandLegacyModules,
  getModuleLabel,
} from './module-catalog';

export type SubmodulePricingRow = {
  moduleId: string;
  yearlyPrice: number;
  sellableExtra: boolean;
  isActive: boolean;
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

/** İşletme paneli alt modül kimlikleri (bayi modülleri hariç) */
export function getBusinessSubmoduleIds(): string[] {
  const fromCatalog = MODULE_CATALOG.filter((g) => g.id !== 'DEALER').flatMap((g) =>
    g.children.map((c) => c.id),
  );
  const fromAddons = Object.values(ADDON_CODE_TO_MODULES).flat();
  return [...new Set([...fromCatalog, ...fromAddons])];
}

export function buildDefaultSubmodulePricing(): SubmodulePricingRow[] {
  const priceByModule: Record<string, number> = {};
  for (const [code, moduleIds] of Object.entries(ADDON_CODE_TO_MODULES)) {
    const base = ADDON_BASE_PRICES[code];
    if (!base || !moduleIds.length) continue;
    const each = Math.round((base / moduleIds.length) * 100) / 100;
    for (const id of moduleIds) priceByModule[id] = each;
  }

  const defaultYearly = 199;
  return getBusinessSubmoduleIds().map((moduleId) => ({
    moduleId,
    yearlyPrice: priceByModule[moduleId] ?? defaultYearly,
    sellableExtra: true,
    isActive: true,
  }));
}

export function pricingMap(rows: SubmodulePricingRow[]): Map<string, SubmodulePricingRow> {
  return new Map(rows.map((r) => [r.moduleId, r]));
}

export function expandPlanModuleSet(planModules: string[]): Set<string> {
  return new Set(expandLegacyModules(planModules));
}

export function sumSubmodulePrices(
  moduleIds: string[],
  rows: SubmodulePricingRow[] | Map<string, SubmodulePricingRow>,
): number {
  const map = rows instanceof Map ? rows : pricingMap(rows);
  let total = 0;
  for (const id of expandLegacyModules(moduleIds)) {
    const row = map.get(id);
    if (row?.isActive) total += row.yearlyPrice ?? 0;
  }
  return Math.round(total * 100) / 100;
}

export function getPurchasableExtraModules(
  planModules: string[],
  rows: SubmodulePricingRow[],
): Array<SubmodulePricingRow & { label: string; groupId: string }> {
  const included = expandPlanModuleSet(planModules);
  const result: Array<SubmodulePricingRow & { label: string; groupId: string }> = [];

  for (const row of rows) {
    if (!row.isActive || !row.sellableExtra || row.yearlyPrice <= 0) continue;
    if (included.has(row.moduleId)) continue;
    const groupId = row.moduleId.split('.')[0] ?? row.moduleId;
    if (groupId === 'DEALER') continue;
    result.push({
      ...row,
      label: getModuleLabel(row.moduleId),
      groupId,
    });
  }

  return result.sort((a, b) => a.label.localeCompare(b.label, 'tr'));
}

export function isExtraModulePurchasable(
  planModules: string[],
  moduleId: string,
  rows: SubmodulePricingRow[] | Map<string, SubmodulePricingRow>,
  planKey?: string,
): boolean {
  const map = rows instanceof Map ? rows : pricingMap(rows);
  const row = map.get(moduleId);
  if (!row?.isActive || !row.sellableExtra || row.yearlyPrice <= 0) return false;
  const included = planKey
    ? expandPlanModuleSet(
        DEFAULT_PLAN_MODULES[planKey]?.modules ?? planModules,
      )
    : expandPlanModuleSet(planModules);
  return !included.has(moduleId);
}
