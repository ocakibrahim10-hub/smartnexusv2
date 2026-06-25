import {
  canManageUsers,
  getDefaultHomeRoute,
  resolveUserModulePermissions,
} from './role-permissions';

describe('role-permissions', () => {
  const tenantModules = ['ACCOUNTING.INVOICES', 'POS.MAIN', 'TMS.SHIPMENTS', 'DEALER.USERS'];

  it('OWNER tüm kiracı modüllerine erişir', () => {
    const modules = resolveUserModulePermissions('OWNER', [], tenantModules);
    expect(modules).toEqual(expect.arrayContaining(tenantModules));
  });

  it('CASHIER varsayılan modülleri alır', () => {
    const modules = resolveUserModulePermissions('CASHIER', [], tenantModules);
    expect(modules).toContain('POS.MAIN');
    expect(modules).not.toContain('TMS.SHIPMENTS');
  });

  it('özel permissions rol şablonunu geçersiz kılar', () => {
    const modules = resolveUserModulePermissions('CASHIER', ['TMS.SHIPMENTS'], tenantModules);
    expect(modules).toEqual(['TMS.SHIPMENTS']);
  });

  it('canManageUsers sadece OWNER ve ADMIN için true', () => {
    expect(canManageUsers('OWNER')).toBe(true);
    expect(canManageUsers('ADMIN')).toBe(true);
    expect(canManageUsers('CASHIER')).toBe(false);
  });

  it('getDefaultHomeRoute role göre yönlendirme döner', () => {
    expect(getDefaultHomeRoute('DRIVER', ['TMS.SHIPMENTS'])).toBe('/tms/shipments');
    expect(getDefaultHomeRoute('CASHIER', ['POS.MAIN'])).toBe('/pos');
    expect(getDefaultHomeRoute('STAFF', ['ACCOUNTING.INVOICES'])).toBe('/dashboard');
  });
});
