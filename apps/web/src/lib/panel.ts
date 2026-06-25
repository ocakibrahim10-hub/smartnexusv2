export type PanelType = 'nexusadmin' | 'bayi' | 'isletme';

export const PANELS: PanelType[] = ['nexusadmin', 'bayi', 'isletme'];

export function isPanelType(value: string): value is PanelType {
  return PANELS.includes(value as PanelType);
}

export function stripPanelPrefix(pathname: string): string {
  const m = pathname.match(/^\/(nexusadmin|bayi|isletme)(\/.*)?$/);
  if (!m) return pathname;
  return m[2] || '/dashboard';
}

export function withPanel(panel: PanelType, path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (clean.match(/^\/(nexusadmin|bayi|isletme)\//)) return clean;
  return `/${panel}${clean === '/' ? '/dashboard' : clean}`;
}

export function panelLoginPath(panel: PanelType): string {
  return `/${panel}`;
}

export function panelLabel(panel: PanelType): string {
  if (panel === 'nexusadmin') return 'Nexus Admin';
  if (panel === 'bayi') return 'Bayi Paneli';
  return 'İşletme Paneli';
}

export function inferPanelFromTenantType(tenantType: string): PanelType {
  if (tenantType === 'SUPERADMIN') return 'nexusadmin';
  if (tenantType === 'DEALER') return 'bayi';
  return 'isletme';
}
