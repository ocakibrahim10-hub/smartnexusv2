export type RoleTemplate = {
  id: string;
  label: string;
  description: string;
  defaultModules: string[];
};

export const ROLE_CFG: Record<
  string,
  { label: string; color: string; bg: string; description?: string }
> = {
  OWNER: {
    label: 'Sahip',
    color: 'text-yellow-600',
    bg: 'bg-yellow-500/20',
    description: 'Tüm modüller',
  },
  ADMIN: {
    label: 'Yönetici',
    color: 'text-indigo-600',
    bg: 'bg-indigo-500/20',
    description: 'Tüm modüller + personel',
  },
  ACCOUNTANT: { label: 'Muhasebeci', color: 'text-emerald-600', bg: 'bg-emerald-500/20' },
  CASHIER: { label: 'Kasiyer', color: 'text-violet-600', bg: 'bg-violet-500/20' },
  WAREHOUSE: { label: 'Depo', color: 'text-orange-600', bg: 'bg-orange-500/20' },
  DRIVER: { label: 'Şoför', color: 'text-sky-600', bg: 'bg-sky-500/20' },
  STAFF: { label: 'Personel', color: 'text-blue-600', bg: 'bg-blue-500/20' },
};

export function canManageUsers(role: string): boolean {
  return role === 'OWNER' || role === 'ADMIN';
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
