export function safeNum(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function fmtMoney(value: unknown, currency = 'TRY'): string {
  const n = safeNum(value);
  const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₺';
  return sym + n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function fmtNum(value: unknown): string {
  return safeNum(value).toLocaleString('tr-TR');
}

export function fmtPct(value: unknown, digits = 1): string {
  return safeNum(value).toFixed(digits);
}

export function fmtPercentChange(current: unknown, previous: unknown): string {
  const c = safeNum(current);
  const p = safeNum(previous);
  if (p === 0) return c > 0 ? '+100' : '0';
  return (((c - p) / p) * 100).toFixed(1);
}
