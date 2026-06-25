/** Türkiye cep telefonu normalizasyonu (istemci). */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = input.replace(/\D/g, '');
  if (!digits) return null;
  let n = digits;
  if (n.startsWith('90') && n.length >= 12) n = n.slice(2);
  if (n.startsWith('0') && n.length === 11) n = n.slice(1);
  if (n.length !== 10 || !n.startsWith('5')) return null;
  return n;
}

export const PHONE_REQUIRED_ROLES = new Set([
  'ADMIN',
  'STAFF',
  'ACCOUNTANT',
  'CASHIER',
  'WAREHOUSE',
  'DRIVER',
]);

export function formatPhoneDisplay(phone: string | null | undefined): string {
  const n = normalizePhone(phone);
  if (!n) return phone?.trim() || '—';
  return `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6, 8)} ${n.slice(8)}`;
}
