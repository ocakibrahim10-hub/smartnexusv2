/** Ek paket kodlarının abonelik modül kimliklerine eşlemesi (API ile uyumlu) */
export const ADDON_CODE_TO_MODULES: Record<string, string[]> = {
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

export function isAddonPurchasableForPlan(planModules: string[], code: string): boolean {
  if (code === 'EXTRA_BRANCH') return true;
  const granted = ADDON_CODE_TO_MODULES[code] || [];
  if (!granted.length) return false;
  return granted.some((id) => !planModules.includes(id));
}

export function filterAddonsForPlan<T extends { code: string }>(
  planModules: string[],
  addons: T[],
): T[] {
  return addons.filter((a) => isAddonPurchasableForPlan(planModules, a.code));
}
