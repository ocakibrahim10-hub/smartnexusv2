import { AddonModuleCode } from '@prisma/client';
import { ADDON_CODE_TO_MODULES } from './addon-module-map';

/** Yıllık abonelikle satılabilen ek paket kodları (kontör modülleri hariç) */
export const SUBSCRIPTION_SELLABLE_CODES: AddonModuleCode[] = [
  'POS_YAZARKASA',
  'API_ACCESS',
  'MARKETPLACE',
  'HR_PAYROLL',
  'ADVANCED_CRM',
  'MOBILE_ACCESS',
  'AI_FEATURES',
  'B2C_ECOMMERCE',
  'MANUFACTURING',
  'EXTRA_BRANCH',
];

export function addonModuleIds(code: AddonModuleCode): string[] {
  return ADDON_CODE_TO_MODULES[code] || [];
}

/** Pakette zaten dahil olmayan modül veren ek paketler satın alınabilir */
export function isAddonPurchasableForPlan(planModules: string[], code: AddonModuleCode): boolean {
  if (code === 'EXTRA_BRANCH') return true;
  const granted = addonModuleIds(code);
  if (!granted.length) return false;
  return granted.some((id) => !planModules.includes(id));
}

export function filterAddonsForPlan<T extends { code: AddonModuleCode }>(
  planModules: string[],
  addons: T[],
): T[] {
  return addons.filter((a) => isAddonPurchasableForPlan(planModules, a.code));
}
