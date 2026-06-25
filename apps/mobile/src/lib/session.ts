import AsyncStorage from '@react-native-async-storage/async-storage';

export type PanelType = 'nexusadmin' | 'bayi' | 'isletme';

export interface SessionUser {
  id: string;
  email?: string;
  name: string;
  role: string;
  panel?: PanelType;
  homeRoute?: string;
  tenantName?: string;
  modules?: string[];
}

const KEYS = {
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
  user: 'user',
  panel: 'panel',
} as const;

export async function saveSession(data: {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}) {
  const panel = data.user.panel || 'isletme';
  await AsyncStorage.multiSet([
    [KEYS.accessToken, data.accessToken],
    [KEYS.refreshToken, data.refreshToken],
    [KEYS.user, JSON.stringify(data.user)],
    [KEYS.panel, panel],
  ]);
}

export async function clearSession() {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}

export async function getAccessToken() {
  return AsyncStorage.getItem(KEYS.accessToken);
}

export async function getSession() {
  const [[, accessToken], [, refreshToken], [, userRaw], [, panel]] = await AsyncStorage.multiGet(
    Object.values(KEYS),
  );
  if (!accessToken || !userRaw) return null;
  try {
    const user = JSON.parse(userRaw) as SessionUser;
    return {
      accessToken,
      refreshToken: refreshToken || '',
      user,
      panel: (panel as PanelType) || user.panel || 'isletme',
    };
  } catch {
    return null;
  }
}

export function buildWebSessionScript(
  user: SessionUser,
  accessToken: string,
  refreshToken: string,
  panel: PanelType,
  webUrl: string,
) {
  const home = user.homeRoute || '/dashboard';
  const target = `${webUrl}/${panel}${home.startsWith('/') ? home : `/${home}`}`;
  const payload = JSON.stringify({
    user,
    accessToken,
    refreshToken,
    panel,
  });
  return `
    (function() {
      try {
        var s = ${payload};
        localStorage.setItem('user', JSON.stringify(s.user));
        localStorage.setItem('accessToken', s.accessToken);
        localStorage.setItem('refreshToken', s.refreshToken);
        localStorage.setItem('panel', s.panel);
        if (!window.location.href.includes('${panel}')) {
          window.location.replace('${target}');
        }
      } catch (e) {
        console.error('SmartNexus session inject failed', e);
      }
    })();
    true;
  `;
}
