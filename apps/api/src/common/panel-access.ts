import { ForbiddenException } from '@nestjs/common';
import { TenantType } from '@prisma/client';
import { getDefaultHomeRoute } from './role-permissions';

export type PanelType = 'nexusadmin' | 'bayi' | 'isletme';

export function inferPanel(tenantType: TenantType): PanelType {
  if (tenantType === TenantType.SUPERADMIN) return 'nexusadmin';
  if (tenantType === TenantType.DEALER) return 'bayi';
  return 'isletme';
}

export function validatePanelAccess(
  tenantType: TenantType,
  role: string,
  panel: PanelType,
): void {
  if (panel === 'nexusadmin' && tenantType !== TenantType.SUPERADMIN) {
    throw new ForbiddenException('Bu giriş yalnızca platform yöneticileri içindir');
  }
  if (panel === 'bayi' && tenantType !== TenantType.DEALER) {
    throw new ForbiddenException('Bu giriş yalnızca bayiler içindir');
  }
  if (panel === 'isletme') {
    if (tenantType !== TenantType.BUSINESS && tenantType !== TenantType.BRANCH) {
      throw new ForbiddenException('Bu giriş yalnızca işletme personeli içindir');
    }
  }
}

export function getPanelHomeRoute(
  role: string,
  modules: string[],
  panel: PanelType,
): string {
  const base = getDefaultHomeRoute(role, modules);
  if (panel === 'nexusadmin') {
    if (base === '/dashboard') return '/nexusadmin/dashboard';
    return `/nexusadmin${base}`;
  }
  if (panel === 'bayi') {
    if (base === '/dashboard') return '/bayi/dashboard';
    return `/bayi${base}`;
  }
  if (base === '/dashboard') return '/isletme/dashboard';
  return `/isletme${base}`;
}

export function stripPanelPrefix(pathname: string): string {
  const m = pathname.match(/^\/(nexusadmin|bayi|isletme)(\/.*)?$/);
  if (!m) return pathname;
  return m[2] || '/dashboard';
}

export function panelLoginPath(panel: PanelType): string {
  return `/${panel}`;
}

export function panelLogoutPath(panel: PanelType): string {
  return `/${panel}`;
}
