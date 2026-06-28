/** Eski service worker ve bozuk önbelleği temizler (giriş sayfası çöküşlerini önler) */
export async function resetStaleClientState() {
  if (typeof window === 'undefined') return;

  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    // Sessizce devam et
  }
}

export function isPublicAuthPath(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/kayit' ||
    pathname === '/fiyatlandirma' ||
    pathname === '/login' ||
    pathname === '/nexusadmin' ||
    pathname === '/bayi' ||
    pathname === '/isletme' ||
    pathname.startsWith('/portal/')
  );
}
