export type SubModuleDef = { id: string; label: string; route?: string; roles?: string[] };
export type ModuleGroupDef = {
  id: string;
  label: string;
  roles?: string[];
  children: SubModuleDef[];
};

import { canManageUsers } from './role-permissions';

export const MODULE_CATALOG: ModuleGroupDef[] = [
  {
    id: 'DEALER',
    label: 'Bayi Paneli',
    roles: ['DEALER', 'SUPERADMIN'],
    children: [
      {
        id: 'DEALER.BUSINESSES',
        label: 'İşletme Yönetimi',
        route: '/businesses',
        roles: ['DEALER', 'SUPERADMIN'],
      },
      {
        id: 'DEALER.BRANCHES',
        label: 'Şube Takibi',
        route: '/branches',
        roles: ['DEALER', 'SUPERADMIN', 'BUSINESS'],
      },
      {
        id: 'DEALER.COMMISSION',
        label: 'Hakediş Raporları',
        route: '/dealer/commission',
        roles: ['DEALER', 'SUPERADMIN'],
      },
      {
        id: 'DEALER.BILLING',
        label: 'Platform Faturaları',
        route: '/dealer/billing',
        roles: ['DEALER', 'SUPERADMIN'],
      },
      {
        id: 'DEALER.REPORTS',
        label: 'Gelişmiş Raporlama',
        route: '/dealer/reports',
        roles: ['DEALER', 'SUPERADMIN'],
      },
      {
        id: 'DEALER.MESSAGES',
        label: 'Sistem Mesajları',
        route: '/messages',
        roles: ['DEALER', 'SUPERADMIN'],
      },
      {
        id: 'DEALER.SUBSCRIPTIONS',
        label: 'Abonelik Yönetimi',
        route: '/subscriptions',
        roles: ['DEALER', 'SUPERADMIN'],
      },
      {
        id: 'DEALER.USERS',
        label: 'Kullanıcı Yönetimi',
        route: '/users',
        roles: ['DEALER', 'SUPERADMIN', 'BUSINESS', 'BRANCH'],
      },
    ],
  },
  {
    id: 'ACCOUNTING',
    label: 'Muhasebe',
    roles: ['BUSINESS', 'BRANCH', 'SUPERADMIN'],
    children: [
      { id: 'ACCOUNTING.INVOICES', label: 'Faturalar', route: '/accounting/invoices' },
      { id: 'ACCOUNTING.CONTACTS', label: 'Cari Hesaplar', route: '/accounting/contacts' },
      { id: 'ACCOUNTING.CASH', label: 'Kasa & Banka', route: '/accounting/cash' },
      { id: 'ACCOUNTING.LEDGER', label: 'Genel Muhasebe', route: '/accounting/ledger' },
      { id: 'ACCOUNTING.EXPENSES', label: 'Giderler', route: '/accounting/expenses' },
      { id: 'ACCOUNTING.AUDIT', label: 'Denetim Kaydı', route: '/accounting/audit' },
      { id: 'ACCOUNTING.EDOCUMENT', label: 'E-Dönüşüm', route: '/accounting/einvoice' },
      { id: 'ACCOUNTING.REPORTS', label: 'Muhasebe Raporları', route: '/reports' },
    ],
  },
  {
    id: 'INVENTORY',
    label: 'Stok & Depo',
    roles: ['BUSINESS', 'BRANCH', 'SUPERADMIN'],
    children: [
      { id: 'INVENTORY.PRODUCTS', label: 'Ürünler', route: '/inventory/products' },
      { id: 'INVENTORY.WAREHOUSES', label: 'Depolar', route: '/inventory/warehouses' },
      { id: 'INVENTORY.MOVEMENTS', label: 'Stok Hareketleri', route: '/inventory/movements' },
      { id: 'INVENTORY.TRANSFERS', label: 'Transfer Emirleri', route: '/inventory/transfers' },
      { id: 'INVENTORY.AI_FORECAST', label: 'AI Talep Tahmini', route: '/inventory/forecasting' },
    ],
  },

  {
    id: 'TMS',
    label: 'Lojistik (TMS)',
    roles: ['BUSINESS', 'BRANCH', 'SUPERADMIN'],
    children: [
      { id: 'TMS.SHIPMENTS', label: 'Sevkiyatlar', route: '/tms/shipments' },
      { id: 'TMS.VEHICLES', label: 'Araçlar', route: '/tms/vehicles' },
    ],
  },
  {
    id: 'B2B',
    label: 'B2B Portal',
    roles: ['BUSINESS', 'BRANCH', 'SUPERADMIN'],
    children: [
      { id: 'B2B.ORDERS', label: 'Siparişler', route: '/b2b/orders' },
      { id: 'B2B.CUSTOMERS', label: 'Müşteriler', route: '/b2b/customers' },
      { id: 'B2B.PRICE_LISTS', label: 'Fiyat Listeleri', route: '/b2b/price-lists' },
    ],
  },
  {
    id: 'MARKETPLACE',
    label: 'Pazaryeri',
    roles: ['BUSINESS', 'BRANCH', 'SUPERADMIN'],
    children: [{ id: 'MARKETPLACE.MAIN', label: 'Pazaryeri', route: '/marketplace' }],
  },
  {
    id: 'MULTI_BRANCH',
    label: 'Çoklu Şube',
    roles: ['BUSINESS', 'SUPERADMIN'],
    children: [{ id: 'MULTI_BRANCH.MAIN', label: 'Şube Yönetimi', route: '/branches' }],
  },
  {
    id: 'HR',
    label: 'İnsan Kaynakları',
    roles: ['BUSINESS', 'SUPERADMIN', 'DEALER'],
    children: [
      { id: 'HR.LEAVES', label: 'İzinler', route: '/hr/leaves' },
      { id: 'HR.PAYROLL', label: 'Bordrolar', route: '/hr/payroll' },
    ],
  },
  {
    id: 'CRM',
    label: 'Müşteri İlişkileri',
    roles: ['BUSINESS', 'SUPERADMIN', 'DEALER'],
    children: [
      { id: 'CRM.LEADS', label: 'Potansiyel Müşteriler', route: '/crm/leads' },
      { id: 'CRM.PIPELINE', label: 'Satış Hunisi', route: '/crm/pipeline' },
    ],
  },
  {
    id: 'MRP',
    label: 'Üretim (MRP)',
    roles: ['BUSINESS', 'SUPERADMIN', 'DEALER'],
    children: [
      { id: 'MRP.BOM', label: 'Ürün Reçeteleri', route: '/mrp/bom' },
      { id: 'MRP.WORK_ORDERS', label: 'İş Emirleri', route: '/mrp/work-orders' },
    ],
  },
  {
    id: 'AI',
    label: 'Yapay Zeka',
    roles: ['BUSINESS', 'SUPERADMIN', 'DEALER'],
    children: [
      { id: 'AI.ASSISTANT', label: 'AI Asistan', route: '/ai-assistant' },
    ],
  },
  {
    id: 'B2C',
    label: 'B2C E-Ticaret',
    roles: ['BUSINESS', 'SUPERADMIN', 'DEALER'],
    children: [
      { id: 'B2C.MAIN', label: 'B2C Siparişleri', route: '/b2c' },
    ],
  },
];

