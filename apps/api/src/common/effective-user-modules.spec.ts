import { getEffectiveUserModules } from './effective-user-modules';

describe('effective-user-modules', () => {
  const tenant = {
    type: 'BUSINESS',
    subscription: { modules: ['ACCOUNTING.INVOICES', 'POS.MAIN', 'TMS.SHIPMENTS'] },
  };

  it('OWNER kiracının tüm modüllerini alır', () => {
    const modules = getEffectiveUserModules(tenant, { role: 'OWNER', permissions: [] });
    expect(modules).toEqual(
      expect.arrayContaining(['ACCOUNTING.INVOICES', 'POS.MAIN', 'TMS.SHIPMENTS']),
    );
  });

  it('DRIVER sadece TMS modülünü alır', () => {
    const modules = getEffectiveUserModules(tenant, { role: 'DRIVER', permissions: [] });
    expect(modules).toEqual(['TMS.SHIPMENTS']);
  });

  it('özel permissions rol şablonunu geçersiz kılar', () => {
    const modules = getEffectiveUserModules(tenant, {
      role: 'DRIVER',
      permissions: ['POS.MAIN'],
    });
    expect(modules).toEqual(['POS.MAIN']);
  });
});
