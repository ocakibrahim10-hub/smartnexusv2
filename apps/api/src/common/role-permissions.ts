import { expandLegacyModules } from './module-catalog';

export type RoleTemplate = {
  id: string;
  label: string;
  description: string;
  defaultModules: string[];
};

export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    id: 'OWNER',
    label: 'Sahip',
    description: 'Tüm modüller ve kullanıcı yönetimi',
    defaultModules: ['*'],
  },
  {
    id: 'ADMIN',
    label: 'Yönetici',
    description: 'Tüm modüller ve personel yönetimi',
    defaultModules: ['*'],
  },
  {
    id: 'ACCOUNTANT',
    label: 'Muhasebeci',
    description: 'Fatura, cari, kasa ve muhasebe raporları',
    defaultModules: [
      'ACCOUNTING.INVOICES',
      'ACCOUNTING.CONTACTS',
      'ACCOUNTING.CASH',
      'ACCOUNTING.EDOCUMENT',
      'ACCOUNTING.REPORTS',
    ],
  },
  {
    id: 'CASHIER',
    label: 'Kasiyer',
    description: 'POS satış ekranı ve temel cari',
    defaultModules: ['POS.MAIN', 'ACCOUNTING.CONTACTS', 'ACCOUNTING.INVOICES'],
  },
  {
    id: 'WAREHOUSE',
    label: 'Depo Sorumlusu',
    description: 'Stok, depo ve transfer işlemleri',
    defaultModules: [
      'INVENTORY.PRODUCTS',
      'INVENTORY.WAREHOUSES',
      'INVENTORY.MOVEMENTS',
      'INVENTORY.TRANSFERS',
    ],
  },
  {
    id: 'DRIVER',
    label: 'Şoför',
    description: 'Sevkiyat takibi ve teslimat durumu',
    defaultModules: ['TMS.SHIPMENTS'],
  },
  {
    id: 'STAFF',
    label: 'Personel',
    description: 'Genel işlem yetkileri',
    defaultModules: ['ACCOUNTING.INVOICES', 'INVENTORY.PRODUCTS', 'B2B.ORDERS'],
  },
];

export const USER_MANAGEMENT_ROLES = ['OWNER', 'ADMIN'] as const;

export function canManageUsers(role: string): boolean {
  return USER_MANAGEMENT_ROLES.includes(role as (typeof USER_MANAGEMENT_ROLES)[number]);
}

export function getRoleTemplate(role: string): RoleTemplate | undefined {
  return ROLE_TEMPLATES.find((r) => r.id === role);
}

export function getDefaultModulesForRole(role: string): string[] {
  return getRoleTemplate(role)?.defaultModules ?? getRoleTemplate('STAFF')!.defaultModules;
}

/** Rol şablonu veya özel izinleri kiracı modülleriyle kesiştir. */
export function resolveUserModulePermissions(
  role: string,
  customPermissions: string[] | null | undefined,
  tenantModules: string[],
): string[] {
  const tenantExpanded = expandLegacyModules(tenantModules);
  const tenantSet = new Set(tenantExpanded);

  if (role === 'OWNER' || role === 'ADMIN') {
    return [...new Set(tenantExpanded)];
  }

  const source =
    customPermissions && customPermissions.length > 0
      ? customPermissions
      : getDefaultModulesForRole(role);

  const resolved = new Set<string>();
  for (const perm of expandLegacyModules(source)) {
    if (perm === '*') {
      tenantExpanded.forEach((m) => resolved.add(m));
      continue;
    }
    if (perm.endsWith('.*')) {
      const prefix = perm.slice(0, -2);
      tenantExpanded.forEach((m) => {
        if (m.startsWith(`${prefix}.`) || m === prefix) resolved.add(m);
      });
      continue;
    }
    if (tenantSet.has(perm)) resolved.add(perm);
  }

  return [...resolved];
}

export function getDefaultHomeRoute(role: string, modules: string[]): string {
  if (role === 'DRIVER' && modules.some((m) => m.startsWith('TMS.'))) return '/tms/shipments';
  if (role === 'CASHIER' && modules.includes('POS.MAIN')) return '/pos';
  if (role === 'WAREHOUSE' && modules.includes('INVENTORY.MOVEMENTS'))
    return '/inventory/movements';
  if (role === 'ACCOUNTANT' && modules.includes('ACCOUNTING.INVOICES'))
    return '/accounting/invoices';
  return '/dashboard';
}
