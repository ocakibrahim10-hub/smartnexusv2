import { AddonModuleCode } from '@prisma/client';

/** Ek paket kodlarının abonelik modül kimliklerine eşlemesi */
export const ADDON_CODE_TO_MODULES: Record<AddonModuleCode, string[]> = {
  POS_YAZARKASA: ['POS.MAIN'],
  API_ACCESS: ['INTEGRATIONS.API'],
  MARKETPLACE: ['MARKETPLACE.MAIN'],
  EINVOICE: [],
  EARCHIVE: [],
  SMS: [],
  HR_PAYROLL: ['HR.LEAVES', 'HR.PAYROLL'],
  ADVANCED_CRM: ['CRM.LEADS', 'CRM.PIPELINE'],
  MOBILE_ACCESS: ['MOBILE.MAIN'],
  AI_FEATURES: ['AI.ASSISTANT'],
  B2C_ECOMMERCE: ['B2C.MAIN'],
  MANUFACTURING: ['MRP.MAIN'],
  EXTRA_BRANCH: [],
};

export function mergeAddonModules(
  baseModules: string[],
  addonCodes: AddonModuleCode[] = [],
): string[] {
  const set = new Set(baseModules);
  for (const code of addonCodes) {
    for (const id of ADDON_CODE_TO_MODULES[code] || []) set.add(id);
  }
  return [...set];
}
