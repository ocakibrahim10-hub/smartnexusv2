export type SubModuleDef = { id: string; label: string; route?: string; roles?: string[] };
export type ModuleGroupDef = {
  id: string;
  label: string;
  roles?: string[];
  children: SubModuleDef[];
};

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
    id: 'POS',
    label: 'Hızlı Satış',
    roles: ['BUSINESS', 'BRANCH', 'SUPERADMIN'],
    children: [{ id: 'POS.MAIN', label: 'Hızlı Satış ve POS Ekranı', route: '/pos' }],
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
    roles: ['BUSINESS', 'SUPERADMIN'],
    children: [
      { id: 'HR.LEAVES', label: 'İzinler', route: '/hr/leaves' },
      { id: 'HR.PAYROLL', label: 'Bordrolar', route: '/hr/payroll' },
    ],
  },
  {
    id: 'CRM',
    label: 'Müşteri İlişkileri',
    roles: ['BUSINESS', 'SUPERADMIN'],
    children: [
      { id: 'CRM.LEADS', label: 'Potansiyel Müşteriler', route: '/crm/leads' },
      { id: 'CRM.PIPELINE', label: 'Satış Hunisi', route: '/crm/pipeline' },
    ],
  },
  {
    id: 'AI',
    label: 'Yapay Zeka',
    roles: ['BUSINESS', 'SUPERADMIN'],
    children: [
      { id: 'AI.ASSISTANT', label: 'AI Asistan', route: '/ai-assistant' },
    ],
  },
  {
    id: 'B2C',
    label: 'B2C E-Ticaret',
    roles: ['BUSINESS', 'SUPERADMIN'],
    children: [
      { id: 'B2C.MAIN', label: 'B2C Siparişleri', route: '/b2c' },
    ],
  },
];

export const DEALER_DEFAULT_MODULES = [
  'DEALER.BUSINESSES',
  'DEALER.MESSAGES',
  'DEALER.COMMISSION',
  'DEALER.BILLING',
  'DEALER.REPORTS',
  'DEALER.SUBSCRIPTIONS',
  'DEALER.USERS',
];

export const BASIC_BUSINESS_MODULES = [
  'ACCOUNTING.INVOICES',
  'ACCOUNTING.CONTACTS',
  'ACCOUNTING.CASH',
  'ACCOUNTING.REPORTS',
  'INVENTORY.PRODUCTS',
  'INVENTORY.WAREHOUSES',
  'POS.MAIN',
];

export const PRO_BUSINESS_MODULES = [
  ...BASIC_BUSINESS_MODULES,
  'ACCOUNTING.EDOCUMENT',
  'INVENTORY.MOVEMENTS',
  'INVENTORY.TRANSFERS',
  'TMS.SHIPMENTS',
  'TMS.VEHICLES',
  'B2B.ORDERS',
  'B2B.CUSTOMERS',
  'B2B.PRICE_LISTS',
  'MARKETPLACE.MAIN',
];

export const PLATINUM_BUSINESS_MODULES = [
  ...PRO_BUSINESS_MODULES,
  'INVENTORY.AI_FORECAST',
  'MULTI_BRANCH.MAIN',
  'DEALER.BRANCHES',
];

export const ALL_SUBMODULE_IDS = MODULE_CATALOG.flatMap((g) => g.children.map((c) => c.id));

export function getModuleLabel(id: string): string {
  for (const group of MODULE_CATALOG) {
    const child = group.children.find((c) => c.id === id);
    if (child) return child.label;
    if (group.id === id) return group.label;
  }
  return humanizeModuleId(id);
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
  POS: 'Hızlı satış',
  TMS: 'Lojistik',
  B2B: 'B2B portal',
  MARKETPLACE: 'Pazaryeri',
  MULTI_BRANCH: 'Çoklu şube',
  DEALER: 'Bayi paneli',
  HR: 'İnsan kaynakları',
  CRM: 'Müşteri ilişkileri',
  AI: 'Yapay zeka',
  B2C: 'B2C e-ticaret',
};

function humanizeModuleId(id: string): string {
  if (!id.includes('.')) {
    return GROUP_TR[id] ?? id.replace(/_/g, ' ').toLowerCase();
  }
  const [group, part] = id.split('.');
  const partLabel = MODULE_PART_TR[part];
  if (partLabel) return partLabel;
  const groupLabel = GROUP_TR[group];
  if (groupLabel) return groupLabel;
  return id.replace(/_/g, ' ').toLowerCase();
}

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

export function hasModuleAccess(userModules: string[], moduleId?: string): boolean {
  if (!moduleId) return true;
  const expanded = expandLegacyModules(userModules);
  if (expanded.includes(moduleId)) return true;
  const parent = moduleId.split('.')[0];
  if (expanded.includes(parent)) return true;
  return expanded.some((m) => m.startsWith(parent + '.'));
}
