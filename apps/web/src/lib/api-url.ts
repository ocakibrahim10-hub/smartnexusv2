const PRODUCTION_API = 'https://smartnexus-api.onrender.com/api';

/** Canlı Vercel'de env eksikse bile doğru API'ye bağlan */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return PRODUCTION_API;
    }
  }

  if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') {
    return PRODUCTION_API;
  }

  return 'http://localhost:3001/api';
}
