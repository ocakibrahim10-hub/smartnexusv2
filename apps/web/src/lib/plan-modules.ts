/** Paket başına varsayılan dahil modüller — ek modül listesi bu listeye göre hesaplanır */
export const DEFAULT_PLAN_MODULES: Record<string, { modules: string[] }> = {
  BASIC: {
    modules: [
      'ACCOUNTING.INVOICES',
      'ACCOUNTING.CONTACTS',
      'ACCOUNTING.CASH',
      'ACCOUNTING.REPORTS',
      'INVENTORY.PRODUCTS',
      'INVENTORY.WAREHOUSES',
      'POS.MAIN',
    ],
  },
  PROFESSIONAL: {
    modules: [
      'ACCOUNTING.INVOICES',
      'ACCOUNTING.CONTACTS',
      'ACCOUNTING.CASH',
      'ACCOUNTING.REPORTS',
      'INVENTORY.PRODUCTS',
      'INVENTORY.WAREHOUSES',
      'POS.MAIN',
      'ACCOUNTING.EDOCUMENT',
      'INVENTORY.MOVEMENTS',
      'INVENTORY.TRANSFERS',
      'TMS.SHIPMENTS',
      'TMS.VEHICLES',
      'B2B.ORDERS',
      'B2B.CUSTOMERS',
      'B2B.PRICE_LISTS',
      'MARKETPLACE.MAIN',
    ],
  },
  PLATINUM: {
    modules: [
      'ACCOUNTING.INVOICES',
      'ACCOUNTING.CONTACTS',
      'ACCOUNTING.CASH',
      'ACCOUNTING.REPORTS',
      'INVENTORY.PRODUCTS',
      'INVENTORY.WAREHOUSES',
      'POS.MAIN',
      'ACCOUNTING.EDOCUMENT',
      'INVENTORY.MOVEMENTS',
      'INVENTORY.TRANSFERS',
      'TMS.SHIPMENTS',
      'TMS.VEHICLES',
      'B2B.ORDERS',
      'B2B.CUSTOMERS',
      'B2B.PRICE_LISTS',
      'MARKETPLACE.MAIN',
      'INVENTORY.AI_FORECAST',
      'MULTI_BRANCH.MAIN',
      'DEALER.BRANCHES',
    ],
  },
};

export function canonicalPlanModules(plan: string, templateModules?: string[]): string[] {
  const canonical = DEFAULT_PLAN_MODULES[plan]?.modules;
  if (canonical?.length) return canonical;
  return templateModules ?? [];
}
