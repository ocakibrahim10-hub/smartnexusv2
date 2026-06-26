import { authApi, platformApi } from './api';
import { setSession } from './auth';

export async function refreshSessionFromApi() {
  const profile = await authApi.me();
  setSession({
    user: profile,
    accessToken: localStorage.getItem('accessToken') || '',
    refreshToken: localStorage.getItem('refreshToken') || '',
  });
  return profile;
}

/** PayTR dönüşü veya demo ödeme sonrası lisansı aktifleştirip oturumu günceller */
export async function finalizeSubscriptionPayment(tenantId?: string) {
  try {
    await platformApi.confirmPendingSubscription(tenantId);
  } catch {
    // Ödeme zaten onaylanmış olabilir
  }
  return refreshSessionFromApi();
}