export const ALL_MODULES = MODULE_CATALOG.flatMap((g) =>
  g.children.map((c) => ({ id: c.id, label: c.label, group: g.label })),
);

export function getModuleLabel(id: string): string {
  const key = String(id).trim();
  const explicit: Record<string, string> = {
    'ACCOUNTING.EXPENSES': 'Giderler',
    'ACCOUNTING.AUDIT': 'Denetim Kaydı',
    'ACCOUNTING.LEDGER': 'Genel Muhasebe',
  };
  if (explicit[key]) return explicit[key];
  const sub = ALL_MODULES.find((m) => m.id === key);
  if (sub) return sub.label;
  const group = MODULE_CATALOG.find((g) => g.id === key);
  if (group) return group.label;
  return humanizeModuleId(key);
}

const MODULE_PART_TR: Record<string, string> = {
  MAIN: 'Ana modül',
  EXPENSES: 'Giderler',
  AUDIT: 'Denetim kaydı',
  LEDGER: 'Genel muhasebe',
  INVOICES: 'Faturalar',
  CONTACTS: 'Cari hesaplar',
  CASH: 'Kasa ve banka',
  EDOCUMENT: 'E-dönüşüm',
  REPORTS: 'Raporlar',
  PRODUCTS: 'Ürünler',
  WAREHOUSES: 'Depolar',
  MOVEMENTS: 'Stok hareketleri',
  TRANSFERS: 'Transfer emirleri',
  AI_FORECAST: 'AI talep tahmini',
  SHIPMENTS: 'Sevkiyatlar',
  VEHICLES: 'Araçlar',
  ORDERS: 'Siparişler',
  CUSTOMERS: 'Müşteriler',
  PRICE_LISTS: 'Fiyat listeleri',
  BUSINESSES: 'İşletme yönetimi',
  BRANCHES: 'Şube takibi',
  COMMISSION: 'Hakediş raporları',
  BILLING: 'Platform faturaları',
  MESSAGES: 'Sistem mesajları',
  SUBSCRIPTIONS: 'Abonelik yönetimi',
  USERS: 'Kullanıcı yönetimi',
  LEAVES: 'İzinler',
  PAYROLL: 'Bordrolar',
  LEADS: 'Potansiyel müşteriler',
  PIPELINE: 'Satış hunisi',
  ASSISTANT: 'AI Asistan',
};

