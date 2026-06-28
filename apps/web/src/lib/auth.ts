export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  tenantId: string;
  tenantCode?: string;
  tenantType: 'SUPERADMIN' | 'DEALER' | 'BUSINESS' | 'BRANCH';
  tenantName: string;
  tenantPlan: string;
  modules: string[];
  panel?: 'nexusadmin' | 'bayi' | 'isletme';
  homeRoute?: string;
  avatarUrl?: string;
  subscriptionEndDate?: string;
  parentSubscriptionEndDate?: string;
  preferences?: any;
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setSession(data: { user: AuthUser; accessToken: string; refreshToken: string }) {
  localStorage.setItem('user', JSON.stringify(data.user));
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  if (data.user.panel) localStorage.setItem('panel', data.user.panel);
}

export function setUser(user: AuthUser) {
  localStorage.setItem('user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('user');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('panel');
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('smartnexus_pos_terminal_session');
  }
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('accessToken');
}

export { getDefaultHomeRoute, canManageUsers } from './role-permissions';
