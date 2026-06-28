import type { PanelType } from './panel';
import { getUser } from './auth';

/** Kısayol/menü href'ini panel önekli tam yola çevirir */
export function normalizePanelHref(href: string, panel?: PanelType): string {
  const p =
    panel ||
    (getUser()?.panel as PanelType | undefined) ||
    (typeof window !== 'undefined' ? (localStorage.getItem('panel') as PanelType) : undefined) ||
    'isletme';

  if (!href) return `/${p}/dashboard`;
  if (/^https?:\/\//i.test(href)) return href;
  if (/^\/(nexusadmin|bayi|isletme)(\/|$)/.test(href)) return href;
  const path = href.startsWith('/') ? href : `/${href}`;
  return `/${p}${path}`;
}

/** Panel içi gezinme — client router takılsa bile çalışır */
export function panelNavigate(href: string, panel?: PanelType) {
  if (typeof window === 'undefined') return;
  window.location.assign(normalizePanelHref(href, panel));
}