const GROUP_TR: Record<string, string> = {
  ACCOUNTING: 'Muhasebe',
  INVENTORY: 'Stok ve depo',
  TMS: 'Lojistik',
  B2B: 'B2B portal',
  MARKETPLACE: 'Pazaryeri',
  MULTI_BRANCH: 'Çoklu şube',
  DEALER: 'Bayi paneli',
  HR: 'İnsan kaynakları',
  CRM: 'Müşteri ilişkileri',
  MRP: 'Üretim (MRP)',
  AI: 'Yapay zeka',
  B2C: 'B2C e-ticaret',
};

function humanizeModuleId(id: string): string {
  if (!id.includes('.')) {
    return GROUP_TR[id] ?? id.replace(/_/g, ' ').toLowerCase();
  }
  const [group, part] = id.split('.');
  const groupLabel = GROUP_TR[group];
  const partLabel = MODULE_PART_TR[part];
  if (groupLabel && partLabel) return partLabel;
  if (partLabel) return partLabel;
  if (groupLabel) return groupLabel;
  return id.replace(/_/g, ' ').toLowerCase();
}

export const ROUTE_MODULE_MAP: Record<string, string> = {};
for (const group of MODULE_CATALOG) {
  for (const child of group.children) {
    if (child.route) ROUTE_MODULE_MAP[child.route] = child.id;
  }
}
ROUTE_MODULE_MAP['/pos'] = 'POS.MAIN';
ROUTE_MODULE_MAP['/inventory/forecasting'] = 'INVENTORY.AI_FORECAST';
ROUTE_MODULE_MAP['/wms/scanner'] = 'WMS.SCANNER';
ROUTE_MODULE_MAP['/wms/locations'] = 'WMS.LOCATIONS';
ROUTE_MODULE_MAP['/wms/picking'] = 'WMS.PICKING';
ROUTE_MODULE_MAP['/mrp/boms'] = 'MRP.BOM';
ROUTE_MODULE_MAP['/mrp/work-orders'] = 'MRP.WORK_ORDERS';
ROUTE_MODULE_MAP['/hr/personnel'] = 'HR.LEAVES';
ROUTE_MODULE_MAP['/hr/payroll'] = 'HR.PAYROLL';
ROUTE_MODULE_MAP['/hr/leaves'] = 'HR.LEAVES';
ROUTE_MODULE_MAP['/crm/leads'] = 'CRM.LEADS';
ROUTE_MODULE_MAP['/crm/pipeline'] = 'CRM.PIPELINE';
ROUTE_MODULE_MAP['/accounting/purchases'] = 'ACCOUNTING.INVOICES';
ROUTE_MODULE_MAP['/accounting/checks'] = 'ACCOUNTING.CASH';
ROUTE_MODULE_MAP['/dealers'] = 'DEALER.BUSINESSES';
ROUTE_MODULE_MAP['/reports'] = 'ACCOUNTING.REPORTS';
ROUTE_MODULE_MAP['/support'] = 'DEALER.MESSAGES';
ROUTE_MODULE_MAP['/settings'] = 'DEALER.USERS';
ROUTE_MODULE_MAP['/hr'] = 'HR';
ROUTE_MODULE_MAP['/crm'] = 'CRM';
ROUTE_MODULE_MAP['/ai-assistant'] = 'AI.ASSISTANT';
ROUTE_MODULE_MAP['/b2c'] = 'B2C.MAIN';

