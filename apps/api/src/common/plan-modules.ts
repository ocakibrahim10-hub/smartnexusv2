import {
  DEALER_DEFAULT_MODULES,
  BASIC_BUSINESS_MODULES,
  PRO_BUSINESS_MODULES,
  PLATINUM_BUSINESS_MODULES,
  ALL_SUBMODULE_IDS,
} from './module-catalog';

export { MODULE_CATALOG, ALL_SUBMODULE_IDS, DEALER_DEFAULT_MODULES, getModuleLabel } from './module-catalog';

export const DEFAULT_PLAN_MODULES: Record<
  string,
  { modules: string[]; price: number; description: string; discountPercent?: number; maxBranches: number; extraBranchPrice: number }
> = {
  BASIC: {
    modules: BASIC_BUSINESS_MODULES,
    price: 4990,
    discountPercent: 0,
    description: 'Nexus Başlangıç — temel muhasebe, stok ve POS',
    maxBranches: 0,
    extraBranchPrice: 1000,
  },
  PROFESSIONAL: {
    modules: PRO_BUSINESS_MODULES,
    price: 14990,
    discountPercent: 0,
    description: 'Nexus Profesyonel — lojistik, B2B ve e-belge',
    maxBranches: 2,
    extraBranchPrice: 1500,
  },
  PLATINUM: {
    modules: PLATINUM_BUSINESS_MODULES,
    price: 29990,
    discountPercent: 0,
    description: 'Nexus Kurumsal — çok şube, AI tahmin ve tam paket',
    maxBranches: 9999, // Uncapped/Virtual limit
    extraBranchPrice: 0,
  },
};

export const DEALER_PLAN_MODULES = {
  modules: [...DEALER_DEFAULT_MODULES],
  price: 2999,
  description: 'Bayi paneli — işletme, hakediş, faturalama ve raporlama',
};