export function expandLegacyModules(modules: string[]): string[] {
  const set = new Set<string>(modules);
  for (const m of modules) {
    if (!m.includes('.')) {
      const group = MODULE_CATALOG.find((g) => g.id === m);
      group?.children.forEach((c) => set.add(c.id));
    }
  }
  return [...set];
}

export function hasModuleAccess(
  userModules: string[],
  moduleId?: string,
  tenantType?: string,
): boolean {
  // DEMO/TEST ORTAMI: Kullanıcının talebi üzerine "Tüm modüller" herkes için açık bırakıldı.
  return true;
}

/** Yalnızca OWNER/ADMIN erişebilir (personel yönetimi, ayarlar, şube tanımı vb.) */
export const MANAGER_ONLY_ROUTES = ['/users', '/settings', '/branches', '/kontor', '/subscribe'];

export function canAccessRoute(
  pathname: string,
  tenantType: string,
  modules: string[],
  userRole?: string,
): boolean {
  if (tenantType === 'SUPERADMIN') return true;
  if (pathname === '/dashboard') return true;

  if (MANAGER_ONLY_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
    return userRole ? canManageUsers(userRole) : false;
  }

  if (pathname === '/users' || pathname.startsWith('/users/')) {
    return userRole ? canManageUsers(userRole) : false;
  }

  const mod = Object.entries(ROUTE_MODULE_MAP)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([route]) => pathname.startsWith(route))?.[1];
  if (!mod) return true;
  return hasModuleAccess(modules, mod, tenantType);
}

export function getCatalogForTenantType(tenantType: string): ModuleGroupDef[] {
  if (tenantType === 'DEALER') {
    return MODULE_CATALOG.filter(
      (g) => g.id === 'DEALER' || g.roles?.includes('DEALER') || !g.roles,
    );
  }
  if (tenantType === 'BUSINESS' || tenantType === 'BRANCH') {
    return MODULE_CATALOG.filter((g) => g.id !== 'DEALER');
  }
  return MODULE_CATALOG;
}

export function toggleGroupModules(current: string[], groupId: string, enabled: boolean): string[] {
  const group = MODULE_CATALOG.find((g) => g.id === groupId);
  if (!group) return current;
  const childIds = group.children.map((c) => c.id);
  if (enabled) return [...new Set([...current, ...childIds])];
  return current.filter((m) => !childIds.includes(m) && m !== groupId);
}

export function isGroupFullyEnabled(current: string[], groupId: string): boolean {
  const group = MODULE_CATALOG.find((g) => g.id === groupId);
  if (!group) return false;
  const expanded = expandLegacyModules(current);
  return group.children.every((c) => expanded.includes(c.id));
}

export function isGroupPartiallyEnabled(current: string[], groupId: string): boolean {
  const group = MODULE_CATALOG.find((g) => g.id === groupId);
  if (!group) return false;
  const expanded = expandLegacyModules(current);
  const count = group.children.filter((c) => expanded.includes(c.id)).length;
  return count > 0 && count < group.children.length;
}
